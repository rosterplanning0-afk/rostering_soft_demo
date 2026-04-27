'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { EmployeeRequest, Employee, Duty, DutyType } from '@/types';
import {
  CalendarClock,
  Plus,
  Loader2,
  Calendar,
  FileText,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  LayoutGrid,
  List
} from 'lucide-react';
import { Button, Select, Input } from '@/components/FormField';
import Modal from '@/components/Modal';

export default function EmployeeRequestsPage() {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allDuties, setAllDuties] = useState<Duty[]>([]);
  const [dutyTypes, setDutyTypes] = useState<DutyType[]>([]);
  const [delegations, setDelegations] = useState<{ roster_group_id: string; access_level: 'view' | 'edit' }[]>([]);
  
  // Form state
  const [requestType, setRequestType] = useState<'leave' | 'shift_change'>('leave');
  const [requestDate, setRequestDate] = useState('');
  const [requestDateTo, setRequestDateTo] = useState('');
  const [reason, setReason] = useState('');
  const [targetDutyId, setTargetDutyId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const { profile, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const isEmployeeOnly = role === 'employee';

  useEffect(() => {
    if (!authLoading && !profile) router.replace('/');
  }, [authLoading, profile, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, dutyRes, dtRes, delRes] = await Promise.all([
        fetch('/api/employees').then(r => r.json()),
        fetch('/api/duties').then(r => r.json()),
        fetch('/api/duty-types').then(r => r.json()),
        role === 'roster_planner' ? fetch('/api/delegations').then(r => r.json()) : Promise.resolve([]),
      ]);
      
      setDelegations(delRes || []);
      const allEmps: Employee[] = empRes || [];
      
      // Filter employees for planners
      let filteredEmps = allEmps;
      if (role === 'roster_planner') {
        const allowedIds = (delRes || []).map((d: any) => d.roster_group_id);
        filteredEmps = allEmps.filter(e => e.roster_group_id && allowedIds.includes(e.roster_group_id));
      }
      setEmployees(filteredEmps);
      
      setAllDuties(dutyRes || []);
      setDutyTypes(dtRes || []);
      
      let targetEmpId = '';
      if (isEmployeeOnly && profile) {
        const myEmp = allEmps.find(e => e.profile_id === profile.id);
        if (myEmp) {
          targetEmpId = myEmp.id;
          setSelectedEmployeeId(myEmp.id);
        }
      }

      const qs = (isEmployeeOnly && targetEmpId) ? `?employee_id=${targetEmpId}` : '';
      const reqRes = await fetch(`/api/employee-requests${qs}`).then(r => r.json());
      
      let filteredReqs = reqRes || [];
      if (role === 'roster_planner') {
        const allowedIds = (delRes || []).map((d: any) => d.roster_group_id);
        filteredReqs = filteredReqs.filter((req: EmployeeRequest) => 
          req.employees?.roster_group_id && allowedIds.includes(req.employees.roster_group_id)
        );
      }
      setRequests(filteredReqs);
      
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile) loadData();
  }, [profile, isEmployeeOnly]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDate || !reason || !selectedEmployeeId) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/employee-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedEmployeeId,
          request_type: requestType,
          request_date: requestDate,
          request_date_to: requestType === 'leave' ? (requestDateTo || null) : null,
          reason,
          target_duty_id: targetDutyId || null,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        setRequestDate('');
        setRequestDateTo('');
        setReason('');
        setTargetDutyId('');
        loadData();
      } else {
        const data = await res.json();
        alert(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      alert('Error creating request');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    try {
      const res = await fetch(`/api/employee-requests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (e) {
      alert('Error deleting request');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] w-full max-w-5xl mx-auto min-w-0">
      <div className="flex items-center justify-between mb-6 px-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leave & Duty Management</h1>
          <p className="text-sm text-slate-500 font-medium">Manage your leave and shift change requests.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => setModalOpen(true)} className="bg-primary hover:bg-primary-dark text-white rounded-xl shadow-md flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Request
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 pb-12">
        {requests.length === 0 ? (
          <div className="bg-white/50 border border-dashed border-border rounded-3xl p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <CalendarClock className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">No requests yet</h3>
            <p className="text-sm text-slate-500">You haven't submitted any leave or shift change requests.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map(req => (
              <div key={req.id} className="bg-white/80 backdrop-blur-md border border-slate-200/60 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all group flex flex-col relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${
                  req.status === 'approved' ? 'bg-emerald-500' :
                  req.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-400'
                }`} />
                
                <div className="flex items-start justify-between mb-4 pl-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        req.request_type === 'leave' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {req.request_type === 'leave' ? 'Leave Request' : 'Shift Change'}
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${
                        req.status === 'approved' ? 'text-emerald-600' :
                        req.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        {req.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                         req.status === 'rejected' ? <XCircle className="w-3.5 h-3.5" /> :
                         <Clock className="w-3.5 h-3.5" />}
                        {req.status}
                      </span>
                    </div>
                    {!isEmployeeOnly && req.employees && (
                      <p className="text-sm font-bold text-slate-900 mt-1">{req.employees.first_name} {req.employees.last_name}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Applied On</p>
                      <p className="text-[11px] font-bold text-slate-900 leading-tight">
                        {format(new Date(req.created_at), 'dd MMM yyyy')} <br />
                        <span className="text-[10px] text-slate-400 font-medium">{format(new Date(req.created_at), 'HH:mm')}</span>
                      </p>
                    </div>
                    {req.status === 'pending' && (
                      <button 
                        onClick={() => handleDelete(req.id)}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Delete Request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="pl-3 mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      {req.request_date_to ? 'Date Range' : 'Request Date'}
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {format(new Date(req.request_date + 'T00:00:00'), 'dd MMM')}
                      {req.request_date_to && (
                        <>
                          <span className="mx-1 text-slate-300">→</span>
                          {format(new Date(req.request_date_to + 'T00:00:00'), 'dd MMM yyyy')}
                        </>
                      )}
                      {!req.request_date_to && format(new Date(req.request_date + 'T00:00:00'), ' yyyy')}
                    </p>
                  </div>
                  {req.target_duty && (
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{req.request_type === 'leave' ? 'Leave Type' : 'Shift Target'}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded leading-none">{req.target_duty.duty_code}</span>
                        <span className="text-xs font-bold text-slate-800 truncate">{req.target_duty.duty_name}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pl-3 space-y-3 flex-1 flex flex-col">
                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-1">
                      <FileText className="w-3 h-3" /> Reason
                    </p>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{req.reason}</p>
                  </div>
                  
                  {req.planner_comment && (
                    <div className={`rounded-xl p-3 border ${
                      req.status === 'approved' ? 'bg-emerald-50/50 border-emerald-100/50' : 'bg-rose-50/50 border-rose-100/50'
                    }`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-1 ${
                        req.status === 'approved' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        <MessageSquare className="w-3 h-3" /> Planner Comment
                      </p>
                      <p className="text-sm text-slate-800 font-medium leading-relaxed">"{req.planner_comment}"</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Employee</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Dates</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Target</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Applied</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        req.request_type === 'leave' ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {req.request_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{req.employees?.first_name} {req.employees?.last_name || '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-800">
                        {format(new Date(req.request_date + 'T00:00:00'), 'dd MMM')}
                        {req.request_date_to && ` - ${format(new Date(req.request_date_to + 'T00:00:00'), 'dd MMM')}`}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {req.target_duty ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1 py-0.5 rounded">{req.target_duty.duty_code}</span>
                          <span className="text-xs font-medium text-slate-600 truncate max-w-[120px]">{req.target_duty.duty_name}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
                        req.status === 'approved' ? 'text-emerald-600' :
                        req.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      {format(new Date(req.created_at), 'dd MMM, HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'pending' && (
                        <button 
                          onClick={() => handleDelete(req.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Request">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-1">
          {!isEmployeeOnly && (
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Employee</label>
              <Select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} required>
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.employee_id})</option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Request Type</label>
              <Select value={requestType} onChange={(e) => setRequestType(e.target.value as 'leave' | 'shift_change')} required>
                <option value="leave">Leave</option>
                <option value="shift_change">Shift Change</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                {requestType === 'leave' ? 'Date From' : 'Date of Request'}
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {requestType === 'leave' && (
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Date To (Optional)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  value={requestDateTo}
                  onChange={(e) => setRequestDateTo(e.target.value)}
                  className="pl-10"
                  min={requestDate}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                {requestType === 'leave' ? 'Leave Option' : 'Shift Option'}
              </label>
              <Select 
                value={targetDutyId} 
                onChange={(e) => setTargetDutyId(e.target.value)} 
                required
              >
                <option value="">Select Option</option>
                {allDuties
                  .filter(d => {
                    const dt = dutyTypes.find(t => t.id === d.duty_type_id);
                    const emp = employees.find(e => e.id === selectedEmployeeId);
                    
                    if (requestType === 'leave') {
                      return dt?.name.toLowerCase().includes('leave');
                    } else {
                      // For shift change, must match Normal Duty type AND employee context
                      const isNormal = dt?.name.toLowerCase().includes('normal') || dt?.shortcode.toLowerCase().includes('norm');
                      if (!isNormal || !emp) return false;
                      
                      return (
                        d.department_id === emp.department_id &&
                        d.designation_id === emp.designation_id &&
                        d.roster_group_id === emp.roster_group_id
                      );
                    }
                  })
                  .map(duty => (
                    <option key={duty.id} value={duty.id}>
                      {duty.duty_code} - {duty.duty_name}
                    </option>
                  ))
                }
              </Select>
              
              {targetDutyId && (
                <div className="mt-2 p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                  {(() => {
                    const d = allDuties.find(duty => duty.id === targetDutyId);
                    if (!d) return null;
                    return (
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="flex flex-col">
                          <span className="text-slate-400 font-black uppercase tracking-tighter">Sign On</span>
                          <span className="font-bold text-indigo-700">{d.start_location} | {d.start_time?.slice(0, 5)}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-slate-400 font-black uppercase tracking-tighter">Sign Off</span>
                          <span className="font-bold text-indigo-700">{d.end_location} | {d.end_time?.slice(0, 5)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Reason / Details</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full h-24 p-3 bg-slate-50 border border-border rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                placeholder="Please provide details..."
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="rounded-xl px-5">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="rounded-xl px-6 bg-primary hover:bg-primary-dark text-white shadow-sm">
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
