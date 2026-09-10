import express from 'express';
import { db } from '../db.js';
import { requireRole } from '../auth.js';
import { logAuditEvent } from './auth.routes.js';

export const cmsRouter = express.Router();

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
cmsRouter.get('/portfolio', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM cms_projects 
    WHERE is_published = 1 
    ORDER BY created_at DESC
  `).all();
  res.json({ portfolio: rows.map(formatProject) });
});

// 2. Public Featured Work (Exact 3 Slots)
cmsRouter.get('/featured', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM cms_projects 
    WHERE is_published = 1 AND is_featured = 1 
    ORDER BY featured_slot ASC
  `).all();
  res.json({ featured: rows.map(formatProject) });
});

// 3. Public Social Proof (Instagram)
cmsRouter.get('/social', (req, res) => {
  const rows = db.prepare(`
    SELECT id, platform, url, title, caption, thumbnail_url as thumbnail, likes, is_published as isPublished
    FROM cms_social 
    WHERE is_published = 1 
    ORDER BY created_at DESC
  `).all();
  res.json({ social: rows.map(r => ({ ...r, isPublished: Boolean(r.isPublished) })) });
});

// 4. Admin Portfolio Full Registry (Includes Drafts)
cmsRouter.get('/admin/portfolio', requireRole('admin'), (req, res) => {
  const rows = db.prepare('SELECT * FROM cms_projects ORDER BY created_at DESC').all();
  res.json({ portfolio: rows.map(formatProject) });
});

// 5. Admin Create Portfolio Project
cmsRouter.post('/portfolio', requireRole('admin'), (req, res) => {
  const {
    title, client, format, runtime, category, description,
    thumbnail, videoUrl, socialProvider = 'none', socialUrl = '', playbackUrl = '', aspectRatio = '16:9',
    camera, colorGrade, audioMix, pacing,
    isFeatured = false, featuredSlot = null, isPublished = true
  } = req.body;

  const activePlayback = playbackUrl || videoUrl;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const id = `WORK-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO cms_projects (
      id, title, client, format, runtime, category, description,
      thumbnail_url, video_url, social_provider, social_url, playback_url, aspect_ratio,
      camera, color_grade, audio_mix, pacing,
      is_featured, featured_slot, is_published, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, title, client || 'TRIPHORIA Client', format || '4K UHD', runtime || '01:30',
    category || 'Commercial & Brand', description || '',
    thumbnail || '', activePlayback || '', socialProvider, socialUrl, activePlayback, aspectRatio,
    camera || '', colorGrade || '', audioMix || '', pacing || '',
    isFeatured ? 1 : 0, featuredSlot || null, isPublished ? 1 : 0, now
  );

  logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'CMS_PROJECT_CREATED',
    entityType: 'CMS',
    entityId: id,
    details: `Created portfolio project "${title}" (${category}).`
  });

  const created = db.prepare('SELECT * FROM cms_projects WHERE id = ?').get(id);
  res.status(201).json({ success: true, project: formatProject(created) });
});

// 6. Admin Update Portfolio Project
cmsRouter.put('/portfolio/:id', requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const {
    title, client, format, runtime, category, description,
    thumbnail, videoUrl, socialProvider, socialUrl, playbackUrl, aspectRatio,
    camera, colorGrade, audioMix, pacing,
    isFeatured, featuredSlot, isPublished
  } = req.body;

  const activePlayback = playbackUrl || videoUrl;

  db.prepare(`
    UPDATE cms_projects SET
      title = coalesce(?, title),
      client = coalesce(?, client),
      format = coalesce(?, format),
      runtime = coalesce(?, runtime),
      category = coalesce(?, category),
      description = coalesce(?, description),
      thumbnail_url = coalesce(?, thumbnail_url),
      video_url = coalesce(?, video_url),
      social_provider = coalesce(?, social_provider),
      social_url = coalesce(?, social_url),
      playback_url = coalesce(?, playback_url),
      aspect_ratio = coalesce(?, aspect_ratio),
      camera = coalesce(?, camera),
      color_grade = coalesce(?, color_grade),
      audio_mix = coalesce(?, audio_mix),
      pacing = coalesce(?, pacing),
      is_featured = coalesce(?, is_featured),
      featured_slot = ?,
      is_published = coalesce(?, is_published)
    WHERE id = ?
  `).run(
    title, client, format, runtime, category, description,
    thumbnail, activePlayback, socialProvider, socialUrl, activePlayback, aspectRatio,
    camera, colorGrade, audioMix, pacing,
    typeof isFeatured === 'boolean' ? (isFeatured ? 1 : 0) : null,
    featuredSlot !== undefined ? featuredSlot : null,
    typeof isPublished === 'boolean' ? (isPublished ? 1 : 0) : null,
    id
  );

  logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'CMS_PROJECT_UPDATED',
    entityType: 'CMS',
    entityId: id,
    details: `Updated portfolio project ID ${id}.`
  });

  const updated = db.prepare('SELECT * FROM cms_projects WHERE id = ?').get(id);
  res.json({ success: true, project: formatProject(updated) });
});

// 7. Admin Delete Portfolio Project
cmsRouter.delete('/portfolio/:id', requireRole('admin'), (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM cms_projects WHERE id = ?').run(id);

  logAuditEvent({
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
cmsRouter.post('/featured-slots', requireRole('admin'), (req, res) => {
  const { slot1Id, slot2Id, slot3Id } = req.body;

  try {
    db.exec('BEGIN TRANSACTION;');

    // Reset current featured flags
    db.prepare('UPDATE cms_projects SET is_featured = 0, featured_slot = NULL').run();

    if (slot1Id) {
      db.prepare('UPDATE cms_projects SET is_featured = 1, featured_slot = 1 WHERE id = ?').run(slot1Id);
    }
    if (slot2Id) {
      db.prepare('UPDATE cms_projects SET is_featured = 1, featured_slot = 2 WHERE id = ?').run(slot2Id);
    }
    if (slot3Id) {
      db.prepare('UPDATE cms_projects SET is_featured = 1, featured_slot = 3 WHERE id = ?').run(slot3Id);
    }

    db.exec('COMMIT;');

    logAuditEvent({
      actorId: req.user.id,
      actorRole: 'admin',
      action: 'FEATURED_SLOTS_UPDATED',
      entityType: 'CMS',
      entityId: 'featured_slots',
      details: `Super Admin assigned featured slots: Slot1=${slot1Id}, Slot2=${slot2Id}, Slot3=${slot3Id}.`
    });

    res.json({ success: true, message: 'Featured slots updated successfully' });
  } catch (err) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'Failed to update featured slots' });
  }
});

// 9. Admin Social Full Registry
cmsRouter.get('/admin/social', requireRole('admin'), (req, res) => {
  const rows = db.prepare('SELECT id, platform, url, title, caption, thumbnail_url as thumbnail, likes, is_published as isPublished FROM cms_social ORDER BY created_at DESC').all();
  res.json({ social: rows.map(r => ({ ...r, isPublished: Boolean(r.isPublished) })) });
});

// 10. Admin Create Social Post
cmsRouter.post('/social', requireRole('admin'), (req, res) => {
  const { platform, url, title, caption, thumbnail, likes, isPublished = true } = req.body;
  if (!url || !title) {
    return res.status(400).json({ error: 'URL and title are required' });
  }

  const id = `SOC-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO cms_social (id, platform, url, title, caption, thumbnail_url, likes, is_published, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, platform || 'Instagram Reel', url, title, caption || '',
    thumbnail || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d',
    likes || '1.2k', isPublished ? 1 : 0, now
  );

  logAuditEvent({
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
cmsRouter.delete('/social/:id', requireRole('admin'), (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM cms_social WHERE id = ?').run(id);

  logAuditEvent({
    actorId: req.user.id,
    actorRole: 'admin',
    action: 'CMS_SOCIAL_DELETED',
    entityType: 'CMS',
    entityId: id,
    details: `Deleted social post ID ${id}.`
  });

  res.json({ success: true, message: 'Social post removed' });
});
