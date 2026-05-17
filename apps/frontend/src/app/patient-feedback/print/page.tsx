'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/api';

interface Location {
  id: string;
  token: string;
  ward: string;
  room?: string;
  bed?: string;
  locationType: 'BED' | 'WARD';
  department: string;
  status: string;
}

function feedbackUrl(token: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/feedback?t=${token}`;
}

function PrintInner() {
  const params = useSearchParams();
  const ward = params.get('ward') || '';

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ['fb-print', ward],
    queryFn: () =>
      api
        .get('/patient-feedback/locations', { params: ward ? { ward } : {} })
        .then((r) => r.data.filter((l: Location) => l.status === 'ACTIVE')),
  });

  useEffect(() => {
    if (!isLoading && locations.length) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [isLoading, locations.length]);

  return (
    <div className="p-6">
      <style>{`@media print {
        .no-print, header, nav { display: none !important; }
        main { padding: 0 !important; max-width: none !important; }
        @page { margin: 12mm; }
      }`}</style>
      <div className="no-print mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">
          QR labels{ward ? ` — Ward ${ward}` : ''} ({locations.length})
        </h1>
        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          Print
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {locations.map((l) => (
          <div
            key={l.id}
            className="border border-gray-300 rounded-xl p-4 text-center break-inside-avoid"
          >
            <p className="text-sm font-bold text-gray-900">Patient Feedback — Nursing Care</p>
            <p className="text-xs text-gray-600 mb-3">
              {l.locationType === 'BED'
                ? `Ward ${l.ward} | Room ${l.room} | Bed ${l.bed}`
                : `Ward ${l.ward} | ${l.department}`}
            </p>
            <div className="flex justify-center">
              <QRCodeSVG value={feedbackUrl(l.token)} size={150} includeMargin />
            </div>
            <p className="text-xs text-gray-500 mt-2">Scan to share feedback</p>
          </div>
        ))}
      </div>
      {!isLoading && locations.length === 0 && (
        <p className="text-gray-400 text-center py-12">No active locations to print.</p>
      )}
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading…</div>}>
      <PrintInner />
    </Suspense>
  );
}
