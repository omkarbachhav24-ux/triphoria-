import React from 'react';
import { CopyButton } from './CopyButton';

export const CodeBlock = ({
  code = '',
  title = '',
  language = 'javascript',
  showLineNumbers = false,
  className = ''
}) => {
  const lines = code.trim().split('\n');

  // Simple restrained regex syntax highlighter to maintain Motion's monochrome aesthetic
  const highlightLine = (line) => {
    // Comment
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      return <span className="text-[#6a9955]">{line}</span>;
    }

    // Split and highlight keywords and strings cleanly
    const parts = line.split(/(".*?"|'.*?'|`.*?`|\b(?:import|export|from|const|let|var|function|return|if|else|async|await|whileHover|whileTap|animate|transition|type)\b)/g);

    return parts.map((part, i) => {
      if (!part) return null;
      if (/^["'`]/.test(part)) {
        return <span key={i} className="text-[#ce9178]">{part}</span>;
      }
      if (/^(import|export|from|const|let|var|function|return|if|else|async|await)$/.test(part)) {
        return <span key={i} className="text-[#c586c0] font-medium">{part}</span>;
      }
      if (/^(whileHover|whileTap|animate|transition|type|stiffness|damping)$/.test(part)) {
        return <span key={i} className="text-[#9cdcfe]">{part}</span>;
      }
      return <span key={i} className="text-[#d4d4d4]">{part}</span>;
    });
  };

  return (
    <div className={`relative my-6 overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#111214] ${className}`}>
      {/* Header Bar */}
      <div className="flex h-10 items-center justify-between border-b border-white/[0.06] bg-[#17181b]/50 px-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="font-mono text-[12px] font-medium text-[#a1a1a6]">
            {title || language}
          </span>
        </div>
        <CopyButton text={code.trim()} label="Copy" />
      </div>

      {/* Code Body */}
      <div className="overflow-x-auto p-4 font-mono text-[13px] leading-[1.65]">
        <pre className="m-0 font-inherit">
          <code>
            {lines.map((line, idx) => (
              <div key={idx} className="table-row">
                {showLineNumbers && (
                  <span className="table-cell select-none pr-4 text-right text-[11px] text-[#6f7075]/60">
                    {idx + 1}
                  </span>
                )}
                <span className="table-cell whitespace-pre">{highlightLine(line)}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};
