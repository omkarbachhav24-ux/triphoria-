import React, { useId } from 'react';

/**
 * Field — labelled form control with a mono uppercase label, optional hint,
 * and inline error. Wraps <input>, <select>, or <textarea>. Used across the
 * order wizard and every admin/editor form.
 *
 *   <Field label="Project title" required value={v} onChange={…} />
 *   <Field label="Format" as="select" value={fmt} onChange={…}>…options…</Field>
 *   <Field label="Brief" as="textarea" rows={4} value={b} onChange={…} />
 */
export function Field({
  label,
  as = 'input',
  hint,
  error,
  required = false,
  className = '',
  id: idProp,
  children,
  ...control
}) {
  const auto = useId();
  const id = idProp || auto;
  const Control = as;
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={`space-y-1.5 ${className}`.trim()}>
      {label && (
        <label
          htmlFor={id}
          className="block font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--foreground-subtle)]"
        >
          {label}
          {required && <span className="ml-1 text-[var(--primary)]">*</span>}
        </label>
      )}
      <Control
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? 'true' : undefined}
        required={required}
        className="triphoria-input"
        {...control}
      >
        {children}
      </Control>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-[11px] leading-relaxed text-[var(--foreground-subtle)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-[11px] leading-relaxed text-[var(--error)]">
          {error}
        </p>
      )}
    </div>
  );
}

export default Field;
