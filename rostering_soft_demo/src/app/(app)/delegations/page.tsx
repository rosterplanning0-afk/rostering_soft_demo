'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, 
  Shield, 
  Plus, 
  Trash2, 
  Loader2, 
  Lock, 
  Eye, 
  Edit3,
  Search,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { Button, Select, Input } from '@/components/FormField';
import Modal from '@/components/Modal';
import { Profile, RosterGroup } from '@/types';

interface Delegation {
  id: string;
  planner_id: string;
  roster_group_id: string;
  access_level: 'view' | 'edit';
  created_at: string;
  profiles?: Profile;
  roster_groups?: RosterGroup;
}

export default function DelegationsPage() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [planners, setPlanners] = useState<Profile[]>([]);
  const [rosterGroups, setRosterGroups] = useState<RosterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedPlannerId, setSelectedPlannerId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [accessLevel, setAccessLevel] = useState<'view' | 'edit'>('view');

  const { role, profile } = useAuth();
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [delRes, profRes, rgRes] = await Promise.all([
        fetch('/api/delegations').then(r => r.json()),
        fetch('/api/profiles').then(r => r.json()),
        fetch('/api/roster-groups').then(r => r.json())
      ]);
      setDelegations(delRes || []);
      // Filter profiles to only show roster planners
      const allProfiles: Profile[] = profRes || [];
      setPlanners(allProfiles.filter(p => p.role === 'roster_planner'));
      setRosterGroups(rgRes || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (role === 'system_admin') loadData();
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlannerId || !selectedGroupId) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planner_id: selectedPlannerId,
          roster_group_id: selectedGroupId,
          access_level: accessLevel
        })
      });

      if (res.ok) {
        setModalOpen(false);
        setSelectedPlannerId('');
        setSelectedGroupId('');
        setAccessLevel('view');
        loadData();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || 'Failed to create delegation'}`);
      }
    } catch (e) {
      alert('Network error');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this delegation?')) return;
    try {
      const res = await fetch(`/api/delegations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (role !== 'system_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Lock className="w-16 h-16 text-slate-200 mb-4" />
        <h2 className="text-2xl font-bold text-slate-700">Access Denied</h2>
        <p className="text-slate-500 max-w-xs">Only system administrators can manage planner delegations.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Loading delegations...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] w-full max-w-6xl mx-auto min-w-0">
      <div className="flex items-center justify-between mb-8 px-1">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" /> Planner Delegations
          </h1>
          <p className="text-slate-500 font-medium mt-1">Assign Roster Groups and access rights to specific planners.</p>
        </div>
        <Button 
          onClick={() => setModalOpen(true)} 
          className="bg-primary hover:bg-primary-dark text-white rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2 px-6 py-6 transition-all hover:scale-[1.02] active:scale-95"
        >
          <UserPlus className="w-5 h-5" /> Assign New Rights
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-12">
        {delegations.length === 0 ? (
          <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[40px] p-20 text-center flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No delegations found</h3>
            <p className="text-slate-500 max-w-sm">Start by assigning roster groups to your roster planners to control their scope of work.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {delegations.map(del => (
              <div key={del.id} className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-[0.03] pointer-events-none ${del.access_level === 'edit' ? 'bg-indigo-600' : 'bg-slate-600'}`} />
                
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center font-bold text-slate-400 text-xl uppercase">
                      {del.profiles?.full_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg leading-tight">{del.profiles?.full_name || 'Unknown Planner'}</h3>
                      <p className="text-sm text-slate-400 font-medium tracking-tight">Roster Planner</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(del.id)}
                    className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    title="Remove Rights"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{del.roster_groups?.name || 'All Groups'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                        {del.access_level === 'edit' ? <Edit3 className="w-4 h-4 text-indigo-600" /> : <Eye className="w-4 h-4 text-slate-600" />}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-700 block capitalize">{del.access_level} Access</span>
                        <span className="text-[10px] text-slate-400 font-medium leading-none">
                          {del.access_level === 'edit' ? 'Can view and modify planning/dispatch' : 'Can only view dispatch data'}
                        </span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${del.access_level === 'edit' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                      {del.access_level}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Assign Planner Rights">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-2">
          <div className="space-y-4">
            <div className="group">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Select Roster Planner</label>
              <Select value={selectedPlannerId} onChange={(e) => setSelectedPlannerId(e.target.value)} required className="h-14 rounded-2xl border-2 border-slate-100 focus:border-primary">
                <option value="">Choose a planner...</option>
                {planners.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </Select>
            </div>

            <div className="group">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Assign Roster Group</label>
              <Select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} required className="h-14 rounded-2xl border-2 border-slate-100 focus:border-primary">
                <option value="">Select group...</option>
                {rosterGroups.map(rg => (
                  <option key={rg.id} value={rg.id}>{rg.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">Access Level</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAccessLevel('view')}
                  className={`p-4 rounded-[24px] border-2 transition-all flex flex-col gap-2 text-left ${
                    accessLevel === 'view' ? 'border-primary bg-primary/5 ring-4 ring-primary/10' : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <Eye className={`w-6 h-6 ${accessLevel === 'view' ? 'text-primary' : 'text-slate-400'}`} />
                  <div>
                    <span className={`font-bold block ${accessLevel === 'view' ? 'text-slate-900' : 'text-slate-600'}`}>View Only</span>
                    <span className="text-[10px] text-slate-400 font-medium">Read-only access to Dispatch section.</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAccessLevel('edit')}
                  className={`p-4 rounded-[24px] border-2 transition-all flex flex-col gap-2 text-left ${
                    accessLevel === 'edit' ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/10' : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <Edit3 className={`w-6 h-6 ${accessLevel === 'edit' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <div>
                    <span className={`font-bold block ${accessLevel === 'edit' ? 'text-slate-900' : 'text-slate-600'}`}>Full Edit</span>
                    <span className="text-[10px] text-slate-400 font-medium">Full access to Planning and Dispatch.</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="rounded-xl px-8 h-12 font-bold text-slate-500">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="rounded-xl px-10 h-12 bg-primary hover:bg-primary-dark text-white font-bold shadow-lg shadow-primary/20">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Assignment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
