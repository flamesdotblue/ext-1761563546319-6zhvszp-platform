import React, { useState } from 'react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

function extractPlaceholdersFromDocx(arrayBuffer) {
  try {
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    const fullText = doc.getFullText ? doc.getFullText() : '';
    const set = new Set();
    const regex = /\{\s*([A-Za-z0-9_\.]+)\s*\}/g;
    let m;
    while ((m = regex.exec(fullText)) !== null) {
      set.add(m[1]);
    }
    return Array.from(set);
  } catch (e) {
    console.error('Failed to parse docx:', e);
    return [];
  }
}

export default function TemplateUploader({ onTemplateLoaded, placeholders }) {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const onFileChange = async (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setError('Please select a .docx file');
      return;
    }
    try {
      const ab = await file.arrayBuffer();
      const detected = extractPlaceholdersFromDocx(ab);
      setFileName(file.name);
      onTemplateLoaded(ab, detected);
    } catch (err) {
      console.error(err);
      setError('Failed to read template.');
    }
  };

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">1. Upload Word Template (.docx)</h2>
        {fileName && <div className="text-xs text-gray-500">{fileName}</div>}
      </div>
      <input
        className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        type="file"
        accept=".docx"
        onChange={onFileChange}
      />
      {error && <div className="text-sm text-red-600">{error}</div>}

      {placeholders?.length > 0 && (
        <div className="text-sm">
          <div className="font-medium mb-1">Detected placeholders:</div>
          <div className="flex flex-wrap gap-2">
            {placeholders.map((p) => (
              <span key={p} className="inline-flex items-center rounded-full bg-blue-50 text-blue-800 px-2.5 py-0.5 text-xs border border-blue-100">{p}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
