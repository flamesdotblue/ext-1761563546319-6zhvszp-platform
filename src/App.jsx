import React, { useState, useMemo } from 'react';
import TemplateUploader from './components/TemplateUploader';
import ExcelUploader from './components/ExcelUploader';
import VariableMapper from './components/VariableMapper';
import GeneratorAndEmail from './components/GeneratorAndEmail';

export default function App() {
  const [templateArrayBuffer, setTemplateArrayBuffer] = useState(null);
  const [placeholders, setPlaceholders] = useState([]);

  const [excelData, setExcelData] = useState([]); // array of rows
  const [excelHeaders, setExcelHeaders] = useState([]); // header names

  const [mapping, setMapping] = useState({}); // { placeholder: excelHeader }

  const isReadyToMap = useMemo(() => templateArrayBuffer && placeholders.length > 0 && excelHeaders.length > 0, [templateArrayBuffer, placeholders, excelHeaders]);
  const isReadyToGenerate = useMemo(() => isReadyToMap && Object.keys(mapping).length === placeholders.length, [isReadyToMap, mapping, placeholders]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Word + Excel Mail Merge with Email</h1>
          <div className="text-sm text-gray-500">Generate .docx from Excel and send via email</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TemplateUploader
            onTemplateLoaded={(ab, detected) => {
              setTemplateArrayBuffer(ab);
              setPlaceholders(detected);
            }}
            placeholders={placeholders}
          />

          <ExcelUploader
            onDataLoaded={(rows, headers) => {
              setExcelData(rows);
              setExcelHeaders(headers);
            }}
            headers={excelHeaders}
            rowCount={excelData.length}
          />
        </section>

        {isReadyToMap && (
          <section>
            <VariableMapper
              placeholders={placeholders}
              headers={excelHeaders}
              mapping={mapping}
              onChange={setMapping}
            />
          </section>
        )}

        {isReadyToGenerate && (
          <section>
            <GeneratorAndEmail
              templateArrayBuffer={templateArrayBuffer}
              placeholders={placeholders}
              mapping={mapping}
              excelData={excelData}
            />
          </section>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-gray-500">Built for streamlined mail merge workflows</footer>
    </div>
  );
}
