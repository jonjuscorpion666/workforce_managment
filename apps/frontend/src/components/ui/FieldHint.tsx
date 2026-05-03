'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

export function FieldHint({ significance, example }: { significance: string; example: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-block align-middle ml-1"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-gray-400 hover:text-blue-600 inline-flex items-center"
        aria-label="Field info"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-64 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs text-left font-normal normal-case tracking-normal">
          <span className="block font-semibold text-gray-800 mb-1 leading-snug">{significance}</span>
          <span className="block italic text-gray-500 leading-snug">Example: {example}</span>
        </span>
      )}
    </span>
  );
}
