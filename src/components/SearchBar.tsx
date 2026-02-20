'use client';

import { useState, useRef } from 'react';

interface SearchBarProps {
  value?: string;
  onChange?: (val: string) => void;
  onSubmit?: (val: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  autoFocus?: boolean;
}

const sizeMap = {
  sm: { fontSize: '0.8rem',  padding: '0.55rem 1rem',    iconSize: 14 },
  md: { fontSize: '0.9rem',  padding: '0.75rem 1.25rem', iconSize: 16 },
  lg: { fontSize: '1.1rem',  padding: '1rem 1.5rem',     iconSize: 20 },
};

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'look up a word...',
  size = 'md',
  autoFocus = false,
}: SearchBarProps) {
  const [internal, setInternal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  const controlled = value !== undefined;
  const query = controlled ? value : internal;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setInternal(e.target.value);
    onChange?.(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSubmit?.(query);
    if (e.key === 'Escape') {
      if (!controlled) setInternal('');
      onChange?.('');
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    if (!controlled) setInternal('');
    onChange?.('');
    inputRef.current?.focus();
  };

  const s = sizeMap[size];

  return (
    <>
      <style>{`
        .lish-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .lish-search-input {
          width: 100%;
          font-family: "Courier New", monospace;
          font-weight: 600;
          background: white;
          border: 3px solid var(--color-purple-04);
          border-radius: 2px;
          color: var(--color-black-01);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-shadow: 4px 4px 0 var(--color-white-04);
        }
        .lish-search-input::placeholder { color: var(--color-gray-01); opacity: 0.7; font-style: italic; }
        .lish-search-input:focus {
          border-color: var(--color-purple-01);
          box-shadow: 4px 4px 0 var(--color-purple-04);
        }
        .lish-search-icon {
          position: absolute;
          left: 14px;
          color: var(--color-purple-04);
          pointer-events: none;
          transition: color 0.15s;
        }
        .lish-search-input:focus ~ .lish-search-icon,
        .lish-search-wrap:focus-within .lish-search-icon {
          color: var(--color-purple-01);
        }
        .lish-search-clear {
          position: absolute;
          right: 10px;
          background: var(--color-white-04);
          border: none;
          border-radius: 2px;
          width: 20px; height: 20px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          font-family: "Courier New", monospace;
          font-size: 0.65rem;
          font-weight: 900;
          color: var(--color-purple-04);
          transition: background 0.1s, color 0.1s;
        }
        .lish-search-clear:hover { background: var(--color-purple-01); color: white; }
      `}</style>

      <div className="lish-search-wrap">
        {/* search icon */}
        <svg
          className="lish-search-icon"
          width={s.iconSize}
          height={s.iconSize}
          viewBox="0 0 16 16"
          fill="none"
          style={{ pointerEvents: 'none' }}
        >
          <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="2" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
        </svg>

        <input
          ref={inputRef}
          className="lish-search-input"
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          spellCheck={false}
          autoComplete="off"
          style={{
            fontSize: s.fontSize,
            padding: s.padding,
            paddingLeft: `${s.iconSize + 24}px`,
            paddingRight: query ? '36px' : s.padding.split(' ')[1],
          }}
        />

        {/* clear button */}
        {query && (
          <button className="lish-search-clear" onClick={handleClear} tabIndex={-1} aria-label="Clear search">
            ✕
          </button>
        )}
      </div>
    </>
  );
}