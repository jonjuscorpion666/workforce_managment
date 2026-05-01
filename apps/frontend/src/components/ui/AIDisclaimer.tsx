import { AlertCircle } from 'lucide-react';

export function AIDisclaimer({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-start gap-1.5 text-[10px] text-amber-700 mt-1 ${className}`}>
      <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
      <span>AI-generated — please review and edit before saving.</span>
    </p>
  );
}
