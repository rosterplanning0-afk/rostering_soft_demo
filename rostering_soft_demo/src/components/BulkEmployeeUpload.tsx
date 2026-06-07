'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Modal from '@/components/Modal';
import { Button } from '@/components/FormField';
import { Employee, Department, Designation, RosterGroup } from '@/types';
import locationsData from '@/data/locations.json';
import { Download, Upload, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface BulkEmployeeUploadProps {
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

export default function BulkEmployeeUpload({
  open,
  onClose,
  onSuccess,
  employees,
  departments,
  designations,
  rosterGroups,
}: BulkEmployeeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validGenders = ['male', 'female', 'other'];
  const validLocations = locationsData.location_info.all_locations.map(l => l.location_name);

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Template
    const templateHeaders = [
      'Employee ID*',
      'First Name*',
      'Last Name*',
      'Gender',
      'Address',
      'Department*',
      'Designation*',
      'Roster Group',
      'Joining Date (YYYY-MM-DD)*',
      'Resigned Date (YYYY-MM-DD)',
      'Relieved Date (YYYY-MM-DD)',
      'Nearby Station',
      'Assigned Station',
    ];
    const wsTemplate = XLSX.utils.aoa_to_sheet([templateHeaders]);
    // Adjust column widths
    wsTemplate['!cols'] = templateHeaders.map(h => ({ wch: Math.max(h.length, 15) }));
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template');

    // Sheet 2: Reference Data
    const maxRows = Math.max(
      departments.length,
      designations.length,
      rosterGroups.length,
      validLocations.length,
      validGenders.length
    );

    const refData: string[][] = [['Departments', 'Designations', 'Roster Groups', 'Genders', 'Stations']];
    
    for (let i = 0; i < maxRows; i++) {
      refData.push([
        departments[i]?.name || '',
        designations[i]?.name || '',
        rosterGroups[i]?.name || '',
        validGenders[i] || '',
        validLocations[i] || '',
      ]);
    }

    const wsRef = XLSX.utils.aoa_to_sheet(refData);
    wsRef['!cols'] = [
      { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 25 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRef, 'Reference Data');

    XLSX.writeFile(wb, 'Employee_Bulk_Upload_Template.xlsx');
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
    // Handle Excel serial date
    if (typeof val === 'number') {
      const date = new Date((val - (25567 + 2)) * 86400 * 1000); // Excel epoch adjustment
      return date.toISOString().split('T')[0];
    }
    // Handle string date (assume YYYY-MM-DD or parseable)
    if (typeof val === 'string') {
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
      // Use Uint8Array to be absolutely safe across all browser versions of xlsx
      const wb = XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true });
      
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      // Skip the header row
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
      
      if (!rows || rows.length < 2) {
        setErrors([{ row: 0, message: `File is empty or missing data rows. Checked sheet: '${sheetName}', found ${rows?.length || 0} row(s). Make sure you fill the first sheet.` }]);
        setUploading(false);
        return;
      }

      const payload: Record<string, unknown>[] = [];
      const newErrors: ValidationError[] = [];

      // Check existing IDs to prevent duplicates in the same file
      const seenEmpIds = new Set<string>();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        // Skip empty rows
        if (!row || row.length === 0 || row.every((c: unknown) => !c)) continue;

        const empId = String(row[0] || '').trim();
        const firstName = String(row[1] || '').trim();
        const lastName = String(row[2] || '').trim();
        const genderRaw = String(row[3] || '').trim().toLowerCase();
        const address = String(row[4] || '').trim();
        const deptName = String(row[5] || '').trim();
        const desigName = String(row[6] || '').trim();
        const rosterName = String(row[7] || '').trim();
        const joinDate = parseDate(row[8]);
        const resignDate = parseDate(row[9]);
        const relieveDate = parseDate(row[10]);
        const nearbyStn = String(row[11] || '').trim();
        const assignedStn = String(row[12] || '').trim();

        let rowHasError = false;
        const addError = (msg: string) => {
          newErrors.push({ row: i + 1, message: msg });
          rowHasError = true;
        };

        if (!empId) addError('Employee ID is required.');
        if (!firstName) addError('First Name is required.');
        if (!lastName) addError('Last Name is required.');
        if (!deptName) addError('Department is required.');
        if (!desigName) addError('Designation is required.');
        if (!joinDate) addError('Valid Joining Date is required (YYYY-MM-DD).');

        // Check if employee ID exists in DB
        if (empId && employees.some(e => e.employee_id === empId)) {
          addError(`Employee ID '${empId}' already exists in the system.`);
        }
        if (empId && seenEmpIds.has(empId)) {
          addError(`Employee ID '${empId}' is duplicated in the file.`);
        }
        seenEmpIds.add(empId);

        // Maps and validations
        let department_id = null;
        if (deptName) {
          const dept = departments.find(d => d.name.toLowerCase() === deptName.toLowerCase());
          if (dept) department_id = dept.id;
          else addError(`Department '${deptName}' is invalid.`);
        }

        let designation_id = null;
        if (desigName) {
          const desig = designations.find(d => d.name.toLowerCase() === desigName.toLowerCase());
          if (desig) designation_id = desig.id;
          else addError(`Designation '${desigName}' is invalid.`);
        }

        let roster_group_id = null;
        if (rosterName) {
          const rg = rosterGroups.find(r => r.name.toLowerCase() === rosterName.toLowerCase());
          if (rg) roster_group_id = rg.id;
          else addError(`Roster Group '${rosterName}' is invalid.`);
        }

        let gender = null;
        if (genderRaw) {
          if (validGenders.includes(genderRaw)) gender = genderRaw;
          else addError(`Gender '${genderRaw}' is invalid. Allowed: male, female, other.`);
        }

        if (nearbyStn && !validLocations.some(l => l.toLowerCase() === nearbyStn.toLowerCase())) {
          addError(`Nearby Station '${nearbyStn}' is invalid.`);
        }

        if (assignedStn && !validLocations.some(l => l.toLowerCase() === assignedStn.toLowerCase())) {
          addError(`Assigned Station '${assignedStn}' is invalid.`);
        }

        if (!rowHasError) {
          payload.push({
            employee_id: empId,
            first_name: firstName,
            last_name: lastName,
            address: address || null,
            gender: gender || null,
            department_id,
            designation_id,
            joining_date: joinDate,
            resigned_date: resignDate || null,
            relieved_date: relieveDate || null,
            nearby_station: nearbyStn || null,
            assigned_station: assignedStn || null,
            roster_group_id: roster_group_id || null,
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
      const response = await fetch('/api/employees/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok) {
        setErrors([{ row: 0, message: resData.error || 'Server error occurred during upload.' }]);
      } else {
        setSuccessMessage(`Successfully uploaded ${resData.count} employee(s).`);
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
    <Modal open={open} onClose={onClose} title="Bulk Upload Employees">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-border dark:border-white/10">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">1. Download Template</h3>
            <p className="text-sm text-slate-500 mt-1">Get the Excel template with reference data.</p>
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
