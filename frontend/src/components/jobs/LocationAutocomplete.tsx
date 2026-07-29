import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Location',
  className = '',
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      api.jobs.locations(value.trim())
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (loc: string) => {
    onChange(loc);
    onSelect?.(loc);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        type="text"
        className="auth-input w-full"
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && suggestions[0]) {
            e.preventDefault();
            pick(suggestions[0]);
          }
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && value.trim() && (
        <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-naukri-border rounded-md shadow-lg max-h-48 overflow-auto">
          {loading && (
            <li className="px-3 py-2 text-sm text-naukri-muted">Searching...</li>
          )}
          {!loading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-naukri-muted">No matching locations</li>
          )}
          {!loading && suggestions.map((loc) => (
            <li key={loc}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-naukri-text"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(loc)}
              >
                {loc}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
