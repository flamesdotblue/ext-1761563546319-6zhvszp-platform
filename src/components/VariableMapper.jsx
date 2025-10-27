import React from 'react';

export default function VariableMapper({ placeholders, headers, mapping, onChange }) {
  const update = (ph, col) => {
    onChange({ ...mapping, [ph]: col });
  };

  return (
    <div className="bg-white rounded-xl border p-5">
      <h2 className="font-semibold mb-4">3. Map Template Variables to Excel Columns</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {placeholders.map((ph) => (
          <div key={ph} className="flex items-center gap-3">
            <div className="w-40 text-sm font-medium truncate">{`{${ph}}`}</div>
            <select
              className="flex-1 rounded-md border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
              value={mapping[ph] || ''}
              onChange={(e) => update(ph, e.target.value)}
            >
              <option value="">Select column</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
