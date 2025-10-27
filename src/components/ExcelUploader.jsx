import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function ExcelUploader({ onDataLoaded, headers, rowCount }) {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const onFileChange = async (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
      setError('Please select an Excel file (.xlsx or .xls)');
      return;
    }
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const hdrs = rows.length > 0 ? Object.keys(rows[0]) : [];
      setFileName(file.name);
      onDataLoaded(rows, hdrs);
    } catch (err) {
      console.error(err);
      setError('Failed to parse the Excel file.');
    }
  };

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">2. Upload Data (Excel)</h2>
        {fileName && <div className="text-xs text-gray-500">{fileName}</div>}
      </div>
      <input
        className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        type="file"
        accept=".xlsx,.xls"
        onChange={onFileChange}
      />
      {error && <div className="text-sm text-red-600">{error}</div>}

      {headers?.length > 0 && (
        <div className="text-sm space-y-1">
          <div className="font-medium">Detected columns:</div>
          <div className="flex flex-wrap gap-2">
            {headers.map((h) => (
              <span key={h} className="inline-flex items-center rounded-full bg-green-50 text-green-800 px-2.5 py-0.5 text-xs border border-green-100">{h}</span>
            ))}
          </div>
          <div className="text-gray-500">Rows: {rowCount ?? 0}</div>
        </div>
      )}
    </div>
  );
}
