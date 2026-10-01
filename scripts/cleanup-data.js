/**
 * scripts/cleanup-data.js
 * -----------------------------------------------------------------------
 * Removes test/dummy data from the Supabase Postgres database. Run after
 * resetting the database or after exploit/load testing that injected
 * placeholder rows.
 *
 * What it removes:
 *  - CMS projects with invalid / placeholder media (no valid playback URL)
 *    e.g. the "Proj tzx6hj" row that had drive.google.com/v (not a real
 *    Drive share URL).
 *  - Any output_versions, order_files, storage_lifecycle rows that belong
 *    to orders injected during load / security testing.
 *  - Audit events that reference those test entities (kept separate so the
 *    trust ledger isn't polluted by test runs).
 *
 * What it KEEPS:
 *  - The seeded admin + editors + customers + their seeded orders +
 *    seeded CMS portfolio + seeded social posts (the "real" demo fixtures
 *    that come from src/data/initialData.js).
 *
 * Usage:
 *   node scripts/cleanup-data.js
 *
 * Requires: DATABASE_URL in .env (or environment).
 */

import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isValidPlaybackUrl = (url = '') => {
  if (!url || typeof url !== 'string') return false;

  const s = url.trim();

  // YouTube
  const ytRe = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/i;
  if (ytRe.test(s)) return true;

  // Vimeo
  const vimRe = /^(https?:\/\/)?(www\.)?(vimeo\.com\/video\/|player\.vimeo\.com\/video\/)\d+/i;
  if (vimRe.test(s)) return true;

  // Instagram post / reel / story / embed
  if (/instagram\.com\/(p|reel|reels|stories|embed)\//i.test(s)) return true;

  // Google Drive file share (file/d/<id>/..., open?id=<id>, uc?id=<id>)
  const driveRe = /^https?:\/\/drive\.google\.com\/(?:file\/d\/[a-zA-Z0-9_-]+|open\?id=[a-zA-Z0-9_-]+|uc\?id=[a-zA-Z0-9_-]+)/i;
  if (driveRe.test(s)) return true;

  // Direct video file (mp4, webm, mov, m4v, mkv) — either a hostname or a path
  const extRe = /\.(mp4|webm|mov|m4v|mkv)(\?.*)?$/i;
  const hostRe = /commondatastorage\.googleapis\.com|storage\.googleapis\.com|supabase\.co|cloudinary\.com|img\.bid|ixircdn\.com/i;
  const isDirectExt = extRe.test(s);
  const isStorageHost = hostRe.test(s) && (s.includes('http') || s.startsWith('/') || s.startsWith('storage'));
  if (isDirectExt || isStorageHost) return true;

  return false;
};

function log(msg) {
  // quiet by default; pass --verbose to see everything
  if (process.argv.includes('--verbose')) console.log('[cleanup]', msg);
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Aborting.');
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 10_000 });

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  console.log('Connecting to Postgres...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Identify "bad" CMS projects — invalid or missing playback URL
    // pg client.query doesn't allow passing a JS function as a param, so we
    // fetch candidates and filter in JS.
    const { rows: candidates } = await client.query(
      `SELECT id, title, video_url, playback_url, thumbnail_url, is_featured, featured_slot, is_published
       FROM cms_projects
       WHERE (video_url IS NULL OR video_url = '')
          OR (playback_url IS NULL OR playback_url = '')
          OR video_url NOT LIKE 'https://drive.google.com/file/d/%'
          OR playback_url NOT LIKE 'https://drive.google.com/file/d/%'
       ORDER BY created_at DESC`
    );

    const badCmsIds = [];
    for (const c of candidates) {
      const vp = c.video_url || c.playback_url || '';
      // Keep only rows that have a genuinely playable URL. Everything else is
      // test/placeholder data.
      if (!isValidPlaybackUrl(vp)) {
        badCmsIds.push(c.id);
        console.log(`  [CMS] removing placeholder: "${c.title}" (id=${c.id}, video_url=${c.video_url || 'NULL'}, playback_url=${c.playback_url || 'NULL'})`);
      }
    }

    // Also catch rows whose URL is literally a malformed Drive path like
    // "https://drive.google.com/v" (the known bad row).
    for (const c of candidates) {
      if (badCmsIds.includes(c.id)) continue;
      const vp = c.video_url || c.playback_url || '';
      if (/drive\.google\.com\/[^/]/i.test(vp) && !/drive\.google\.com\/(file\/d|open\?id=|uc\?id=)/i.test(vp)) {
        badCmsIds.push(c.id);
        console.log(`  [CMS] removing malformed Drive URL: "${c.title}" (id=${c.id})`);
      }
    }

    if (badCmsIds.length > 0) {
      const placeholders = badCmsIds.map((_, i) => `$${i + 1}`).join(',');
      await client.query(
        `DELETE FROM cms_projects WHERE id IN (${placeholders})`,
        badCmsIds
      );
      console.log(`  [CMS] deleted ${badCmsIds.length} placeholder project(s).`);
    } else {
      console.log('  [CMS] no placeholder projects found.');
    }

    // 2. Identify test orders — those whose output versions reference a
    //    traversal-style storage_key (the exploit injected these).
    const { rows: suspectOrders } = await client.query(
      `SELECT DISTINCT o.id, o.project_name, o.status, o.created_at
       FROM orders o
       JOIN output_versions ov ON ov.order_id = o.id
       WHERE ov.storage_key LIKE '%..%'
          OR ov.storage_key LIKE '/../%'
          OR ov.storage_key LIKE '%\\.\\.%'
       ORDER BY o.created_at DESC`
    );

    const testOrderIds = suspectOrders.map((o) => o.id);

    // Also catch orders created during our own load/security tests — these
    // have titles/IDs that don't match the seeded fixtures. The seeded
    // orders are: TRIP-9011, TRIP-9012, TRIP-9013, TRIP-9014, TRIP-9015.
    const seededOrderIds = new Set(['TRIP-9011', 'TRIP-9012', 'TRIP-9013', 'TRIP-9014', 'TRIP-9015']);

    const { rows: allOrders } = await client.query(
      `SELECT id, project_name, status, created_at FROM orders ORDER BY created_at DESC`
    );

    for (const o of allOrders) {
      if (testOrderIds.includes(o.id)) continue; // already flagged
      if (seededOrderIds.has(o.id)) continue;    // keep seeded
      // Everything else was created after seeding (test / manual). Remove it.
      testOrderIds.push(o.id);
      console.log(`  [ORDERS] removing test order: "${o.project_name}" (id=${o.id}, status=${o.status})`);
    }

    if (testOrderIds.length > 0) {
      const ph = testOrderIds.map((_, i) => `$${i + 1}`).join(',');
      await client.query(`DELETE FROM output_versions WHERE order_id IN (${ph})`, testOrderIds);
      await client.query(`DELETE FROM order_files WHERE order_id IN (${ph})`, testOrderIds);
      await client.query(`DELETE FROM storage_lifecycle WHERE order_id IN (${ph})`, testOrderIds);
      await client.query(`DELETE FROM orders WHERE id IN (${ph})`, testOrderIds);
      console.log(`  [ORDERS] deleted ${testOrderIds.length} test order(s) and their children.`);
    } else {
      console.log('  [ORDERS] no test orders found.');
    }

    // 3. Clean orphaned audit events that only reference test entities.
    //    We keep all seeded audit events; remove any whose entity_id matches
    //    deleted test orders / projects.
    const allBadIds = [...badCmsIds, ...testOrderIds];
    if (allBadIds.length > 0) {
      const ph = allBadIds.map((_, i) => `$${i + 1}`).join(',');
      const { rows: orphaned } = await client.query(
        `SELECT id, action, entity_type, entity_id, details FROM audit_events
         WHERE entity_id IN (${ph})`,
        allBadIds
      );
      if (orphaned.length > 0) {
        const eph = orphaned.map((_, i) => `$${i + 1}`).join(',');
        await client.query(`DELETE FROM audit_events WHERE id IN (${eph})`, orphaned.map((r) => r.id));
        console.log(`  [AUDIT] removed ${orphaned.length} orphaned audit event(s).`);
      } else {
        console.log('  [AUDIT] no orphaned audit events.');
      }
    }

    await client.query('COMMIT');
    console.log('\nCleanup complete.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Cleanup failed, rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
