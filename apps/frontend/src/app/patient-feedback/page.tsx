'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Printer, QrCode, X, LayoutDashboard, Ticket } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface Location {
  id: string;
  token: string;
  ward: string;
  room?: string;
  bed?: string;
  locationType: 'BED' | 'WARD';
  department: string;
  status: 'ACTIVE' | 'INACTIVE';
}

function feedbackUrl(token: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/feedback?t=${token}`;
}

export default function LocationsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [qrFor, setQrFor] = useState<Location | null>(null);
  const [wardFilter, setWardFilter] = useState('');

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ['fb-locations'],
    queryFn: () => api.get('/patient-feedback/locations').then((r) => r.data),
  });

  const wards = Array.from(new Set(locations.map((l) => l.ward))).sort();
  const filtered = wardFilter ? locations.filter((l) => l.ward === wardFilter) : locations;

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/patient-feedback/locations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fb-locations'] });
      toast.success('Location deactivated');
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Feedback — Locations</h1>
          <p className="text-sm text-gray-500">
            Bed & ward QR codes for inpatient nursing-care feedback.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/patient-feedback/dashboard"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
          <Link
            href="/patient-feedback/tickets"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Ticket className="w-4 h-4" /> Tickets
          </Link>
          <Link
            href={`/patient-feedback/print${wardFilter ? `?ward=${encodeURIComponent(wardFilter)}` : ''}`}
            target="_blank"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Printer className="w-4 h-4" /> Print labels
          </Link>
          <button
            onClick={() => setShowBulk(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Bulk generate
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add location
          </button>
        </div>
      </div>

      <div className="mb-4">
        <select
          value={wardFilter}
          onChange={(e) => setWardFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All wards</option>
          {wards.map((w) => (
            <option key={w} value={w}>Ward {w}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Ward</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Bed</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Token</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No locations yet.</td></tr>
            )}
            {filtered.map((l) => (
              <tr key={l.id} className="border-t border-gray-50">
                <td className="px-4 py-3 font-medium">{l.ward}</td>
                <td className="px-4 py-3">{l.room ?? '—'}</td>
                <td className="px-4 py-3">{l.bed ?? '—'}</td>
                <td className="px-4 py-3">{l.locationType}</td>
                <td className="px-4 py-3 font-mono text-xs">{l.token}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    l.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setQrFor(l)}
                      className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium"
                    >
                      <QrCode className="w-3.5 h-3.5" /> QR
                    </button>
                    {l.status === 'ACTIVE' && (
                      <button
                        onClick={() => del.mutate(l.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {qrFor && <QrModal location={qrFor} onClose={() => setQrFor(null)} />}
      {showAdd && <AddModal onClose={() => setShowAdd(false)} />}
      {showBulk && <BulkModal onClose={() => setShowBulk(false)} />}
    </div>
  );
}

function QrModal({ location, onClose }: { location: Location; onClose: () => void }) {
  const url = feedbackUrl(location.token);
  const label =
    location.locationType === 'BED'
      ? `Ward ${location.ward} | Room ${location.room} | Bed ${location.bed}`
      : `Ward ${location.ward} | ${location.department}`;
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center">
        <p className="text-sm font-semibold text-gray-800">Patient Feedback — Nursing Care</p>
        <p className="text-xs text-gray-500 mb-4">{label}</p>
        <div className="flex justify-center">
          <QRCodeSVG value={url} size={200} includeMargin />
        </div>
        <p className="text-xs text-gray-400 mt-3 break-all">{url}</p>
        <button
          onClick={onClose}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          Close
        </button>
      </div>
    </Overlay>
  );
}

function AddModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    ward: '', room: '', bed: '', locationType: 'BED', department: 'Inpatient Nursing',
  });
  const create = useMutation({
    mutationFn: () => api.post('/patient-feedback/locations', form).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fb-locations'] });
      toast.success('Location created');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create'),
  });
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <Header title="Add location" onClose={onClose} />
        <div className="space-y-3">
          <Field label="Ward">
            <input className="input" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} />
          </Field>
          <Field label="Type">
            <select
              className="input"
              value={form.locationType}
              onChange={(e) => setForm({ ...form, locationType: e.target.value })}
            >
              <option value="BED">Bed</option>
              <option value="WARD">Ward / common area</option>
            </select>
          </Field>
          {form.locationType === 'BED' && (
            <>
              <Field label="Room">
                <input className="input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
              </Field>
              <Field label="Bed">
                <input className="input" value={form.bed} onChange={(e) => setForm({ ...form, bed: e.target.value })} />
              </Field>
            </>
          )}
          <Field label="Department">
            <input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </Field>
        </div>
        <button
          disabled={create.isPending || !form.ward}
          onClick={() => create.mutate()}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          {create.isPending ? 'Creating…' : 'Create'}
        </button>
      </div>
    </Overlay>
  );
}

function BulkModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({ ward: '', roomsCsv: '', bedsPerRoom: '2', department: 'Inpatient Nursing' });
  const create = useMutation({
    mutationFn: () =>
      api
        .post('/patient-feedback/locations/bulk', {
          ward: form.ward,
          rooms: form.roomsCsv.split(',').map((s) => s.trim()).filter(Boolean),
          bedsPerRoom: Number(form.bedsPerRoom),
          department: form.department,
        })
        .then((r) => r.data),
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ['fb-locations'] });
      toast.success(`${d.created} bed QR codes generated`);
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <Header title="Bulk generate beds" onClose={onClose} />
        <div className="space-y-3">
          <Field label="Ward">
            <input className="input" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} />
          </Field>
          <Field label="Rooms (comma separated)">
            <input
              className="input"
              placeholder="312, 313, 314"
              value={form.roomsCsv}
              onChange={(e) => setForm({ ...form, roomsCsv: e.target.value })}
            />
          </Field>
          <Field label="Beds per room">
            <input
              className="input"
              type="number"
              min={1}
              value={form.bedsPerRoom}
              onChange={(e) => setForm({ ...form, bedsPerRoom: e.target.value })}
            />
          </Field>
        </div>
        <button
          disabled={create.isPending || !form.ward || !form.roomsCsv}
          onClick={() => create.mutate()}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          {create.isPending ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
