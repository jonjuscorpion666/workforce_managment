'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Send, Save, Globe, Building2, LayoutGrid, Bell,
  Lock, ShieldCheck, AlertTriangle, Clock, Info, Plus, Trash2,
  CheckSquare, Filter, Users,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

// ─── Constants ──────────────────────────────────────────────────────────────

const ANNOUNCEMENT_TYPES = [
  { value: 'INFORMATIONAL',            label: 'Informational' },
  { value: 'ACTION_REQUIRED',          label: 'Action Required' },
  { value: 'SURVEY_LAUNCH',            label: 'Survey Launch' },
  { value: 'DEADLINE_REMINDER',        label: 'Deadline Reminder' },
  { value: 'POLICY_UPDATE',            label: 'Policy Update' },
  { value: 'CRITICAL_ALERT',           label: 'Critical Alert' },
  { value: 'LEADERSHIP_COMMUNICATION', label: 'Leadership Communication' },
  { value: 'TRAINING_COMPLIANCE',      label: 'Training / Compliance' },
];

const PRIORITIES = [
  { value: 'LOW',      label: 'Low',      color: 'bg-gray-100 text-gray-600' },
  { value: 'MEDIUM',   label: 'Medium',   color: 'bg-blue-100 text-blue-700' },
  { value: 'HIGH',     label: 'High',     color: 'bg-orange-100 text-orange-700' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

const AUDIENCE_SCOPES = [
  { value: 'SYSTEM',      label: 'System-Wide',        description: 'All 11 Franciscan Health hospitals', icon: Globe },
  { value: 'HOSPITAL',    label: 'Specific Hospitals',  description: 'One or more hospitals',              icon: Building2 },
  { value: 'DEPARTMENT',  label: 'Department',          description: 'One or more departments',             icon: LayoutGrid },
  { value: 'UNIT',        label: 'Unit / Team',         description: 'Specific units or teams',            icon: LayoutGrid },
  { value: 'ROLE',        label: 'By Role',             description: 'Target specific roles enterprise-wide', icon: Bell },
  { value: 'COMBINATION', label: 'Combination',         description: 'Mix of hospitals, roles, and units', icon: Filter },
];

const ROLES = ['SVP', 'CNO', 'DIRECTOR', 'MANAGER', 'NURSE', 'HR_ANALYST'];

// Allowed scopes per role
const ALLOWED_SCOPES: Record<string, string[]> = {
  SVP:        ['SYSTEM', 'HOSPITAL', 'DEPARTMENT', 'UNIT', 'ROLE', 'COMBINATION'],
  SUPER_ADMIN:['SYSTEM', 'HOSPITAL', 'DEPARTMENT', 'UNIT', 'ROLE', 'COMBINATION'],
  CNP:        ['HOSPITAL', 'DEPARTMENT', 'UNIT', 'ROLE', 'COMBINATION'],
  DIRECTOR:   ['DEPARTMENT', 'UNIT', 'ROLE'],
  MANAGER:    ['UNIT', 'ROLE'],
};

interface OrgUnit {
  id: string;
  name: string;
  code: string;
  level: string;
  location: string;
}

// ─── Scope button ─────────────────────────────────────────────────────────

function ScopeButton({
  value, current, icon: Icon, label, description, disabled, onClick,
}: {
  value: string; current: string; icon: React.ElementType;
  label: string; description: string; disabled?: boolean; onClick: () => void;
}) {
  const active = value === current;
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all text-left min-w-0
        ${disabled ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed' :
          active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
    >
      <div className="flex items-center gap-1.5 w-full">
        <Icon className={`w-3.5 h-3.5 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
        <span className={`text-xs font-semibold ${active ? 'text-blue-700' : 'text-gray-700'}`}>{label}</span>
        {disabled && <Lock className="w-3 h-3 text-gray-300 ml-auto" />}
      </div>
      <p className={`text-xs ${active ? 'text-blue-500' : 'text-gray-400'}`}>{description}</p>
    </button>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function NewAnnouncementPage() {
  const router = useRouter();
  const { user, hasRole } = useAuth();

  const [mounted, setMounted] = useState(false);

  const isSVP      = hasRole('SVP') || hasRole('SUPER_ADMIN');
  const isCNO      = hasRole('CNO');
  const isDirector = hasRole('DIRECTOR');
  const isManager  = hasRole('MANAGER');

  const userRole      = isSVP ? 'SVP' : isCNO ? 'CNO' : isDirector ? 'DIRECTOR' : isManager ? 'MANAGER' : '';
  const allowedScopes = ALLOWED_SCOPES[userRole === 'CNO' ? 'CNO' : userRole] ?? [];

  // Form state — initialize with safe static defaults; role-correct scope set after mount
  const [title, setTitle]             = useState('');
  const [body, setBody]               = useState('');
  const [type, setType]               = useState('INFORMATIONAL');
  const [priority, setPriority]       = useState('MEDIUM');
  const [audienceMode, setAudienceMode] = useState('SYSTEM');
  const [selectedOrgUnits, setSelectedOrgUnits] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles]       = useState<string[]>([]);
  const [requiresAck, setRequiresAck] = useState(false);
  const [ackDueAt, setAckDueAt]       = useState('');
  const [isPinned, setIsPinned]       = useState(false);
  const [publishAt, setPublishAt]     = useState('');
  const [expireAt, setExpireAt]       = useState('');
  const [tags, setTags]               = useState('');
  const [error, setError]             = useState('');

  // Org units for targeting
  const { data: orgUnits = [] } = useQuery<OrgUnit[]>({
    queryKey: ['org-units'],
    queryFn: () => api.get('/org/units').then((r) => r.data),
  });
  const hospitals   = orgUnits.filter((u) => u.level === 'HOSPITAL');
  const departments = orgUnits.filter((u) => u.level === 'DEPARTMENT');
  const units       = orgUnits.filter((u) => u.level === 'UNIT');

  // After mount: set role-correct default scope and flag as mounted
  useEffect(() => {
    setMounted(true);
    const correctDefault = allowedScopes[0] ?? 'SYSTEM';
    setAudienceMode(correctDefault);
  }, []); // eslint-disable-line

  // Auto-select CNO's own hospital
  useEffect(() => {
    if (isCNO && user?.orgUnit && hospitals.length > 0 && audienceMode === 'HOSPITAL' && selectedOrgUnits.length === 0) {
      const own = hospitals.find((h) => h.id === user.orgUnit?.id);
      if (own) setSelectedOrgUnits([own.id]);
    }
  }, [isCNO, user?.orgUnit?.id, hospitals.length, audienceMode]); // eslint-disable-line

  function toggleOrgUnit(id: string) {
    if (isCNO && audienceMode === 'HOSPITAL') return; // locked
    setSelectedOrgUnits((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  function toggleRole(role: string) {
    setSelectedRoles((p) => p.includes(role) ? p.filter((r) => r !== role) : [...p, role]);
  }

  function validate() {
    if (!title.trim())   { setError('Title is required.'); return false; }
    if (!body.trim())    { setError('Message body is required.'); return false; }
    if (requiresAck && priority === 'CRITICAL' && !ackDueAt) {
      setError('Critical announcements requiring acknowledgement must have an acknowledgement due date.'); return false;
    }
    if (expireAt && publishAt && new Date(expireAt) <= new Date(publishAt)) {
      setError('Expiry date must be after publish date.'); return false;
    }
    return true;
  }

  function buildPayload(publish: boolean) {
    return {
      title: title.trim(),
      body: body.trim(),
      type,
      priority,
      audienceMode,
      targetOrgUnitIds: ['HOSPITAL', 'DEPARTMENT', 'UNIT', 'COMBINATION'].includes(audienceMode) ? selectedOrgUnits : null,
      targetRoles: ['ROLE', 'COMBINATION'].includes(audienceMode) ? selectedRoles : null,
      requiresAcknowledgement: requiresAck,
      acknowledgementDueAt: ackDueAt || null,
      isPinned: isSVP && isPinned,
      publishAt: !publish && publishAt ? publishAt : null,
      expireAt: expireAt || null,
      tags: tags.trim() ? tags.split(',').map((t) => t.trim()).filter(Boolean) : null,
    };
  }

  const saveDraft = useMutation({
    mutationFn: (data: any) => api.post('/announcements', data),
    onSuccess: () => router.push('/announcements'),
  });

  const saveAndPublish = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/announcements', data);
      await api.post(`/announcements/${res.data.id}/publish`);
      return res.data;
    },
    onSuccess: () => router.push('/announcements'),
  });

  function handleDraft()   { if (!validate()) return; setError(''); saveDraft.mutate(buildPayload(false)); }
  function handlePublish() { if (!validate()) return; setError(''); saveAndPublish.mutate(buildPayload(true)); }

  const isBusy = saveDraft.isPending || saveAndPublish.isPending;

  // Only block after mount so we know the real role (avoids SSR flash)
  if (mounted && !userRole) {
    return (
      <div className="max-w-lg mx-auto pt-16 text-center space-y-4">
        <Lock className="w-12 h-12 text-gray-300 mx-auto" />
        <h2 className="text-lg font-semibold text-gray-800">Announcement creation is not available for your role</h2>
        <Link href="/announcements" className="btn-secondary text-sm inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Announcements
        </Link>
      </div>
    );
  }

  // Show nothing while mounting to avoid hydration flash
  if (!mounted) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/announcements" className="text-gray-400 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">New Announcement</h1>
          <p className="text-gray-500 text-sm mt-0.5" suppressHydrationWarning>
            {!mounted ? '' : isSVP ? 'Enterprise-wide communication' : isCNO ? `Hospital-level — ${user?.orgUnit?.name ?? ''}` : 'Department communication'}
          </p>
        </div>
        {mounted && isSVP && (
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" /> Full Authority
          </div>
        )}
        {mounted && isCNO && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <Building2 className="w-3.5 h-3.5" /> Hospital CNO
          </div>
        )}
        {mounted && isDirector && (
          <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            <Users className="w-3.5 h-3.5" /> Director
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800">Announcement Content</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
          <input className="input" placeholder="e.g. Mandatory Hand Hygiene Audit — All Units" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message Body <span className="text-red-500">*</span></label>
          <textarea className="input resize-none h-36 text-sm" placeholder="Write the full announcement message here..." value={body} onChange={(e) => setBody(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select className="input text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              {ANNOUNCEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <div className="flex gap-2 flex-wrap">
              {PRIORITIES.map((p) => (
                <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all
                    ${priority === p.value ? `${p.color} border-current` : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated, optional)</label>
          <input className="input text-sm" placeholder="e.g. compliance, ICU, urgent" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
      </div>

      {/* ── Audience ──────────────────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800">Target Audience</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AUDIENCE_SCOPES.map(({ value, label, description, icon }) => {
            const allowed = allowedScopes.includes(value);
            return (
              <ScopeButton
                key={value}
                value={value} current={audienceMode} icon={icon}
                label={label} description={description}
                disabled={!allowed}
                onClick={() => { if (allowed) { setAudienceMode(value); setSelectedOrgUnits([]); setSelectedRoles([]); } }}
              />
            );
          })}
        </div>

        {/* Hospital selector */}
        {['HOSPITAL', 'COMBINATION'].includes(audienceMode) && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              {isCNO ? 'Your hospital (locked)' : 'Select hospitals'}
            </p>
            {isCNO ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-medium text-amber-800">{user?.orgUnit?.name}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {hospitals.map((h) => {
                  const checked = selectedOrgUnits.includes(h.id);
                  return (
                    <label key={h.id} onClick={() => toggleOrgUnit(h.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all select-none
                        ${checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{h.name.replace('Franciscan Health ', '')}</p>
                        <p className="text-xs text-gray-400">{h.location}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Role selector */}
        {['ROLE', 'COMBINATION'].includes(audienceMode) && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Select target roles</p>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => {
                const selected = selectedRoles.includes(role);
                return (
                  <button key={role} type="button" onClick={() => toggleRole(role)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all
                      ${selected ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {role}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {audienceMode === 'SYSTEM' && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <Globe className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              This announcement will be visible to all authenticated users across all 11 Franciscan Health hospitals.
            </p>
          </div>
        )}
      </div>

      {/* ── Settings ─────────────────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800">Delivery & Settings</h2>

        {/* Acknowledgement */}
        <div className="flex items-start gap-3">
          <input type="checkbox" id="ack" checked={requiresAck} onChange={(e) => setRequiresAck(e.target.checked)}
            className="w-4 h-4 accent-blue-600 mt-0.5" />
          <div className="flex-1">
            <label htmlFor="ack" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-gray-400" /> Require acknowledgement
            </label>
            <p className="text-xs text-gray-400 mt-0.5">Recipients must explicitly confirm they have read and understood this announcement.</p>
          </div>
        </div>

        {requiresAck && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acknowledgement due by</label>
            <input type="datetime-local" className="input text-sm" value={ackDueAt} onChange={(e) => setAckDueAt(e.target.value)} />
          </div>
        )}

        {/* Pin (SVP only) */}
        {mounted && isSVP && (
          <div className="flex items-start gap-3">
            <input type="checkbox" id="pin" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 accent-blue-600 mt-0.5" />
            <label htmlFor="pin" className="text-sm font-medium text-gray-700 cursor-pointer">
              Pin this announcement (stays at top of feed)
            </label>
          </div>
        )}

        {/* Schedule */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Clock className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
              Schedule publish (optional)
            </label>
            <input type="datetime-local" className="input text-sm" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Leave blank to publish immediately when you click Publish.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires at (optional)</label>
            <input type="datetime-local" className="input text-sm" value={expireAt} onChange={(e) => setExpireAt(e.target.value)} />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
              ${priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              {priority}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {AUDIENCE_SCOPES.find((s) => s.value === audienceMode)?.label}
            </span>
            {requiresAck && (
              <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckSquare className="w-3 h-3" /> Ack required
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleDraft} disabled={isBusy} className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50">
              <Save className="w-4 h-4" /> {saveDraft.isPending ? 'Saving...' : 'Save Draft'}
            </button>
            <button onClick={handlePublish} disabled={isBusy} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
              <Send className="w-4 h-4" /> {saveAndPublish.isPending ? 'Publishing...' : publishAt ? 'Schedule' : 'Publish Now'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
