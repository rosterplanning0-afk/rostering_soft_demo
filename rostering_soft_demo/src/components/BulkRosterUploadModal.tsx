import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { format, eachDayOfInterval, startOfDay, isBefore } from 'date-fns';
import { Employee, Duty, RosterGroup } from '@/types';
import Modal from '@/components/Modal';
import FormField, { Button, Select, Input } from '@/components/FormField';
import { useAuth } from '@/context/AuthContext';
import { Download, UploadCloud, Loader2, AlertCircle } from 'lucide-react';

interface BulkRosterUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  rosterGroups: RosterGroup[];
  employees: Employee[];
  duties: Duty[];
  onUploadSuccess: () => void;
}

export default function BulkRosterUploadModal({
  isOpen,
  onClose,
  startDate,
  endDate,
  rosterGroups,
  employees,
  duties,
  onUploadSuccess
}: BulkRosterUploadModalProps) {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [dateRange, setDateRange] = useState({ start: startDate, end: endDate });
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const { role } = useAuth();

  const handleDownloadTemplate = () => {
    if (!selectedGroupId) {
      alert('Please select a Roster Group first.');
      return;
    }

    const groupEmployees = employees.filter(e => e.roster_group_id === selectedGroupId);
    const groupDuties = duties.filter(d => d.roster_group_id === selectedGroupId || d.roster_group_id === null);

    const start = new Date(dateRange.start + 'T00:00:00');
    const end = new Date(dateRange.end + 'T00:00:00');
    const days = eachDayOfInterval({ start, end });

    // Sheet 1: Roster Template
    const rosterSheetData: (string | number)[][] = [];
    
    // Row 1: Dates
    const headerRow1 = ['Employee ID', 'Name', ...days.map(d => format(d, 'yyyy-MM-dd'))];
    rosterSheetData.push(headerRow1);
    
    // Row 2: Days of week
    const headerRow2 = ['', '', ...days.map(d => format(d, 'EEEE'))];
    rosterSheetData.push(headerRow2);

    // Employee Rows
    groupEmployees.forEach(emp => {
      const row = [
        emp.employee_id,
        `${emp.first_name} ${emp.last_name}`,
        ...days.map(() => '') // Empty cells for duties
      ];
      rosterSheetData.push(row);
    });

    // Sheet 2: Duty Codes
    const dutySheetData: (string | number)[][] = [
      ['Duty Code', 'Duty Name', 'Start Time', 'End Time', 'Duty Hours']
    ];
    groupDuties.forEach(duty => {
      dutySheetData.push([
        duty.duty_code,
        duty.duty_name,
        duty.start_time ? duty.start_time.slice(0, 5) : '',
        duty.end_time ? duty.end_time.slice(0, 5) : '',
        duty.duty_hours
      ]);
    });

    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.aoa_to_sheet(rosterSheetData);
    // Auto-fit columns for sheet 1
    const ws1Cols = [
      { wch: 15 }, // Employee ID
      { wch: 30 }, // Name
      ...days.map(() => ({ wch: 12 })) // Dates
    ];
    ws1['!cols'] = ws1Cols;
    XLSX.utils.book_append_sheet(wb, ws1, 'Roster Template');

    const ws2 = XLSX.utils.aoa_to_sheet(dutySheetData);
    const ws2Cols = [{ wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
    ws2['!cols'] = ws2Cols;
    XLSX.utils.book_append_sheet(wb, ws2, 'Duty Codes');

    const fileName = `Roster_Template_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedGroupId) {
      setUploadError('Please select a Roster Group before uploading.');
      return;
    }

    setIsProcessing(true);
    setUploadError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      const wsName = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsName];
      
      const jsonData: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      if (jsonData.length < 3) {
        throw new Error("Invalid file format. Ensure you are using the downloaded template.");
      }

      const dateHeaders = jsonData[0].slice(2); // From col index 2 onwards
      const today = startOfDay(new Date());

      const groupDuties = duties.filter(d => d.roster_group_id === selectedGroupId || d.roster_group_id === null);
      
      const assignmentsToCreate: Record<string, unknown>[] = [];
      let errorsFound = 0;

      for (let rowIndex = 2; rowIndex < jsonData.length; rowIndex++) {
        const row = jsonData[rowIndex];
        if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows

        const empIdStr = String(row[0]).trim();
        const employee = employees.find(e => e.employee_id === empIdStr);

        if (!employee) {
          console.warn(`Employee ID ${empIdStr} not found in system.`);
          continue; // Skip invalid employees
        }

        for (let colIndex = 2; colIndex < row.length; colIndex++) {
          const dutyCodeRaw = row[colIndex];
          if (!dutyCodeRaw) continue; // Empty cell
          
          const dutyCodeStr = String(dutyCodeRaw).trim();
          if (dutyCodeStr === '') continue;

          const assignDateStr = dateHeaders[colIndex - 2];
          if (!assignDateStr) continue;
          
          // Must not be past for planners
          const assignDate = new Date(assignDateStr + 'T00:00:00');
          if (role !== 'system_admin' && isBefore(assignDate, today)) {
            console.warn(`Cannot assign duty in the past: ${assignDateStr}`);
            errorsFound++;
            continue;
          }

          const targetDuty = groupDuties.find(d => d.duty_code.toLowerCase() === dutyCodeStr.toLowerCase());
          if (!targetDuty) {
            console.warn(`Duty code ${dutyCodeStr} not found or invalid for this group.`);
            errorsFound++;
            continue;
          }

          assignmentsToCreate.push({
            employee_id: employee.id,
            duty_id: targetDuty.id,
            assignment_date: assignDateStr,
            status: 'draft'
          });
        }
      }

      if (assignmentsToCreate.length === 0) {
        throw new Error("No valid duty assignments found in the file. Make sure dates are present/future and duty codes are valid.");
      }

      // Upload sequentially or in small batches
      let successCount = 0;
      for (const assignment of assignmentsToCreate) {
        const res = await fetch('/api/duty-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignment),
        });
        if (res.ok) {
          successCount++;
        }
      }

      alert(`Successfully processed ${successCount} assignments as DRAFTS.${errorsFound > 0 ? ` Skipped ${errorsFound} invalid/past entries.` : ''}`);
      onUploadSuccess();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setUploadError(err instanceof Error ? err.message : 'An error occurred while processing the file.');
    } finally {
      setIsProcessing(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Bulk Roster Upload">
      <div className="space-y-6">
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3 text-sm text-blue-800">
          <AlertCircle className="w-5 h-5 shrink-0 text-blue-600" />
          <p>
            Download the template for your desired Roster Group and Date Range. Edit the Excel file by placing Duty Codes on the required dates, then upload it back to automatically create draft assignments. <strong>Note: Past dates will be ignored.</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Roster Group">
            <Select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              required
              disabled={isProcessing}
            >
              <option value="">Select a Group...</option>
              {rosterGroups.map(rg => (
                <option key={rg.id} value={rg.id}>{rg.name}</option>
              ))}
            </Select>
          </FormField>

          <div className="flex gap-2">
            <FormField label="Start Date">
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                required
                disabled={isProcessing}
              />
            </FormField>
            <FormField label="End Date">
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                required
                disabled={isProcessing}
              />
            </FormField>
          </div>
        </div>

        {uploadError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-xs font-bold">
            Error: {uploadError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={isProcessing || !selectedGroupId}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>

          <div className="flex-1 relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              disabled={isProcessing || !selectedGroupId}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              id="roster-upload"
            />
            <Button
              type="button"
              disabled={isProcessing || !selectedGroupId}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Upload Roster
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
