'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  History, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  Tag, 
  Activity,
  FileJson,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AuditLog {
  id: string;
  created_at: string;
  action: string;
  category: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  profiles: {
    full_name: string;
    role: string;
  } | null;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'EMPLOYEE_MANAGEMENT', label: 'Employee Management' },
  { id: 'ROSTER_PLANNING', label: 'Roster Planning' },
  { id: 'DISPATCH', label: 'Dispatch' },
  { id: 'USER_MANAGEMENT', label: 'User Management' },
  { id: 'SYSTEM', label: 'System' },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLogs();
  }, [categoryFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const response = await fetch(`/api/audit-logs?category=${categoryFilter}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedLogs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedLogs(newSet);
  };

  const filteredLogs = logs.filter(log => {
    const searchStr = `${log.action} ${log.entity_type} ${log.profiles?.full_name || ''} ${log.entity_id || ''}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'EMPLOYEE_MANAGEMENT': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ROSTER_PLANNING': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'DISPATCH': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'USER_MANAGEMENT': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-primary" />
            Audit System Logs
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Monitor and track all critical actions across the platform</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="relative group">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end px-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {filteredLogs.length} Actions Found
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Action & Entity</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Performed By</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Timestamp</th>
                <th className="w-16 px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-8"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                    <td className="px-6 py-8"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                    <td className="px-6 py-8"><div className="h-4 bg-slate-100 rounded w-24 ml-auto"></div></td>
                    <td></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Activity className="w-12 h-12 text-slate-200" />
                      <p className="text-slate-400 font-medium">No activity logs found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogs.has(log.id);
                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-50/80' : ''}`}
                        onClick={() => toggleExpand(log.id)}
                      >
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-bold text-slate-900">{log.action.replace(/_/g, ' ')}</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${getCategoryColor(log.category)}`}>
                                {log.category.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                {log.entity_type}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700">{log.profiles?.full_name || 'System'}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{log.profiles?.role?.replace(/_/g, ' ') || 'Process'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-slate-700">{format(new Date(log.created_at), 'MMM dd, yyyy')}</span>
                            <span className="text-[10px] font-bold text-slate-400">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 ml-auto" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={4} className="px-8 py-6 border-t border-slate-100">
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <FileJson className="w-3.5 h-3.5" />
                                  Payload Details
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  ID: {log.entity_id || 'N/A'}
                                </span>
                              </div>
                              <div className="p-4">
                                <pre className="text-xs text-slate-600 font-mono overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Helper to make React available in the Fragment
import React from 'react';
