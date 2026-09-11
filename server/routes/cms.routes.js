import express from 'express';
import { query, queryOne, withTransaction } from '../db.js';
import { requireRole } from '../auth.js';
import { logAuditEvent } from './auth.routes.js';

export const cmsRouter = express.Router();

// Server-authoritative enum for the B7 cms_projects.media_type column, used
// by the admin Video Library filters (ALL/REELS/SHORTS/LONG FORM/FEATURED).
const VALID_CMS_MEDIA_TYPES = new Set(['Reel', 'Short', 'LongForm', 'Commercial', 'Documentary', 'Other']);

function formatProject(row) {
  if (!row) return null;
  const playback = row.playback_url || row.video_url;
  return {
    id: row.id,
    title: row.title,
    client: row.client,
    format: row.format,
    runtime: row.runtime,
    category: row.category,
    description: row.description,
    thumbnail: row.thumbnail_url,
    videoUrl: playback,
    socialProvider: row.social_provider || 'none',
    socialUrl: row.social_url || '',
    playbackUrl: playback,
    aspectRatio: row.aspect_ratio || '16:9',
    mediaType: row.media_type || null,
    tags: row.tags || [],
    isFeatured: Boolean(row.is_featured),
    featuredSlot: row.featured_slot,
    isPublished: Boolean(row.is_published),
    technicalBreakdown: {
      camera: row.camera,
      colorGrade: row.color_grade,
      audioMix: row.audio_mix,
      pacing: row.pacing
    },
    createdAt: row.created_at
  };
}

// 1. Public Published Portfolio
cmsRouter.get('/portfolio', async (req, res) => {
  const { rows } = await query(`
    SELECT * FROM cms_projects
    WHERE is_published = 1
    ORDER BY created_at DESC
  `);
  res.json({ portfolio: rows.map(formatProject) });
});

// 2. Public Featured Work (Exact 3 Slots)
cmsRouter.get('/featured', async (req, res) => {
  const { rows } = await query(`
    SELECT * FROM cms_projects
    WHERE is_published = 1 AND is_featured = 1
    ORDER BY featured_slot ASC
  `);
  res.json({ featured: rows.map(formatProject) });
});

// 3. Public Social Proof (Instagram)
cmsRouter.get('/social', async (req, res) => {
  const { rows } = await query(`
    SELECT id, platform, url, title, caption, thumbnail_url as thumbnail, likes, is_published AS "isPublished"
    FROM cms_social
    WHERE is_published = 1
    ORDER BY created_at DESC
  `);
  res.json({ social: rows.map(r => ({ ...r, isPublished: Boolean(r.isPublished) })) });
});

// 4. Admin Portfolio Full Registry (Includes Drafts)
cmsRouter.get('/admin/portfolio', requireRole('admin'), async (req, res) => {
  const { rows } = await query('SELECT * FROM cms_projects ORDER BY created_at DESC');
  res.json({ portfolio: rows.map(formatProject) });
});

// 5. Admin Create Portfolio Project
cmsRouter.post('/portfolio', requireRole('admin'), async (req, res) => {
  const {
    title, client, format, runtime, category, description,
    thumbnail, videoUrl, socialProvider = 'none', socialUrl = '', playbackUrl = '', aspectRatio = '16:9',
    camera, colorGrade, audioMix, pacing,
    isFeatured = false, featuredSlot = null, isPublished = true,
    mediaType = null, tags = []
  } = req.body;

  const activePlayback = playbackUrl || videoUrl;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  if (mediaType !== null && !VALID_CMS_MEDIA_TYPES.has(mediaType)) {
    return res.status(400).json({ error: `Invalid mediaType. Must be one of: ${[...VALID_CMS_MEDIA_TYPES].join(', ')}` });
  }
  if (!Array.isArray(tags) || !tags.every((t) => typeof t === 'string')) {
    return res.status(400).json({ error: 'tags must be an array of strings' });
  }

  const id = `WORK-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  await query(
    `INSERT INTO cms_projects (
      id, title, client, format, runtime, category, description,
      thumbnail_url, video_url, social_provider, social_url, playback_url, aspect_ratio,
      camera, color_grade, audio_mix, pacing,
      is_featured, featured_slot, is_published, created_at, media_type, tags
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
    [
      id, title, client || 'TRIPHORIA Client', format || '4K UHD', runtime || '01:30',
      category || 'Commercial & Brand', description || '',
      thumbnail || '', activePlayback || '', socialProvider, socialUrl, activePlayback, aspectRatio,
      camera || '', colorGrade || '', audioMix || '', pacing || '',
      isFeatured ? 1 : 0, featuredSlot || null, isPublished ? 1 : 0, now, mediaType, tags
    ]
  );

  await logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'CMS_PROJECT_CREATED',
    entityType: 'CMS',
    entityId: id,
    details: `Created portfolio project "${title}" (${category}).`
  });

  const created = await queryOne('SELECT * FROM cms_projects WHERE id = $1', [id]);
  res.status(201).json({ success: true, project: formatProject(created) });
});

// 6. Admin Update Portfolio Project
cmsRouter.put('/portfolio/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const {
    title, client, format, runtime, category, description,
    thumbnail, videoUrl, socialProvider, socialUrl, playbackUrl, aspectRatio,
    camera, colorGrade, audioMix, pacing,
    isFeatured, featuredSlot, isPublished,
    mediaType, tags
  } = req.body;

  const activePlayback = playbackUrl || videoUrl;

  if (mediaType !== undefined && mediaType !== null && !VALID_CMS_MEDIA_TYPES.has(mediaType)) {
    return res.status(400).json({ error: `Invalid mediaType. Must be one of: ${[...VALID_CMS_MEDIA_TYPES].join(', ')}` });
  }
  if (tags !== undefined && (!Array.isArray(tags) || !tags.every((t) => typeof t === 'string'))) {
    return res.status(400).json({ error: 'tags must be an array of strings' });
  }

  await query(
    `UPDATE cms_projects SET
      title = coalesce($1, title),
      client = coalesce($2, client),
      format = coalesce($3, format),
      runtime = coalesce($4, runtime),
      category = coalesce($5, category),
      description = coalesce($6, description),
      thumbnail_url = coalesce($7, thumbnail_url),
      video_url = coalesce($8, video_url),
      social_provider = coalesce($9, social_provider),
      social_url = coalesce($10, social_url),
      playback_url = coalesce($11, playback_url),
      aspect_ratio = coalesce($12, aspect_ratio),
      camera = coalesce($13, camera),
      color_grade = coalesce($14, color_grade),
      audio_mix = coalesce($15, audio_mix),
      pacing = coalesce($16, pacing),
      is_featured = coalesce($17, is_featured),
      featured_slot = $18,
      is_published = coalesce($19, is_published),
      media_type = coalesce($20, media_type),
      tags = coalesce($21, tags)
    WHERE id = $22`,
    [
      title, client, format, runtime, category, description,
      thumbnail, activePlayback, socialProvider, socialUrl, activePlayback, aspectRatio,
      camera, colorGrade, audioMix, pacing,
      typeof isFeatured === 'boolean' ? (isFeatured ? 1 : 0) : null,
      featuredSlot !== undefined ? featuredSlot : null,
      typeof isPublished === 'boolean' ? (isPublished ? 1 : 0) : null,
      mediaType !== undefined ? mediaType : null,
      tags !== undefined ? tags : null,
      id
    ]
  );

  await logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'CMS_PROJECT_UPDATED',
    entityType: 'CMS',
    entityId: id,
    details: `Updated portfolio project ID ${id}.`
  });

  const updated = await queryOne('SELECT * FROM cms_projects WHERE id = $1', [id]);
  res.json({ success: true, project: formatProject(updated) });
});

// 7. Admin Delete Portfolio Project
cmsRouter.delete('/portfolio/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM cms_projects WHERE id = $1', [id]);

  await logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'CMS_PROJECT_DELETED',
    entityType: 'CMS',
    entityId: id,
    details: `Deleted portfolio project ID ${id}.`
  });

  res.json({ success: true, message: 'Project removed' });
});

// 8. Admin Atomic Featured Slots Update (Slots 1, 2, 3)
cmsRouter.post('/featured-slots', requireRole('admin'), async (req, res) => {
  const { slot1Id, slot2Id, slot3Id } = req.body;

  try {
    await withTransaction(async (client) => {
      // Reset current featured flags
      await client.query('UPDATE cms_projects SET is_featured = 0, featured_slot = NULL');

      if (slot1Id) {
        await client.query('UPDATE cms_projects SET is_featured = 1, featured_slot = 1 WHERE id = $1', [slot1Id]);
      }
      if (slot2Id) {
        await client.query('UPDATE cms_projects SET is_featured = 1, featured_slot = 2 WHERE id = $1', [slot2Id]);
      }
      if (slot3Id) {
        await client.query('UPDATE cms_projects SET is_featured = 1, featured_slot = 3 WHERE id = $1', [slot3Id]);
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update featured slots' });
  }

  await logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'FEATURED_SLOTS_UPDATED',
    entityType: 'CMS',
    entityId: 'featured_slots',
    details: `Super Admin assigned featured slots: Slot1=${slot1Id}, Slot2=${slot2Id}, Slot3=${slot3Id}.`
  });

  res.json({ success: true, message: 'Featured slots updated successfully' });
});

// 9. Admin Social Full Registry
cmsRouter.get('/admin/social', requireRole('admin'), async (req, res) => {
  const { rows } = await query('SELECT id, platform, url, title, caption, thumbnail_url as thumbnail, likes, is_published AS "isPublished" FROM cms_social ORDER BY created_at DESC');
  res.json({ social: rows.map(r => ({ ...r, isPublished: Boolean(r.isPublished) })) });
});

// 10. Admin Create Social Post
cmsRouter.post('/social', requireRole('admin'), async (req, res) => {
  const { platform, url, title, caption, thumbnail, likes, isPublished = true } = req.body;
  if (!url || !title) {
    return res.status(400).json({ error: 'URL and title are required' });
  }

  const id = `SOC-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  await query(
    `INSERT INTO cms_social (id, platform, url, title, caption, thumbnail_url, likes, is_published, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id, platform || 'Instagram Reel', url, title, caption || '',
      thumbnail || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d',
      likes || '1.2k', isPublished ? 1 : 0, now
    ]
  );

  await logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'CMS_SOCIAL_CREATED',
    entityType: 'CMS',
    entityId: id,
    details: `Added social proof post "${title}".`
  });

  res.status(201).json({ success: true, id });
});

// 11. Admin Delete Social Post
cmsRouter.delete('/social/:id', requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM cms_social WHERE id = $1', [id]);

  await logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'CMS_SOCIAL_DELETED',
    entityType: 'CMS',
    entityId: id,
    details: `Deleted social post ID ${id}.`
  });

  res.json({ success: true, message: 'Social post removed' });
});
