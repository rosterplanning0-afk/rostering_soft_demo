const XLSX = require('xlsx');

try {
  const filePath = 'C:\\Users\\BangeraP\\OneDrive - DB E.C.O. Group\\Desktop\\Employee_Bulk_Upload_Template.xlsx';
  const wb = XLSX.readFile(filePath, { cellDates: true });
  
  console.log('Sheet Names:', wb.SheetNames);
  
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log(`Total rows in ${sheetName}:`, rows.length);
  
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    console.log(`Row ${i}:`, rows[i]);
  }
} catch (e) {
  console.error('Error reading file:', e);
}
