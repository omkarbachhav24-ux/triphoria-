import React from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Google Drive link helpers + a reusable clickable "open in Drive" anchor.
 *
 * TRIPHORIA delivers finished cuts as Google Drive links: the editor pastes a
 * Drive share link, and the client watches it in Drive itself. Everywhere a
 * delivery link is shown (editor, admin, client) it must be clickable and open
 * the file in a new tab.
 */

// True for any http(s) Google Drive URL (drive.google.com, docs.google.com,
// or a *.drive.google.com host). Mirrors the raw-footage validation.
export function isGoogleDriveUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(String(url).trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    return (
      h === 'drive.google.com' ||
      h === 'docs.google.com' ||
      h.endsWith('.drive.google.com')
    );
  } catch {
    return false;
  }
}

// A safe href for any recorded deliverable link. Google Drive links open
// directly; anything else is returned as-is (still opened in a new tab).
export function toWatchUrl(url) {
  return typeof url === 'string' ? url.trim() : '';
}

/**
 * DriveLink — a clickable anchor that opens a delivery/Drive link in a new tab.
 * Renders nothing when there is no url.
 */
export function DriveLink({ url, label = 'Open in Google Drive', className = '' }) {
  const href = toWatchUrl(url);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`u-focus inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--primary)] hover:underline ${className}`}
    >
      <ExternalLink size={12} className="shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}
