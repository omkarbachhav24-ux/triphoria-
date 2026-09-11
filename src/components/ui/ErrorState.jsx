import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorState — concise and actionable (brief §41). Used for: video unavailable,
 * invalid Drive link, upload failed, session expired, permission denied,
 * project not found, network error.
 *
 *   <ErrorState title="Upload failed" body="The link didn't resolve to a video."
 *               onRetry={retry} />
 */
export function ErrorState({
  title = 'Something went wrong',
  body,
  onRetry,
  retryLabel = 'Try again',
  tone = 'error', // 'error' | 'warning'
  className = '',
}) {
  const color = tone === 'warning' ? 'var(--warning)' : 'var(--error)';
  return (
    <div
      className={`flex items-start gap-3 border p-4 ${className}`.trim()}
      style={{
        borderRadius: 'var(--radius-editorial)',
        borderColor: color,
        background:
          tone === 'warning' ? 'var(--warning-muted)' : 'var(--error-muted)',
      }}
      role="alert"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color }} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-[13px] font-semibold" style={{ color }}>
          {title}
        </div>
        {body && (
          <p className="text-[12px] leading-relaxed text-[var(--foreground-muted)]">{body}</p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="u-focus mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--foreground)] hover:text-[var(--foreground-strong)]"
          >
            <RefreshCw size={11} />
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorState;
