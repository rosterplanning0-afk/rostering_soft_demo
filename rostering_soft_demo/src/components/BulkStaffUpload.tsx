'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Modal from '@/components/Modal';
import { Button } from '@/components/FormField';
import { Profile, Employee, Department, Designation, RosterGroup, UserRole } from '@/types';
import { Download, Upload, AlertCircle, CheckCircle2, X, Info } from 'lucide-react';

interface BulkStaffUploadProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employees: Employee[];
  departments: Department[];
  designations: Designation[];
  rosterGroups: RosterGroup[];
}

interface ValidationError {
  row: number;
  message: string;
}

export default function BulkStaffUpload({
  open,
  onClose,
  onSuccess,
  employees,
  departments,
  designations,
  rosterGroups,
}: BulkStaffUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [creationMode, setCreationMode] = useState<'both' | 'login_only'>('both');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validGenders = ['male', 'female', 'other'];

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Template
    const templateHeaders = [
      'Full Name*',
      'Email*',
      'Password (Leave blank for DBrrts@123)',
      'Employee ID*',
      'Department*',
      'Designation*',
      'Roster Group',
      'Joining Date (DD-MM-YYYY)*',
      'Gender'
    ];
    const wsTemplate = XLSX.utils.aoa_to_sheet([templateHeaders]);
    wsTemplate['!cols'] = templateHeaders.map(h => ({ wch: Math.max(h.length, 20) }));
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template');

    // Sheet 2: Reference Data
    const maxRows = Math.max(
      departments.length,
      designations.length,
      rosterGroups.length,
      validGenders.length
    );

    const refData: string[][] = [['Departments', 'Designations', 'Roster Groups', 'Genders']];
    
    for (let i = 0; i < maxRows; i++) {
      refData.push([
        departments[i]?.name || '',
        designations[i]?.name || '',
        rosterGroups[i]?.name || '',
        validGenders[i] || '',
      ]);
    }

    const wsRef = XLSX.utils.aoa_to_sheet(refData);
    wsRef['!cols'] = [
      { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRef, 'Reference Data');

    XLSX.writeFile(wb, 'Staff_Bulk_Upload_Template.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrors([]);
      setSuccessMessage('');
    }
  };

  const parseDate = (val: unknown): string | null => {
    if (!val) return null;
    if (val instanceof Date) {
      if (!isNaN(val.getTime())) {
        const offset = val.getTimezoneOffset() * 60000;
        return new Date(val.getTime() - offset).toISOString().split('T')[0];
      }
    }
    if (typeof val === 'number') {
      const date = new Date((val - (25567 + 2)) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    if (typeof val === 'string') {
      // Handle DD-MM-YYYY or DD/MM/YYYY
      const parts = val.trim().split(/[-/]/);
      if (parts.length === 3 && parts[0].length <= 2) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
          return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    return null;
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setErrors([]);
    setSuccessMessage('');

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true });
      
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
      
      if (!rows || rows.length < 2) {
        setErrors([{ row: 0, message: `File is empty or missing data rows. Checked sheet: '${sheetName}', found ${rows?.length || 0} row(s). Make sure you fill the first sheet.` }]);
        setUploading(false);
        return;
      }

      if (rows.length - 1 > 30) {
        setErrors([{ row: 0, message: `Maximum limit exceeded! Please upload a maximum of 30 staff members at once. Found ${rows.length - 1} entries.` }]);
        setUploading(false);
        return;
      }

      const payload: Record<string, unknown>[] = [];
      const newErrors: ValidationError[] = [];
      const seenEmails = new Set<string>();
      const seenEmpIds = new Set<string>();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || row.every((c: unknown) => !c)) continue;

        const fullName = String(row[0] || '').trim();
        const email = String(row[1] || '').trim().toLowerCase();
        let password = String(row[2] || '').trim();
        const empId = String(row[3] || '').trim();
        const deptName = String(row[4] || '').trim();
        const desigName = String(row[5] || '').trim();
        const rosterName = String(row[6] || '').trim();
        const joinDateRaw = row[7];
        const genderRaw = String(row[8] || '').trim().toLowerCase();

        if (!password) {
          password = 'DBrrts@123';
        }

        let rowHasError = false;
        const addError = (msg: string) => {
          newErrors.push({ row: i + 1, message: msg });
          rowHasError = true;
        };

        if (!fullName) addError('Full Name is required.');
        
        if (!email) {
          addError('Email is required.');
        } else {
          const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
          if (!emailRegex.test(email)) {
            addError(`Email '${email}' is invalid.`);
          }
          if (seenEmails.has(email)) {
            addError(`Email '${email}' is duplicated in the file.`);
          }
          seenEmails.add(email);
        }

        if (password.length < 6) {
          addError('Password must be at least 6 characters long.');
        }

        const role: UserRole = 'employee';

        let department_id = null;
        let designation_id = null;
        let roster_group_id = null;
        const joinDate = parseDate(joinDateRaw);
        let gender = null;

        if (!empId) addError('Employee ID is required.');
        
        if (creationMode === 'both') {
          if (!deptName) addError('Department is required.');
          if (!desigName) addError('Designation is required.');
          if (!joinDate) addError('Valid Joining Date is required (DD-MM-YYYY).');
        }

        if (empId) {
          if (creationMode === 'both' && employees.some(e => e.employee_id === empId)) {
            addError(`Employee ID '${empId}' already exists in the system.`);
          }
          if (creationMode === 'login_only' && !employees.some(e => e.employee_id === empId)) {
            addError(`Employee ID '${empId}' does not exist in the system to link.`);
          }
          if (seenEmpIds.has(empId)) {
            addError(`Employee ID '${empId}' is duplicated in the file.`);
          }
          seenEmpIds.add(empId);
        }

        if (deptName) {
          const dept = departments.find(d => d.name.toLowerCase() === deptName.toLowerCase());
          if (dept) department_id = dept.id;
          else addError(`Department '${deptName}' is invalid.`);
        }

        if (desigName) {
          const desig = designations.find(d => d.name.toLowerCase() === desigName.toLowerCase());
          if (desig) designation_id = desig.id;
          else addError(`Designation '${desigName}' is invalid.`);
        }

        if (rosterName) {
          const rg = rosterGroups.find(r => r.name.toLowerCase() === rosterName.toLowerCase());
          if (rg) roster_group_id = rg.id;
          else addError(`Roster Group '${rosterName}' is invalid.`);
        }

        if (genderRaw) {
          if (validGenders.includes(genderRaw)) gender = genderRaw;
          else addError(`Gender '${genderRaw}' is invalid.`);
        }

        if (!rowHasError) {
          payload.push({
            full_name: fullName,
            email,
            password,
            role,
            creation_mode: creationMode,
            employee_id: empId || null,
            department_id,
            designation_id,
            roster_group_id,
            joining_date: joinDate || null,
            gender: gender || null,
          });
        }
      }

      if (newErrors.length > 0) {
        setErrors(newErrors);
        setUploading(false);
        return;
      }

      if (payload.length === 0) {
        setErrors([{ row: 0, message: 'No valid data found to upload.' }]);
        setUploading(false);
        return;
      }

      // API Call
      const response = await fetch('/api/profiles/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok) {
        // If there is an array of detailed errors
        if (resData.errors && Array.isArray(resData.errors)) {
           setErrors(resData.errors.map((e: { email: string, error: string }) => ({ row: 0, message: `Email ${e.email}: ${e.error}` })));
        } else {
           setErrors([{ row: 0, message: resData.error || 'Server error occurred during upload.' }]);
        }
      } else {
        setSuccessMessage(`Successfully created ${resData.count} staff account(s).`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error processing file.';
      setErrors([{ row: 0, message: errorMessage }]);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setErrors([]);
    setSuccessMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal open={open} onClose={onClose} title="Bulk Enrol Staff">
      <div className="space-y-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-bold mb-1">Important Upload Guidelines</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>You can upload a <strong>maximum of 30 employees</strong> per file. Bulk uploading is reserved for employees only. Other roles must be created manually.</li>
              <li>If you leave the password column blank, it will default to <strong>DBrrts@123</strong>.</li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-border dark:border-white/10">
          <h3 className="font-bold text-slate-900 dark:text-white mb-3">Creation Mode</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="bulk_creation_mode" 
                value="both" 
                checked={creationMode === 'both'} 
                onChange={() => setCreationMode('both')}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Create Login & Employee Data</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="bulk_creation_mode" 
                value="login_only" 
                checked={creationMode === 'login_only'} 
                onChange={() => setCreationMode('login_only')}
                className="w-4 h-4 text-primary"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Create Login Only (Link to Existing)</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-border dark:border-white/10">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">1. Download Template</h3>
            <p className="text-sm text-slate-500 mt-1">Get the Excel template with required fields and reference data.</p>
          </div>
          <Button onClick={handleDownloadTemplate} className="gap-2 bg-white text-slate-700 hover:bg-slate-50 border border-border dark:bg-slate-800 dark:text-white dark:border-white/10 dark:hover:bg-slate-700">
            <Download className="w-4 h-4" />
            Download Excel
          </Button>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-border dark:border-white/10">
          <h3 className="font-bold text-slate-900 dark:text-white">2. Upload Filled Template</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Upload your completed .xlsx or .csv file here.</p>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-xl file:border-0
                file:text-sm file:font-semibold
                file:bg-emerald-50 file:text-emerald-700
                hover:file:bg-emerald-100
                dark:file:bg-emerald-500/10 dark:file:text-emerald-400"
              onChange={handleFileChange}
              ref={fileInputRef}
              disabled={uploading || !!successMessage}
            />
            {file && !successMessage && (
              <Button onClick={handleReset} variant="ghost" className="px-3" disabled={uploading}>
                <X className="w-4 h-4 text-slate-500" />
              </Button>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl">
            <div className="flex items-center gap-2 text-destructive font-bold mb-2">
              <AlertCircle className="w-5 h-5" />
              <span>Validation Errors Found</span>
            </div>
            <div className="max-h-40 overflow-y-auto pr-2 space-y-1">
              {errors.map((e, idx) => (
                <div key={idx} className="text-sm text-destructive/90 flex gap-2">
                  {e.row > 0 && <span className="font-mono min-w-[50px]">Row {e.row}:</span>}
                  <span>{e.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400 font-bold animate-in fade-in zoom-in-95">
            <CheckCircle2 className="w-5 h-5" />
            {successMessage}
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={uploading}>
          Cancel
        </Button>
        <Button 
          onClick={handleUpload} 
          disabled={!file || uploading || !!successMessage}
          className="bg-emerald-500 hover:bg-emerald-600 gap-2 min-w-[140px]"
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Data
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}
