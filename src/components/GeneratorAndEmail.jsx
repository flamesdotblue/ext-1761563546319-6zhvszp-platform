import React, { useMemo, useState } from 'react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import emailjs from 'emailjs-com';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function GeneratorAndEmail({ templateArrayBuffer, placeholders, mapping, excelData }) {
  const [status, setStatus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedRows, setSelectedRows] = useState('all');

  const [emailColumn, setEmailColumn] = useState('');
  const [emailSubject, setEmailSubject] = useState('Your generated document');
  const [emailMessage, setEmailMessage] = useState('Please find your document attached.');

  const [emailJsService, setEmailJsService] = useState('');
  const [emailJsTemplate, setEmailJsTemplate] = useState('');
  const [emailJsPublicKey, setEmailJsPublicKey] = useState('');

  const columns = useMemo(() => (excelData.length > 0 ? Object.keys(excelData[0]) : []), [excelData]);

  const rowIndices = useMemo(() => {
    if (selectedRows === 'all') return excelData.map((_, i) => i);
    const parts = selectedRows
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const set = new Set();
    for (const p of parts) {
      if (p.includes('-')) {
        const [a, b] = p.split('-').map((n) => parseInt(n, 10));
        if (!Number.isNaN(a) && !Number.isNaN(b)) {
          for (let i = Math.min(a, b); i <= Math.max(a, b); i++) set.add(i - 1);
        }
      } else {
        const idx = parseInt(p, 10);
        if (!Number.isNaN(idx)) set.add(idx - 1);
      }
    }
    return Array.from(set).filter((i) => i >= 0 && i < excelData.length).sort((a, b) => a - b);
  }, [selectedRows, excelData.length]);

  const generateForRow = (row) => {
    const data = {};
    for (const ph of placeholders) {
      const col = mapping[ph];
      data[ph] = col ? row[col] : '';
    }
    const zip = new PizZip(templateArrayBuffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.setData(data);
    doc.render();
    const out = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    return out;
  };

  const handleDownload = async () => {
    setStatus('');
    setGenerating(true);
    try {
      if (rowIndices.length === 1) {
        const blob = generateForRow(excelData[rowIndices[0]]);
        const baseName = excelData[rowIndices[0]][mapping[placeholders[0]]] || 'document';
        saveAs(blob, `${sanitizeFileName(baseName || 'document')}.docx`);
      } else {
        // multiple: download each sequentially with an index
        for (let i = 0; i < rowIndices.length; i++) {
          const idx = rowIndices[i];
          const blob = generateForRow(excelData[idx]);
          const baseName = excelData[idx][mapping[placeholders[0]]] || `document_${idx + 1}`;
          saveAs(blob, `${sanitizeFileName(baseName)}.docx`);
        }
      }
      setStatus('Download complete');
    } catch (e) {
      console.error(e);
      setStatus('Failed to generate documents');
    } finally {
      setGenerating(false);
    }
  };

  const handleEmail = async () => {
    setStatus('');
    if (!emailJsService || !emailJsTemplate || !emailJsPublicKey) {
      setStatus('Please provide EmailJS configuration');
      return;
    }
    if (!emailColumn) {
      setStatus('Please choose the email column from Excel');
      return;
    }
    setGenerating(true);
    try {
      let successCount = 0;
      let failCount = 0;
      for (const idx of rowIndices) {
        const row = excelData[idx];
        const toEmail = String(row[emailColumn] || '').trim();
        if (!toEmail) { failCount++; continue; }
        const blob = generateForRow(row);
        const base64 = await blobToBase64(blob);
        const filenameBase = row[mapping[placeholders[0]]] || `document_${idx + 1}`;
        const filename = `${sanitizeFileName(filenameBase)}.docx`;
        const params = {
          to_email: toEmail,
          subject: emailSubject,
          message: emailMessage,
          // The field name "attachment" is expected to be configured in your EmailJS template as a text area
          // with dynamic variable. EmailJS will treat base64 with prefix if needed, here we pass raw base64 data
          // and filename which are supported in many EmailJS setups.
          attachment: base64,
          attachment_filename: filename,
        };
        try {
          await emailjs.send(emailJsService, emailJsTemplate, params, emailJsPublicKey);
          successCount++;
        } catch (err) {
          console.error('Email send failed for', toEmail, err);
          failCount++;
        }
      }
      setStatus(`Email finished. Success: ${successCount}, Failed: ${failCount}`);
    } catch (e) {
      console.error(e);
      setStatus('Failed while emailing');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border p-5 space-y-6">
      <h2 className="font-semibold">4. Generate and Send</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Rows to process</label>
          <input
            type="text"
            className="w-full rounded-md border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
            value={selectedRows}
            onChange={(e) => setSelectedRows(e.target.value)}
            placeholder="all or e.g. 1-5,8,12"
          />
          <div className="text-xs text-gray-500">Use 1-based indices. Default: all rows.</div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Email column in Excel</label>
          <select
            className="w-full rounded-md border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
            value={emailColumn}
            onChange={(e) => setEmailColumn(e.target.value)}
          >
            <option value="">Select email column</option>
            {columns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">File name seed</label>
          <input
            type="text"
            className="w-full rounded-md border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
            value={placeholders[0] || ''}
            readOnly
          />
          <div className="text-xs text-gray-500">Uses first mapped variable for filename</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Email subject</label>
          <input
            type="text"
            className="w-full rounded-md border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium">Email message</label>
          <input
            type="text"
            className="w-full rounded-md border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">EmailJS Service ID</label>
          <input
            type="text"
            className="w-full rounded-md border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
            value={emailJsService}
            onChange={(e) => setEmailJsService(e.target.value)}
            placeholder="service_xxx"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">EmailJS Template ID</label>
          <input
            type="text"
            className="w-full rounded-md border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
            value={emailJsTemplate}
            onChange={(e) => setEmailJsTemplate(e.target.value)}
            placeholder="template_xxx"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">EmailJS Public Key</label>
          <input
            type="text"
            className="w-full rounded-md border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
            value={emailJsPublicKey}
            onChange={(e) => setEmailJsPublicKey(e.target.value)}
            placeholder="public_xxx"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleDownload}
          disabled={generating}
          className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate and Download'}
        </button>
        <button
          onClick={handleEmail}
          disabled={generating}
          className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {generating ? 'Sending…' : 'Generate and Email'}
        </button>
        {status && <div className="text-sm text-gray-600 py-2">{status}</div>}
      </div>
    </div>
  );
}

function sanitizeFileName(name) {
  return String(name).replace(/[^a-z0-9-_\.]/gi, '_').slice(0, 80);
}
