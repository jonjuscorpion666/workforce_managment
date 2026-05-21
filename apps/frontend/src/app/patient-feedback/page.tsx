'use client';

import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeCanvas } from 'qrcode.react';
import { Plus, Printer, QrCode, X, Download, Copy, Building2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import PfHeader from '@/components/patient-feedback/PfHeader';

interface Location {
  id: string;
  token: string;
  hospitalId: string;
  unitId?: string | null;
  room: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface FeedbackUnit {
  id: string;
  hospitalId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface OrgUnit {
  id: string;
  name: string;
  level: string;
}

function feedbackUrl(token: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/feedback?t=${token}`;
}

// Hospitals come from the shared org tree (same data as Surveys / Issues).
function useHospitals() {
  const { data: orgUnits = [] } = useQuery<OrgUnit[]>({
    queryKey: ['org-units'],
    queryFn: () => api.get('/org/units').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  const hospitals = orgUnits
    .filter((u) => u.level === 'HOSPITAL')
    .sort((a, b) => a.name.localeCompare(b.name));
  const nameOf = (id?: string | null) =>
    id ? hospitals.find((h) => h.id === id)?.name ?? null : null;
  return { hospitals, nameOf };
}

// What the current user may see. CNO → locked to one hospital.
interface Scope { all: boolean; hospitalId: string | null; hospitalName: string | null }
function useScope() {
  const { data } = useQuery<Scope>({
    queryKey: ['fb-scope'],
    queryFn: () => api.get('/patient-feedback/scope').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
  const lockedHospitalId = data && !data.all ? data.hospitalId : null;
  return { scope: data, lockedHospitalId };
}

// Feedback units (the level between hospital and room).
function useUnits() {
  const { data: units = [] } = useQuery<FeedbackUnit[]>({
    queryKey: ['fb-units'],
    queryFn: () => api.get('/patient-feedback/units').then((r) => r.data),
    staleTime: 60_000,
  });
  const activeUnitsFor = (hospitalId?: string | null) =>
    hospitalId ? units.filter((u) => u.hospitalId === hospitalId && u.status === 'ACTIVE') : [];
  const unitNameOf = (id?: string | null) =>
    id ? units.find((u) => u.id === id)?.name ?? null : null;
  return { units, activeUnitsFor, unitNameOf };
}

export default function LocationsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showUnits, setShowUnits] = useState(false);
  const [showHospital, setShowHospital] = useState(false);
  const [qrFor, setQrFor] = useState<Location | null>(null);
  const [hospitalFilter, setHospitalFilter] = useState('');

  const { hospitals, nameOf } = useHospitals();
  const { unitNameOf } = useUnits();
  const { lockedHospitalId } = useScope();

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ['fb-locations'],
    queryFn: () => api.get('/patient-feedback/locations').then((r) => r.data),
  });

  const filtered = hospitalFilter
    ? locations.filter((l) => l.hospitalId === hospitalFilter)
    : locations;

  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/patient-feedback/locations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fb-locations'] });
      toast.success('Location deactivated');
    },
  });

  return (
    <div>
      <PfHeader
        title="Locations"
        subtitle="One QR per room — scan to share feedback about nursing care."
        actions={
          <>
            <Link
              href={`/patient-feedback/print${hospitalFilter ? `?hospitalId=${encodeURIComponent(hospitalFilter)}` : ''}`}
              target="_blank"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              <Printer className="w-4 h-4" /> Print labels
            </Link>
            {/* Only org-wide managers (SVP/SUPER_ADMIN) can add hospitals. */}
            {!lockedHospitalId && (
              <button
                onClick={() => setShowHospital(true)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add hospital
              </button>
            )}
            <button
              onClick={() => setShowUnits(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              <Building2 className="w-4 h-4" /> Manage units
            </button>
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
              <Plus className="w-4 h-4" /> Add room
            </button>
          </>
        }
      />

      {/* Hospital filter — hidden for a CNO, whose data is already scoped to one hospital. */}
      {!lockedHospitalId && (
        <div className="mb-4 flex flex-wrap gap-2">
          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All hospitals</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm table-scroll">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-3">Hospital</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Token</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No rooms yet.</td></tr>
            )}
            {filtered.map((l) => (
              <tr key={l.id} className="border-t border-gray-50">
                <td className="px-4 py-3">
                  {nameOf(l.hospitalId) ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  {unitNameOf(l.unitId) ?? <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 font-medium">Room {l.room}</td>
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

      {qrFor && (
        <QrModal
          location={qrFor}
          hospitalName={nameOf(qrFor.hospitalId) ?? 'Hospital'}
          unitName={unitNameOf(qrFor.unitId)}
          onClose={() => setQrFor(null)}
        />
      )}
      {showAdd && <AddModal lockedHospitalId={lockedHospitalId} onClose={() => setShowAdd(false)} />}
      {showBulk && <BulkModal lockedHospitalId={lockedHospitalId} onClose={() => setShowBulk(false)} />}
      {showUnits && <UnitsModal lockedHospitalId={lockedHospitalId} onClose={() => setShowUnits(false)} />}
      {showHospital && <AddHospitalModal onClose={() => setShowHospital(false)} />}
    </div>
  );
}

function QrModal({
  location, hospitalName, unitName, onClose,
}: { location: Location; hospitalName: string; unitName?: string | null; onClose: () => void }) {
  const toast = useToast();
  const wrapRef = useRef<HTMLDivElement>(null);
  const url = feedbackUrl(location.token);
  const label = unitName
    ? `${hospitalName} | ${unitName} | Room ${location.room}`
    : `${hospitalName} | Room ${location.room}`;

  function downloadPng() {
    const canvas = wrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `feedback-qr-${location.token}.png`;
    a.click();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy');
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center">
        <p className="text-sm font-semibold text-gray-800">Patient Feedback — Nursing Care</p>
        <p className="text-xs text-gray-500 mb-4">{label}</p>
        <div ref={wrapRef} className="flex justify-center">
          <QRCodeCanvas value={url} size={200} includeMargin />
        </div>
        <p className="text-xs text-gray-400 mt-3 break-all">{url}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={downloadPng}
            className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium"
          >
            <Download className="w-4 h-4" /> PNG
          </button>
          <button
            onClick={copyLink}
            className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium"
          >
            <Copy className="w-4 h-4" /> Copy link
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          Close
        </button>
      </div>
    </Overlay>
  );
}

function AddModal({ onClose, lockedHospitalId }: { onClose: () => void; lockedHospitalId?: string | null }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { hospitals } = useHospitals();
  const { activeUnitsFor } = useUnits();
  const [form, setForm] = useState({ hospitalId: lockedHospitalId ?? '', unitId: '', room: '' });
  const units = activeUnitsFor(form.hospitalId);
  const create = useMutation({
    mutationFn: () => api.post('/patient-feedback/locations', form).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fb-locations'] });
      toast.success('Room created');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create'),
  });
  const invalid = !form.hospitalId || !form.unitId || !form.room.trim();
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <Header title="Add room" onClose={onClose} />
        <div className="space-y-3">
          {!lockedHospitalId && (
            <Field label="Hospital">
              <select
                className="input"
                value={form.hospitalId}
                onChange={(e) => setForm({ ...form, hospitalId: e.target.value, unitId: '' })}
              >
                <option value="">— Select hospital —</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Unit">
            <select
              className="input disabled:bg-gray-50 disabled:text-gray-400"
              value={form.unitId}
              disabled={!form.hospitalId}
              onChange={(e) => setForm({ ...form, unitId: e.target.value })}
            >
              <option value="">
                {!form.hospitalId ? '— Select hospital first —' : units.length ? '— Select unit —' : 'No units — add one in “Manage units”'}
              </option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Room">
            <input
              className="input"
              placeholder="e.g. 312, ICU-12"
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
            />
          </Field>
        </div>
        <button
          disabled={create.isPending || invalid}
          onClick={() => create.mutate()}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          {create.isPending ? 'Creating…' : 'Create'}
        </button>
      </div>
    </Overlay>
  );
}

function BulkModal({ onClose, lockedHospitalId }: { onClose: () => void; lockedHospitalId?: string | null }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { hospitals } = useHospitals();
  const { activeUnitsFor } = useUnits();
  const [form, setForm] = useState({ hospitalId: lockedHospitalId ?? '', unitId: '', roomsCsv: '' });
  const units = activeUnitsFor(form.hospitalId);
  const create = useMutation({
    mutationFn: () =>
      api
        .post('/patient-feedback/locations/bulk', {
          hospitalId: form.hospitalId,
          unitId: form.unitId,
          rooms: form.roomsCsv.split(',').map((s) => s.trim()).filter(Boolean),
        })
        .then((r) => r.data),
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ['fb-locations'] });
      const skippedNote = d.skipped?.length ? ` (skipped duplicates: ${d.skipped.join(', ')})` : '';
      toast.success(`${d.created} room QR code${d.created === 1 ? '' : 's'} generated${skippedNote}`);
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <Header title="Bulk generate rooms" onClose={onClose} />
        <div className="space-y-3">
          {!lockedHospitalId && (
            <Field label="Hospital">
              <select
                className="input"
                value={form.hospitalId}
                onChange={(e) => setForm({ ...form, hospitalId: e.target.value, unitId: '' })}
              >
                <option value="">— Select hospital —</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Unit">
            <select
              className="input disabled:bg-gray-50 disabled:text-gray-400"
              value={form.unitId}
              disabled={!form.hospitalId}
              onChange={(e) => setForm({ ...form, unitId: e.target.value })}
            >
              <option value="">
                {!form.hospitalId ? '— Select hospital first —' : units.length ? '— Select unit —' : 'No units — add one in “Manage units”'}
              </option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Rooms (comma-separated)">
            <input
              className="input"
              placeholder="312, 313, 314, ICU-12"
              value={form.roomsCsv}
              onChange={(e) => setForm({ ...form, roomsCsv: e.target.value })}
            />
          </Field>
          <p className="text-xs text-gray-400">
            Existing rooms in the selected unit are skipped automatically.
          </p>
        </div>
        <button
          disabled={create.isPending || !form.hospitalId || !form.unitId || !form.roomsCsv.trim()}
          onClick={() => create.mutate()}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          {create.isPending ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </Overlay>
  );
}

function UnitsModal({ onClose, lockedHospitalId }: { onClose: () => void; lockedHospitalId?: string | null }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { hospitals } = useHospitals();
  const { units } = useUnits();
  const [hospitalId, setHospitalId] = useState(lockedHospitalId ?? '');
  const [newName, setNewName] = useState('');

  const hospUnits = hospitalId
    ? units.filter((u) => u.hospitalId === hospitalId && u.status === 'ACTIVE')
    : [];

  const create = useMutation({
    mutationFn: () => api.post('/patient-feedback/units', { hospitalId, name: newName.trim() }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fb-units'] });
      setNewName('');
      toast.success('Unit added');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to add unit'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/patient-feedback/units/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fb-units'] });
      toast.success('Unit removed');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to remove'),
  });

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <Header title="Manage units" onClose={onClose} />
        <div className="space-y-3">
          {!lockedHospitalId && (
            <Field label="Hospital">
              <select
                className="input"
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
              >
                <option value="">— Select hospital —</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </Field>
          )}

          {hospitalId && (
            <>
              <div className="rounded-lg border border-gray-100 divide-y divide-gray-50 max-h-56 overflow-y-auto">
                {hospUnits.length === 0 && (
                  <p className="px-3 py-3 text-sm text-gray-400">No units yet for this hospital.</p>
                )}
                {hospUnits.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-gray-800">{u.name}</span>
                    <button
                      onClick={() => remove.mutate(u.id)}
                      disabled={remove.isPending}
                      title="Remove unit"
                      className="text-gray-400 hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <Field label="Add a unit">
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="e.g. 3 West, ICU"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim()) create.mutate(); }}
                  />
                  <button
                    onClick={() => create.mutate()}
                    disabled={create.isPending || !newName.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </Field>
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
}

function AddHospitalModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', code: '' });
  const create = useMutation({
    mutationFn: () =>
      api.post('/org/units', {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        level: 'HOSPITAL',
      }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-units'] });
      toast.success('Hospital created');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create hospital'),
  });
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <Header title="Add hospital" onClose={onClose} />
        <div className="space-y-3">
          <Field label="Hospital name">
            <input
              className="input"
              placeholder="e.g. Franciscan Health Olympia Fields"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Code (optional)">
            <input
              className="input"
              placeholder="e.g. FH-OLYMPIA"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </Field>
          <p className="text-xs text-gray-400">
            Need address, beds, or contact details? Add those under Admin → Hospital Directory.
          </p>
        </div>
        <button
          disabled={create.isPending || !form.name.trim()}
          onClick={() => create.mutate()}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          {create.isPending ? 'Creating…' : 'Create hospital'}
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
