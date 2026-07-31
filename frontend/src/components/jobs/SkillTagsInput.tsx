import { KeyboardEvent, useState } from 'react';

interface SkillTagsInputProps {
  value: string[];
  onChange: (skills: string[]) => void;
  placeholder?: string;
}

export default function SkillTagsInput({ value, onChange, placeholder = 'Type a skill and press Enter' }: SkillTagsInputProps) {
  const [input, setInput] = useState('');

  const addSkill = (raw: string) => {
    const skill = raw.trim();
    if (!skill) return;
    const exists = value.some((s) => s.toLowerCase() === skill.toLowerCase());
    if (!exists) onChange([...value, skill]);
    setInput('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(input);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="text-sm text-slate-600 mb-1 block">Skills</label>
      <div className="border rounded-lg px-3 py-2 flex flex-wrap gap-2 min-h-[42px] focus-within:ring-2 focus-within:ring-teal-500">
        {value.map((skill, idx) => (
          <span
            key={`${skill}-${idx}`}
            className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 text-sm px-2 py-0.5 rounded-full"
          >
            {skill}
            <button type="button" onClick={() => remove(idx)} className="text-teal-600 hover:text-teal-900" aria-label={`Remove ${skill}`}>
              ×
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[120px] outline-none text-sm py-0.5"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => addSkill(input)}
          placeholder={value.length === 0 ? placeholder : ''}
        />
      </div>
      <p className="text-xs text-slate-400 mt-1">Press Enter or comma to add each skill.</p>
    </div>
  );
}
