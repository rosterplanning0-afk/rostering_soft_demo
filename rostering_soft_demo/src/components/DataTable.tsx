'use client';

import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  loading?: boolean;
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  onEdit,
  onDelete,
  loading,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-border rounded-3xl transition-colors duration-300">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Retrieving Records...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white border border-border rounded-3xl text-center transition-colors duration-300">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4 inline-block">
           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
           </svg>
        </div>
        <p className="text-slate-400 font-semibold text-lg">No records found</p>
        <p className="text-slate-500 text-sm mt-1">Start by adding a new entry to this category.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm transition-colors duration-300">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-5 text-left text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]"
                >
                  {col.header}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">
                  Manage
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map((item) => (
              <tr key={item.id} className="group hover:bg-red-50/30 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </div>
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="p-2 rounded-lg hover:bg-white hover:text-primary hover:shadow-sm hover:border-border border border-transparent transition-all"
                          title="Edit Record"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          className="p-2 rounded-lg hover:bg-white hover:text-destructive hover:shadow-sm hover:border-border border border-transparent transition-all"
                          title="Delete Record"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
