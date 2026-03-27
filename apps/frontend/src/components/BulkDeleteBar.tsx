'use client';

import { Trash2, X } from 'lucide-react';

interface BulkDeleteBarProps {
  count: number;
  onDelete: () => void;
  onClear: () => void;
  isPending?: boolean;
  noun?: string;
}

export default function BulkDeleteBar({ count, onDelete, onClear, isPending, noun = 'item' }: BulkDeleteBarProps) {
  if (count === 0) return null;

  function handleDelete() {
    if (!window.confirm(`Permanently soft-delete ${count} selected ${noun}${count !== 1 ? 's' : ''}? They will be hidden from all views.`)) return;
    onDelete();
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
      <span className="text-sm font-semibold text-red-700">
        {count} {noun}{count !== 1 ? 's' : ''} selected
      </span>
      <button
        onClick={onClear}
        className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        <X className="w-3.5 h-3.5" /> Clear
      </button>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="flex items-center gap-1.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {isPending ? 'Deleting...' : 'Delete Selected'}
      </button>
    </div>
  );
}
