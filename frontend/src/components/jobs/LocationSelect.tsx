import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const FALLBACK_LOCATIONS = [
  'Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata',
  'Ahmedabad', 'Gurgaon', 'Noida', 'Remote', 'Kochi', 'Jaipur', 'Chandigarh',
];

interface LocationSelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function LocationSelect({ value, onChange, required }: LocationSelectProps) {
  const [locations, setLocations] = useState<string[]>(FALLBACK_LOCATIONS);
  const [mode, setMode] = useState<'select' | 'custom'>(() =>
    value && !FALLBACK_LOCATIONS.includes(value) ? 'custom' : 'select',
  );

  useEffect(() => {
    api.jobs.allLocations().then(setLocations).catch(() => setLocations(FALLBACK_LOCATIONS));
  }, []);

  useEffect(() => {
    if (value && !locations.includes(value) && locations.length > 0) {
      setMode('custom');
    }
  }, [value, locations]);

  const inList = locations.includes(value);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          className={`text-xs px-2 py-1 rounded ${mode === 'select' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100'}`}
          onClick={() => setMode('select')}
        >
          Select location
        </button>
        <button
          type="button"
          className={`text-xs px-2 py-1 rounded ${mode === 'custom' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100'}`}
          onClick={() => setMode('custom')}
        >
          Enter custom
        </button>
      </div>
      {mode === 'select' ? (
        <select
          required={required}
          className="w-full border rounded-lg px-3 py-2"
          value={inList ? value : ''}
          onChange={(e) => {
            if (e.target.value === '__custom__') {
              setMode('custom');
              onChange('');
            } else {
              onChange(e.target.value);
            }
          }}
        >
          <option value="">Choose location</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
          <option value="__custom__">+ Other (type manually)</option>
        </select>
      ) : (
        <input
          required={required}
          placeholder="Enter city / location"
          className="w-full border rounded-lg px-3 py-2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          list="job-location-suggestions"
        />
      )}
      <datalist id="job-location-suggestions">
        {locations.map((loc) => <option key={loc} value={loc} />)}
      </datalist>
    </div>
  );
}
