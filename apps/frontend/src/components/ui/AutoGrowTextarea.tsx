'use client';

import { useEffect, useRef } from 'react';

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Minimum height in rows (default 3). */
  minRows?: number;
};

/**
 * Textarea that grows to fit its content so nothing is clipped, while still
 * allowing the user to drag-resize. Resizes on input and whenever `value`
 * changes externally (e.g. AI fills it in).
 */
export default function AutoGrowTextarea({
  minRows = 3,
  className = '',
  value,
  onInput,
  ...rest
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(resize, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      onInput={(e) => {
        resize();
        onInput?.(e);
      }}
      className={`resize-y overflow-hidden ${className}`}
      {...rest}
    />
  );
}
