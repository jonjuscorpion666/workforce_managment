'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, Users, Shield, Building2, LayoutGrid, ChevronDown,
  ChevronRight, Mail, UserCheck, MapPin, AlertCircle, Plus, X,
  Save, Building, Layers, Pencil, UserPlus, Lock,
  Upload, Download, CheckCircle2, XCircle, FileSpreadsheet, AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';

type Tab = 'hospitals' | 'users' | 'roles' | 'config';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'hospitals', label: 'Hospital Directory', icon: Building2 },
  { key: 'users',     label: 'Users',              icon: Users },
  { key: 'roles',     label: 'Roles',              icon: Shield },
  { key: 'config',    label: 'Config',             icon: Settings },
];

// ─── Generic modal ─────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

// ─── Field helper ──────────────────────────────────────────────────────────

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Add / Edit User modal ─────────────────────────────────────────────────

function UserModal({
  roles, orgUnits, allUsers, editUser, onClose,
  lockedHospitalId = '', lockedHospitalName = '',
}: {
  roles: any[];
  orgUnits: any[];
  allUsers: any[];
  editUser?: any;
  onClose: () => void;
  lockedHospitalId?: string;
  lockedHospitalName?: string;
}) {
  const qc = useQueryClient();
  const isEdit = !!editUser;

  const [firstName,   setFirstName]   = useState(editUser?.firstName   ?? '');
  const [lastName,    setLastName]    = useState(editUser?.lastName    ?? '');
  const [email,       setEmail]       = useState(editUser?.email       ?? '');
  const [password,    setPassword]    = useState('');
  const [jobTitle,    setJobTitle]    = useState(editUser?.jobTitle    ?? '');
  const [employeeId,  setEmployeeId]  = useState(editUser?.employeeId  ?? '');
  const [roleName,    setRoleName]    = useState(editUser?.roles?.[0]?.name ?? '');
  const [orgUnitId,   setOrgUnitId]   = useState(editUser?.orgUnit?.id ?? (lockedHospitalId || ''));
  const [reportsToId, setReportsToId] = useState(editUser?.reportsTo?.id ?? '');
  const [status,      setStatus]      = useState(editUser?.status ?? 'ACTIVE');
  const [error,       setError]       = useState('');

  // Build a flat list of all units with breadcrumb labels for the selector
  const hospitals   = orgUnits.filter((u) => u.level === 'HOSPITAL');
  const departments = orgUnits.filter((u) => u.level === 'DEPARTMENT');
  const units       = orgUnits.filter((u) => u.level === 'UNIT');

  // When locked to a hospital, filter org units to only that hospital's subtree
  const isLocked = !!lockedHospitalId;
  function isUnderHospital(unit: any): boolean {
    if (unit.level === 'HOSPITAL') return unit.id === lockedHospitalId;
    if (unit.level === 'DEPARTMENT') return unit.parentId === lockedHospitalId;
    // UNIT — check its parent department
    const dept = departments.find((d) => d.id === unit.parentId);
    return dept?.parentId === lockedHospitalId;
  }
  const visibleHospitals   = isLocked ? hospitals.filter((h) => h.id === lockedHospitalId) : hospitals;
  const visibleDepartments = isLocked ? departments.filter(isUnderHospital) : departments;
  const visibleUnits       = isLocked ? units.filter(isUnderHospital) : units;

  function getLabel(unit: any) {
    const dept = departments.find((d) => d.id === unit.parentId);
    const hosp = dept
      ? hospitals.find((h) => h.id === dept.parentId)
      : hospitals.find((h) => h.id === unit.parentId);
    const parts = [hosp?.name, dept?.name, unit.name].filter(Boolean);
    return parts.join(' › ');
  }

  // Hierarchy-based manager filter when locked to a hospital
  const managerRoleForRole: Record<string, string[]> = {
    DIRECTOR: ['CNP'],
    MANAGER:  ['DIRECTOR'],
    NURSE:    ['MANAGER'],
    PCT:      ['MANAGER'],
  };
  const allowedManagerRoles = isLocked && roleName ? (managerRoleForRole[roleName] ?? []) : [];
  const filteredManagers = isLocked && allowedManagerRoles.length > 0
    ? allUsers.filter((u) => {
        const uRole = u.roles?.[0]?.name ?? '';
        if (!allowedManagerRoles.includes(uRole)) return false;
        // must belong to same hospital subtree
        if (!u.orgUnit) return uRole === 'CNP'; // CNO may not have an orgUnit set
        return isUnderHospital(u.orgUnit) || u.orgUnit?.id === lockedHospitalId || uRole === 'CNP';
      })
    : allUsers.filter((u) => u.id !== editUser?.id);

  const save = useMutation({
    mutationFn: () => {
      if (isEdit) {
        return api.patch(`/admin/users/${editUser.id}`, {
          firstName, lastName, jobTitle, employeeId, roleName, status,
          orgUnitId:   orgUnitId   || null,
          reportsToId: reportsToId || null,
        });
      }
      return api.post('/admin/users', {
        firstName, lastName, email, password, jobTitle, employeeId,
        roleName,
        orgUnitId:   orgUnitId   || null,
        reportsToId: reportsToId || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Failed to save user'),
  });

  function handleSave() {
    if (!firstName.trim() || !lastName.trim()) { setError('First and last name are required'); return; }
    if (!isEdit && !email.trim())              { setError('Email is required'); return; }
    if (!isEdit && !password.trim())           { setError('Password is required'); return; }
    if (!roleName)                             { setError('Role is required'); return; }
    setError('');
    save.mutate();
  }

  return (
    <Modal title={isEdit ? `Edit ${editUser.firstName} ${editUser.lastName}` : 'Add User'} onClose={onClose}>
      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="First Name" required>
          <input className="input" placeholder="Jane" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Last Name" required>
          <input className="input" placeholder="Smith" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
      </div>

      {/* Email + password (create only) */}
      {!isEdit && (
        <>
          <Field label="Email" required>
            <input className="input" type="email" placeholder="jane.smith@franciscanhealth.org"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Initial Password" required hint="User should change this on first login.">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input pl-9" type="password" placeholder="Minimum 8 characters"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </Field>
        </>
      )}

      {/* Role */}
      <Field label="Role" required>
        <select className="input text-sm" value={roleName} onChange={(e) => setRoleName(e.target.value)}>
          <option value="">— Select role —</option>
          {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </Field>

      {/* Org unit */}
      <Field label="Assign to Org Unit" hint="Select the hospital, department, or unit this user belongs to.">
        {isLocked ? (
          <div>
            <select className="input text-sm" value={orgUnitId} onChange={(e) => setOrgUnitId(e.target.value)}>
              <optgroup label="Hospital">
                {visibleHospitals.map((h) => <option key={h.id} value={h.id}>{h.name} 🔒</option>)}
              </optgroup>
              {visibleDepartments.length > 0 && (
                <optgroup label="Departments">
                  {visibleDepartments.map((d) => <option key={d.id} value={d.id}>{getLabel(d)}</option>)}
                </optgroup>
              )}
              {visibleUnits.length > 0 && (
                <optgroup label="Units / Teams">
                  {visibleUnits.map((u) => <option key={u.id} value={u.id}>{getLabel(u)}</option>)}
                </optgroup>
              )}
            </select>
            <p className="text-xs text-gray-400 mt-1">Org units scoped to {lockedHospitalName}</p>
          </div>
        ) : (
          <select className="input text-sm" value={orgUnitId} onChange={(e) => setOrgUnitId(e.target.value)}>
            <option value="">— None —</option>
            <optgroup label="Hospitals">
              {hospitals.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </optgroup>
            {departments.length > 0 && (
              <optgroup label="Departments">
                {departments.map((d) => <option key={d.id} value={d.id}>{getLabel(d)}</option>)}
              </optgroup>
            )}
            {units.length > 0 && (
              <optgroup label="Units / Teams">
                {units.map((u) => <option key={u.id} value={u.id}>{getLabel(u)}</option>)}
              </optgroup>
            )}
          </select>
        )}
      </Field>

      {/* Immediate manager */}
      <Field label="Immediate Manager" hint={isLocked && allowedManagerRoles.length ? `Filtered to ${allowedManagerRoles.join('/')} role(s)` : 'Who does this person report to?'}>
        <select className="input text-sm" value={reportsToId} onChange={(e) => setReportsToId(e.target.value)}>
          <option value="">— None —</option>
          {filteredManagers.map((u: any) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName} ({u.roles?.[0]?.name ?? 'No role'})
            </option>
          ))}
        </select>
        {isLocked && allowedManagerRoles.length > 0 && filteredManagers.length === 0 && (
          <p className="text-xs text-amber-500 mt-1">No {allowedManagerRoles.join('/')} users found for this hospital yet.</p>
        )}
      </Field>

      {/* Job title + employee ID */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Job Title">
          <input className="input" placeholder="e.g. RN, Charge Nurse" value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)} />
        </Field>
        <Field label="Employee ID">
          <input className="input" placeholder="e.g. EMP-4821" value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)} />
        </Field>
      </div>

      {/* Status (edit only) */}
      {isEdit && (
        <Field label="Status">
          <select className="input text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </Field>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
        <button onClick={handleSave} disabled={save.isPending}
          className="btn-primary text-sm flex items-center gap-2">
          <Save className="w-4 h-4" />
          {save.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
        </button>
      </div>
    </Modal>
  );
}

// ─── CSV helpers ───────────────────────────────────────────────────────────

const CSV_COLUMNS = ['firstName','lastName','email','password','role','orgUnit','managerEmail','jobTitle','employeeId'] as const;
type CsvRow = Record<typeof CSV_COLUMNS[number], string>;

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, ''));
  // map header aliases → our canonical names
  const alias: Record<string, string> = {
    firstname: 'firstName', lastname: 'lastName', email: 'email',
    password: 'password', role: 'role', rolename: 'role',
    orgunit: 'orgUnit', orgunitname: 'orgUnit', unit: 'orgUnit',
    manageremail: 'managerEmail', manager: 'managerEmail', reportsto: 'managerEmail',
    jobtitle: 'jobTitle', title: 'jobTitle',
    employeeid: 'employeeId', empid: 'employeeId',
  };

  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    // handle quoted fields
    const vals: string[] = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    vals.push(cur.trim());

    const row: any = {};
    header.forEach((h, i) => { row[alias[h] ?? h] = vals[i] ?? ''; });
    return row as CsvRow;
  });
}

function downloadTemplate() {
  const a = document.createElement('a');
  a.href = '/user_import_template.csv';
  a.download = 'user_import_template.csv';
  a.click();
}

// ─── Bulk Upload modal ─────────────────────────────────────────────────────

type UploadStep = 'upload' | 'preview' | 'result';

function BulkUploadModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [step,      setStep]    = useState<UploadStep>('upload');
  const [rows,      setRows]    = useState<CsvRow[]>([]);
  const [fileName,  setFileName] = useState('');
  const [parseErr,  setParseErr] = useState('');
  const [result,    setResult]  = useState<{ created: number; failed: { row: number; email: string; reason: string }[] } | null>(null);

  function handleFile(file: File) {
    setParseErr('');
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setParseErr('Please upload a CSV file.'); return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) { setParseErr('No valid rows found. Check the file format.'); return; }
      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  }

  const submit = useMutation({
    mutationFn: () => api.post('/admin/users/bulk', { rows: rows.map((r) => ({
      firstName:    r.firstName,
      lastName:     r.lastName,
      email:        r.email,
      password:     r.password,
      roleName:     r.role,
      orgUnitName:  r.orgUnit        || undefined,
      managerEmail: r.managerEmail   || undefined,
      jobTitle:     r.jobTitle       || undefined,
      employeeId:   r.employeeId     || undefined,
    })) }),
    onSuccess: (res) => {
      setResult(res.data);
      setStep('result');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const ROW_PREVIEW_LIMIT = 10;

  return (
    <Modal title="Bulk Upload Users" onClose={onClose}>

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Template download */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <FileSpreadsheet className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">Use the CSV template</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Columns: <span className="font-mono">firstName, lastName, email, password, role, orgUnit, jobTitle, employeeId</span>
              </p>
              <button onClick={downloadTemplate}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900">
                <Download className="w-3.5 h-3.5" /> Download template
              </button>
            </div>
          </div>

          {/* Drop zone */}
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-gray-300 hover:border-brand-400 rounded-xl p-8 text-center transition-colors">
              <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Click to select CSV file</p>
              <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
            </div>
            <input type="file" accept=".csv,.txt" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </label>

          {parseErr && (
            <p className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {parseErr}
            </p>
          )}

          <div className="flex items-start gap-2 text-xs text-gray-400">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              <strong>role</strong> must match an existing role name (e.g. STAFF, MANAGER, CNP, SVP).{' '}
              <strong>orgUnit</strong> is matched by name.{' '}
              <strong>managerEmail</strong> must be the email of an existing user or another user in the same file — leave blank if not applicable.
            </span>
          </div>
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 font-medium">{fileName}</span>
            <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{rows.length} rows</span>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['#','First','Last','Email','Role','Org Unit','Manager Email','Job Title'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, ROW_PREVIEW_LIMIT).map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 text-gray-400">{i + 2}</td>
                    <td className="px-3 py-2 text-gray-700">{r.firstName}</td>
                    <td className="px-3 py-2 text-gray-700">{r.lastName}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{r.email}</td>
                    <td className="px-3 py-2">
                      <span className="bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded text-xs font-medium">{r.role}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 max-w-[100px] truncate">{r.orgUnit || <span className="italic text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-[120px] truncate">{r.managerEmail || <span className="italic text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-gray-500">{r.jobTitle || <span className="italic text-gray-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > ROW_PREVIEW_LIMIT && (
              <p className="text-xs text-gray-400 text-center py-2 border-t border-gray-100">
                +{rows.length - ROW_PREVIEW_LIMIT} more rows not shown
              </p>
            )}
          </div>

          {submit.isError && (
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {(submit.error as any)?.response?.data?.message ?? 'Upload failed. Please try again.'}
            </p>
          )}

          <div className="flex gap-3 justify-between pt-1">
            <button onClick={() => { setStep('upload'); setRows([]); }} className="btn-secondary text-sm">
              ← Back
            </button>
            <button onClick={() => submit.mutate()} disabled={submit.isPending}
              className="btn-primary text-sm flex items-center gap-2">
              <Upload className="w-4 h-4" />
              {submit.isPending ? `Importing ${rows.length} users…` : `Import ${rows.length} users`}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Result ── */}
      {step === 'result' && result && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-2xl font-bold text-green-700">{result.created}</p>
                <p className="text-xs text-green-600">Users created</p>
              </div>
            </div>
            <div className={`rounded-xl p-4 flex items-center gap-3 border ${result.failed.length > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
              <XCircle className={`w-8 h-8 flex-shrink-0 ${result.failed.length > 0 ? 'text-red-400' : 'text-gray-300'}`} />
              <div>
                <p className={`text-2xl font-bold ${result.failed.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{result.failed.length}</p>
                <p className={`text-xs ${result.failed.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>Failed rows</p>
              </div>
            </div>
          </div>

          {/* Failure details */}
          {result.failed.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Failed rows</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.failed.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-red-700">Row {f.row}</span>
                      {f.email && <span className="text-xs text-red-500 ml-2">{f.email}</span>}
                      <p className="text-xs text-red-600 mt-0.5">{f.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            {result.failed.length > 0 && (
              <button onClick={() => { setStep('upload'); setRows([]); setResult(null); }}
                className="btn-secondary text-sm">
                Fix & Re-upload
              </button>
            )}
            <button onClick={onClose} className="btn-primary text-sm">Done</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Add Hospital modal ────────────────────────────────────────────────────

function AddHospitalModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name,        setName]        = useState('');
  const [code,        setCode]        = useState('');
  const [address,     setAddress]     = useState('');
  const [city,        setCity]        = useState('');
  const [state,       setState]       = useState('');
  const [zipCode,     setZipCode]     = useState('');
  const [phone,       setPhone]       = useState('');
  const [website,     setWebsite]     = useState('');
  const [bedCapacity, setBedCapacity] = useState('');
  const [timezone,    setTimezone]    = useState('');
  const [error,       setError]       = useState('');

  const create = useMutation({
    mutationFn: () => api.post('/org/units', {
      name: name.trim(),
      code: code.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      location: [city.trim(), state.trim()].filter(Boolean).join(', ') || undefined,
      phone: phone.trim() || undefined,
      website: website.trim() || undefined,
      bedCapacity: bedCapacity ? Number(bedCapacity) : undefined,
      timezone: timezone.trim() || undefined,
      level: 'HOSPITAL',
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-units'] }); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Failed to create hospital'),
  });

  return (
    <Modal title="Add Hospital" onClose={onClose}>
      {/* Basic info */}
      <Field label="Hospital Name" required>
        <input className="input" placeholder="e.g. Franciscan Health Olympia Fields" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code">
          <input className="input" placeholder="e.g. FH-OLYMPIA" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field label="Bed Capacity">
          <input type="number" min="0" className="input" placeholder="e.g. 250" value={bedCapacity} onChange={(e) => setBedCapacity(e.target.value)} />
        </Field>
      </div>

      {/* Address */}
      <Field label="Street Address">
        <input className="input" placeholder="e.g. 20201 S Crawford Ave" value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="City">
          <input className="input" placeholder="Olympia Fields" value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="State">
          <input className="input" placeholder="IL" value={state} onChange={(e) => setState(e.target.value)} />
        </Field>
        <Field label="ZIP Code">
          <input className="input" placeholder="60461" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
        </Field>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <input className="input" placeholder="e.g. (708) 747-4000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Website">
          <input className="input" placeholder="e.g. franciscanhealth.org" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </Field>
      </div>
      <Field label="Timezone">
        <input className="input" placeholder="e.g. America/Chicago" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
        <button
          onClick={() => { if (!name.trim()) { setError('Name is required'); return; } setError(''); create.mutate(); }}
          disabled={create.isPending}
          className="btn-primary text-sm flex items-center gap-2">
          <Save className="w-4 h-4" /> {create.isPending ? 'Creating…' : 'Create Hospital'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Add Unit/Department modal ─────────────────────────────────────────────

function AddUnitModal({
  hospitals,
  lockedHospitalId = '', lockedHospitalName = '',
  lockedDeptId = '', lockedDeptName = '',
  onClose,
}: {
  hospitals: any[];
  lockedHospitalId?: string; lockedHospitalName?: string;
  lockedDeptId?: string; lockedDeptName?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName]         = useState('');
  const [code, setCode]         = useState('');
  // Directors are locked to UNIT level; CNO defaults to DEPARTMENT
  const [level, setLevel]       = useState<'DEPARTMENT' | 'UNIT'>(lockedDeptId ? 'UNIT' : 'DEPARTMENT');
  const [parentId, setParentId] = useState(lockedDeptId || lockedHospitalId);
  const [error, setError]       = useState('');

  const create = useMutation({
    mutationFn: () => api.post('/org/units', { name: name.trim(), code: code.trim(), level, parentId: parentId || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-units'] }); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Failed to create unit'),
  });

  const lockedParentId   = lockedDeptId   || lockedHospitalId;
  const lockedParentName = lockedDeptName || lockedHospitalName;
  const parentLabel      = lockedDeptId ? 'Parent Department' : 'Parent Hospital';

  return (
    <Modal title={lockedDeptId ? 'Add Unit' : 'Add Department / Unit'} onClose={onClose}>
      {/* Level toggle — hidden for Directors (locked to UNIT) */}
      {!lockedDeptId && (
        <Field label="Level">
          <div className="flex gap-3">
            {(['DEPARTMENT', 'UNIT'] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLevel(l)}
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all
                  ${level === l ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                {l === 'DEPARTMENT' ? 'Department' : 'Unit / Team'}
              </button>
            ))}
          </div>
        </Field>
      )}
      <Field label="Name" required>
        <input className="input" placeholder={level === 'DEPARTMENT' ? 'e.g. Critical Care' : 'e.g. ICU Night Shift'} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Code">
        <input className="input" placeholder="e.g. CC-01" value={code} onChange={(e) => setCode(e.target.value)} />
      </Field>
      <Field label={parentLabel} required>
        {lockedParentId ? (
          <div className="input bg-gray-50 text-gray-600 cursor-not-allowed select-none flex items-center justify-between">
            <span>{lockedParentName || lockedParentId}</span>
            <span className="text-xs text-gray-400">🔒</span>
          </div>
        ) : (
          <select className="input text-sm" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">— Select hospital —</option>
            {hospitals.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        )}
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
        <button
          onClick={() => {
            if (!name.trim()) { setError('Name is required'); return; }
            if (!parentId)    { setError(`${parentLabel} is required`); return; }
            setError(''); create.mutate();
          }}
          disabled={create.isPending}
          className="btn-primary text-sm flex items-center gap-2">
          <Save className="w-4 h-4" /> {create.isPending ? 'Creating…' : `Create ${level === 'DEPARTMENT' ? 'Department' : 'Unit'}`}
        </button>
      </div>
    </Modal>
  );
}

// ─── Add Role modal ────────────────────────────────────────────────────────

function AddRoleModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName]   = useState('');
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: () => api.post('/admin/roles', { name: name.trim().toUpperCase() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-roles'] }); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Failed to create role'),
  });

  return (
    <Modal title="Add Role" onClose={onClose}>
      <Field label="Role Name" required hint="Role names are stored in uppercase.">
        <input className="input uppercase" placeholder="e.g. CHARGE_NURSE" value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())} />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
        <button
          onClick={() => { if (!name.trim()) { setError('Name is required'); return; } setError(''); create.mutate(); }}
          disabled={create.isPending}
          className="btn-primary text-sm flex items-center gap-2">
          <Save className="w-4 h-4" /> {create.isPending ? 'Creating…' : 'Create Role'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Hospital row ──────────────────────────────────────────────────────────

function HospitalRow({ hospital, cno, units }: { hospital: any; cno: any; units: any[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50 cursor-pointer"
        onClick={() => setOpen((o) => !o)}>
        <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{hospital.name}</p>
          {hospital.location && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {hospital.location}
            </p>
          )}
        </div>
        {cno ? (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <UserCheck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-800 truncate">{cno.firstName} {cno.lastName}</p>
              <p className="text-xs text-amber-500 truncate">{cno.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5" /> No CNO assigned
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400 ml-2">
          <LayoutGrid className="w-3.5 h-3.5" />
          {units.length} unit{units.length !== 1 ? 's' : ''}
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 space-y-2">
          {units.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No departments or units configured.</p>
          ) : (
            units.map((unit) => (
              <div key={unit.id} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${unit.level === 'DEPARTMENT' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-700">{unit.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${unit.level === 'DEPARTMENT' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                  {unit.level}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE:    'bg-green-100 text-green-700',
    INACTIVE:  'bg-gray-100 text-gray-500',
    SUSPENDED: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

// ─── Config tab ────────────────────────────────────────────────────────────

type ConfigType = 'boolean' | 'number';
interface ConfigSchema {
  key: string;
  label: string;
  description: string;
  type: ConfigType;
  group: string;
  min?: number;
  max?: number;
  unit?: string;
}

const CONFIG_SCHEMA: ConfigSchema[] = [
  // Survey Governance
  {
    key: 'cno_survey_requires_svp_approval',
    label: 'CNO surveys require SVP approval',
    description: 'When enabled, surveys created by CNOs are held in PENDING until an SVP approves them.',
    type: 'boolean',
    group: 'Survey Governance',
  },
  {
    key: 'cno_must_use_template',
    label: 'CNOs must use an approved template',
    description: 'When enabled, CNOs must base new surveys on an approved template.',
    type: 'boolean',
    group: 'Survey Governance',
  },
  {
    key: 'director_survey_requires_approval',
    label: 'Director surveys require approval',
    description: 'When enabled, Director surveys must be approved by a CNO or SVP before going live.',
    type: 'boolean',
    group: 'Survey Governance',
  },
  {
    key: 'director_max_questions',
    label: 'Director max questions per survey',
    description: 'Maximum number of questions a Director can include in a pulse survey.',
    type: 'number',
    group: 'Survey Governance',
    min: 1,
    max: 20,
    unit: 'questions',
  },
  {
    key: 'manager_survey_creation_enabled',
    label: 'Allow managers to create surveys',
    description: 'Not recommended — enabling this risks survey fatigue and data inconsistency.',
    type: 'boolean',
    group: 'Survey Governance',
  },
  // Issue Analysis
  {
    key: 'auto_issue_threshold',
    label: 'Auto-issue score threshold',
    description: 'Units scoring below this percentage on any engagement dimension will automatically have an issue created. Applies when running survey analysis.',
    type: 'number',
    group: 'Issue Analysis',
    min: 1,
    max: 100,
    unit: '%',
  },
];

const CONFIG_GROUPS = Array.from(new Set(CONFIG_SCHEMA.map((s) => s.group)));

function ConfigTab({ config }: { config: any[] }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [saved,  setSaved]  = useState<string | null>(null);

  const configMap = new Map(config.map((c) => [c.key, c.value]));

  async function handleChange(key: string, value: any) {
    setSaving(key);
    try {
      await api.post('/admin/config', { key, value });
      qc.invalidateQueries({ queryKey: ['admin-config'] });
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  }

  // Collect config keys not covered by schema (raw display)
  const knownKeys = new Set(CONFIG_SCHEMA.map((s) => s.key));
  const unknownConfigs = config.filter((c) => !knownKeys.has(c.key));

  return (
    <div className="space-y-6">
      {CONFIG_GROUPS.map((group) => (
        <div key={group} className="card">
          <div className="flex items-center gap-2 mb-5">
            <Settings className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-gray-900">{group}</h2>
          </div>
          <div className="space-y-5">
            {CONFIG_SCHEMA.filter((s) => s.group === group).map((schema) => {
              const current = configMap.get(schema.key);
              const isSaving = saving === schema.key;
              const isSaved  = saved  === schema.key;

              return (
                <div key={schema.key} className="flex items-start justify-between gap-6 py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{schema.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{schema.description}</p>
                    <p className="text-xs font-mono text-gray-300 mt-1">{schema.key}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {schema.type === 'boolean' ? (
                      <button
                        onClick={() => handleChange(schema.key, !current)}
                        disabled={isSaving}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          current ? 'bg-brand-600' : 'bg-gray-200'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${current ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          defaultValue={current ?? ''}
                          min={schema.min}
                          max={schema.max}
                          disabled={isSaving}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (!isNaN(val) && val !== current) handleChange(schema.key, val);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          }}
                          className="w-20 text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                        />
                        {schema.unit && <span className="text-xs text-gray-400">{schema.unit}</span>}
                      </div>
                    )}
                    {isSaved && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Raw display for any config keys not covered by schema */}
      {unknownConfigs.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Other Config</h2>
          <div className="space-y-3">
            {unknownConfigs.map((c: any) => (
              <div key={c.id} className="border-b border-gray-100 pb-3 last:border-0">
                <p className="text-xs font-mono text-gray-500 mb-0.5">{c.key}</p>
                <p className="text-sm text-gray-800">{JSON.stringify(c.value)}</p>
                {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { hasRole } = useAuth();
  const canCreateHospital = hasRole('SVP') || hasRole('SUPER_ADMIN');
  const canAccessConfig   = hasRole('SVP') || hasRole('SUPER_ADMIN');
  const isManager         = hasRole('MANAGER');
  const [tab,       setTab]       = useState<Tab>('hospitals');
  const [modal,     setModal]     = useState<'hospital' | 'unit' | 'role' | 'user' | 'bulk' | null>(null);
  const [editUser,  setEditUser]  = useState<any>(null);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data),
  });

  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ['admin-roles'],
    queryFn: () => api.get('/admin/roles').then((r) => r.data),
  });

  const { data: config = [] } = useQuery<any[]>({
    queryKey: ['admin-config'],
    queryFn: () => api.get('/admin/config').then((r) => r.data),
  });

  const { data: orgUnits = [] } = useQuery<any[]>({
    queryKey: ['org-units'],
    queryFn: () => api.get('/org/units').then((r) => r.data),
  });

  // CNO / Director: fetch profile to scope views and lock fields
  const isCNO      = hasRole('CNP');
  const isDirector = hasRole('DIRECTOR');
  const { data: profile } = useQuery<any>({
    queryKey: ['profile'],
    queryFn: () => api.get('/auth/profile').then((r) => r.data),
    enabled: isCNO || isDirector,
  });
  const cnoHospitalId   = isCNO ? (profile?.hospital?.id   ?? '') : '';
  const cnoHospitalName = isCNO ? (profile?.hospital?.name ?? '') : '';

  const directorHospitalId   = isDirector ? (profile?.hospital?.id     ?? '') : '';
  const directorHospitalName = isDirector ? (profile?.hospital?.name   ?? '') : '';
  const directorDeptId       = isDirector ? (profile?.department?.id   ?? '') : '';
  const directorDeptName     = isDirector ? (profile?.department?.name ?? '') : '';

  const cnoUsers   = users.filter((u) => u.roles?.some((r: any) => r.name === 'CNP'));
  const hospitals  = orgUnits.filter((u) => u.level === 'HOSPITAL');
  const childUnits = orgUnits.filter((u) => u.level === 'DEPARTMENT' || u.level === 'UNIT');

  function getCno(hospitalId: string) {
    return cnoUsers.find((u) => u.orgUnit?.id === hospitalId) ?? null;
  }

  function getUnits(hospitalId: string) {
    const direct      = childUnits.filter((u) => u.parentId === hospitalId);
    const grandchildren = childUnits.filter((u) => direct.some((d) => d.id === u.parentId));
    return [...direct, ...grandchildren];
  }

  // Resolve the department ancestor for a user's orgUnit
  function userDeptId(u: any): string | null {
    const ou = u.orgUnit;
    if (!ou) return null;
    if (ou.level === 'DEPARTMENT') return ou.id;
    if (ou.level === 'UNIT') return ou.parent?.id ?? null; // parent should be DEPARTMENT
    return null;
  }

  // Resolve the hospital ancestor for a user's orgUnit (walks up max 2 levels)
  function userHospitalId(u: any): string | null {
    const ou = u.orgUnit;
    if (!ou) return null;
    if (ou.level === 'HOSPITAL') return ou.id;
    if (ou.level === 'DEPARTMENT') return ou.parent?.id ?? null;
    if (ou.level === 'UNIT') return ou.parent?.parent?.id ?? ou.parent?.id ?? null;
    return null;
  }

  const MANAGER_ALLOWED_ROLES = ['NURSE', 'PCT'];

  // Filtered users list — CNO → hospital, Director → department, Manager → NURSE/PCT only
  const filteredUsers = users.filter((u) => {
    if (isCNO && cnoHospitalId) {
      if (userHospitalId(u) !== cnoHospitalId) return false;
    }
    if (isDirector && directorDeptId) {
      if (userDeptId(u) !== directorDeptId) return false;
    }
    if (isManager) {
      const uRole = u.roles?.[0]?.name ?? '';
      if (!MANAGER_ALLOWED_ROLES.includes(uRole)) return false;
    }
    const q = userSearch.toLowerCase();
    const matchesSearch = !q
      || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || u.employeeId?.toLowerCase().includes(q);
    const matchesRole = !roleFilter || u.roles?.some((r: any) => r.name === roleFilter);
    return matchesSearch && matchesRole;
  });

  function openEditUser(user: any) {
    setEditUser(user);
    setModal('user');
  }

  function closeUserModal() {
    setModal(null);
    setEditUser(null);
  }

  return (
    <div className="space-y-6">
      {/* Modals */}
      {modal === 'hospital' && <AddHospitalModal onClose={() => setModal(null)} />}
      {modal === 'unit'     && (
        <AddUnitModal
          hospitals={hospitals}
          lockedHospitalId={isCNO ? cnoHospitalId : isDirector ? directorHospitalId : ''}
          lockedHospitalName={isCNO ? cnoHospitalName : isDirector ? directorHospitalName : ''}
          lockedDeptId={isDirector ? directorDeptId : ''}
          lockedDeptName={isDirector ? directorDeptName : ''}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'role'     && <AddRoleModal onClose={() => setModal(null)} />}
      {modal === 'user'     && (
        <UserModal
          roles={
            isCNO
              ? roles.filter((r: any) => ['DIRECTOR', 'MANAGER', 'NURSE', 'PCT'].includes(r.name))
              : isDirector
                ? roles.filter((r: any) => ['MANAGER', 'NURSE', 'PCT'].includes(r.name))
                : isManager
                  ? roles.filter((r: any) => ['NURSE', 'PCT'].includes(r.name))
                  : roles
          }
          orgUnits={orgUnits}
          allUsers={users}
          editUser={editUser}
          onClose={closeUserModal}
          lockedHospitalId={isCNO ? cnoHospitalId : isDirector ? directorHospitalId : ''}
          lockedHospitalName={isCNO ? cnoHospitalName : isDirector ? directorHospitalName : ''}
        />
      )}
      {modal === 'bulk'     && <BulkUploadModal onClose={() => setModal(null)} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="text-gray-500 mt-1 text-sm">Users, roles, hospital directory, and platform config</p>
        </div>

        {/* Context-sensitive add buttons */}
        <div className="flex gap-2">
          {tab === 'hospitals' && !isManager && (
            <>
              <button onClick={() => setModal('unit')} className="btn-secondary text-sm flex items-center gap-2">
                <Layers className="w-4 h-4" /> {isDirector ? 'Add Unit' : 'Add Dept / Unit'}
              </button>
              {canCreateHospital && (
                <button onClick={() => setModal('hospital')} className="btn-primary text-sm flex items-center gap-2">
                  <Building className="w-4 h-4" /> Add Hospital
                </button>
              )}
            </>
          )}
          {tab === 'users' && (
            <>
              <button onClick={() => setModal('bulk')} className="btn-secondary text-sm flex items-center gap-2">
                <Upload className="w-4 h-4" /> Bulk Upload
              </button>
              <button onClick={() => { setEditUser(null); setModal('user'); }} className="btn-primary text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Add User
              </button>
            </>
          )}
          {tab === 'roles' && canCreateHospital && (
            <button onClick={() => setModal('role')} className="btn-primary text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Role
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {TABS.filter(({ key }) => {
          if (key === 'config'    && !canAccessConfig)        return false;
          if (key === 'roles'     && (isDirector || isManager)) return false;
          if (key === 'hospitals' && isManager)               return false;
          return true;
        }).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
              ${tab === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4" />
            {label}
            {key === 'users' && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {isDirector && directorDeptId
                  ? users.filter((u: any) => userDeptId(u) === directorDeptId).length
                  : isCNO && cnoHospitalId
                    ? users.filter((u: any) => userHospitalId(u) === cnoHospitalId).length
                    : users.length}
              </span>
            )}
            {key === 'hospitals' && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {(isCNO && cnoHospitalId) || (isDirector && directorHospitalId) ? 1 : hospitals.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Hospital Directory ── */}
      {tab === 'hospitals' && (() => {
        const visibleHospitals = (isCNO && cnoHospitalId)
          ? hospitals.filter((h) => h.id === cnoHospitalId)
          : (isDirector && directorHospitalId)
            ? hospitals.filter((h) => h.id === directorHospitalId)
            : hospitals;

        // Director sees only units under their own department
        function getVisibleUnits(hospitalId: string) {
          if (isDirector && directorDeptId) {
            const dept = childUnits.find((u) => u.id === directorDeptId);
            if (!dept) return [];
            const units = childUnits.filter((u) => u.parentId === directorDeptId);
            return [dept, ...units];
          }
          return getUnits(hospitalId);
        }

        const visibleUnitsCount = (isCNO && cnoHospitalId)
          ? getUnits(cnoHospitalId).length
          : (isDirector && directorDeptId)
            ? childUnits.filter((u) => u.parentId === directorDeptId).length // child units of their dept
            : childUnits.length;

        return (
          <div className="space-y-4">
            {/* Stats strip */}
            {(isCNO || isDirector) ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl px-5 py-4">
                  <p className="text-xs text-gray-500 mb-1">{isDirector ? 'Your Hospital' : 'Your Hospital'}</p>
                  <p className="text-base font-bold text-blue-700 truncate">
                    {isDirector ? (directorHospitalName || '—') : (cnoHospitalName || '—')}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl px-5 py-4">
                  <p className="text-xs text-gray-500 mb-1">{isDirector ? 'Your Department' : 'Dept / Units'}</p>
                  {isDirector
                    ? <p className="text-base font-bold text-gray-700 truncate">{directorDeptName || '—'}</p>
                    : <p className="text-2xl font-bold text-gray-700">{visibleUnitsCount}</p>}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Hospitals',     value: hospitals.length,  color: 'text-blue-700',  bg: 'bg-blue-50' },
                  { label: 'CNOs assigned', value: cnoUsers.filter((u) => u.orgUnit).length, color: 'text-amber-700', bg: 'bg-amber-50' },
                  { label: 'Dept / Units',  value: childUnits.length, color: 'text-gray-700',  bg: 'bg-gray-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl px-5 py-4`}>
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Department</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Unit</span>
            </div>

            {visibleHospitals.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                {isCNO ? 'Your hospital is not configured yet.' : isDirector ? 'Your department is not configured yet.' : 'No hospitals yet — click "Add Hospital" to get started.'}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleHospitals.sort((a, b) => a.name.localeCompare(b.name)).map((h) => (
                  <HospitalRow key={h.id} hospital={h} cno={getCno(h.id)} units={getVisibleUnits(h.id)} />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Users ── */}
      {tab === 'users' && (
        <div className="space-y-4">
          {/* Search + filter bar */}
          <div className="flex gap-3">
            <input
              className="input flex-1 text-sm"
              placeholder="Search by name, email, or employee ID…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <select
              className="input text-sm w-44"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All roles</option>
              {roles.map((r: any) => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
          </div>

          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Org Unit</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Status</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-sm">No users found.</td>
                  </tr>
                )}
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" /> {u.email}
                      </p>
                      {u.jobTitle && <p className="text-xs text-gray-400 mt-0.5">{u.jobTitle}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                        {u.roles?.[0]?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell text-xs text-gray-500">
                      <p>{u.orgUnit?.name ?? <span className="italic text-gray-300">Unassigned</span>}</p>
                      {u.reportsTo && (
                        <p className="text-gray-400 mt-0.5">
                          Reports to: {u.reportsTo.firstName} {u.reportsTo.lastName}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <StatusBadge status={u.status ?? 'ACTIVE'} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => openEditUser(u)}
                        disabled={isManager && !MANAGER_ALLOWED_ROLES.includes(u.roles?.[0]?.name)}
                        className="text-gray-400 hover:text-brand-600 transition-colors p-1 rounded disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400"
                        title="Edit user">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            {filteredUsers.length} of {
              isDirector && directorDeptId
                ? users.filter((u: any) => userDeptId(u) === directorDeptId).length
                : isCNO && cnoHospitalId
                  ? users.filter((u: any) => userHospitalId(u) === cnoHospitalId).length
                  : users.length
            } users
          </p>
        </div>
      )}

      {/* ── Roles ── */}
      {tab === 'roles' && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-brand-600" />
            <h2 className="font-semibold text-gray-900">Roles ({roles.length})</h2>
          </div>
          <div className="space-y-2">
            {roles.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                <span className="text-sm font-semibold text-gray-800">{r.name}</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {r.permissions?.length ?? 0} permissions
                </span>
              </div>
            ))}
            {roles.length === 0 && <p className="text-gray-400 text-sm">No roles yet.</p>}
          </div>
        </div>
      )}

      {/* ── Config ── */}
      {tab === 'config' && canAccessConfig && <ConfigTab config={config} />}
      {tab === 'config' && !canAccessConfig && (
        <div className="card text-center py-16 text-gray-400">
          <Settings className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">Access Restricted</p>
          <p className="text-sm mt-1">Platform config is only accessible to SVP and Super Admins.</p>
        </div>
      )}
    </div>
  );
}
