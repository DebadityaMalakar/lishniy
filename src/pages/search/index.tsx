'use client';

import { useState, useEffect, useRef } from 'react';
import SearchBar from '@/components/SearchBar';
import Footer from '@/components/Footer';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Entry {
  id: string;
  word: string;
  description: string;
  tags: string[];
  language: string;
  tone: string;
  rarity_level: number;
  created_at: string;
}

type SortMode = 'relevance' | 'az' | 'za' | 'rarity';
type Status   = 'idle' | 'loading' | 'done' | 'error';

// ─── API Client ───────────────────────────────────────────────────────────────
const api = {
  async getTotalCount() {
    const res = await fetch('/api/supabase/route?table=entries&count=true');
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to fetch count');
    }
    const { count } = await res.json();
    return count;
  },

  async searchEntries(query: string) {
    const res = await fetch(
      `/api/supabase/route?table=entries&select=id,word,description,tags,language,tone,rarity_level,created_at&limit=50&filter_word__ilike=%${encodeURIComponent(query)}%&filter_description__ilike=%${encodeURIComponent(query)}%`
    );
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to search entries');
    }
    const { data } = await res.json();
    return data;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreEntry(entry: Entry, q: string): number {
  const w = entry.word.toLowerCase();
  const d = entry.description.toLowerCase();
  const query = q.toLowerCase();
  if (w === query)          return 100;
  if (w.startsWith(query))  return 80;
  if (w.includes(query))    return 60;
  if (d.includes(query))    return 30;
  return 0;
}

function applySort(entries: Entry[], q: string, sort: SortMode): Entry[] {
  const clone = [...entries];
  if (sort === 'az')      return clone.sort((a, b) => a.word.localeCompare(b.word));
  if (sort === 'za')      return clone.sort((a, b) => b.word.localeCompare(a.word));
  if (sort === 'rarity')  return clone.sort((a, b) => b.rarity_level - a.rarity_level);
  return clone.sort((a, b) => scoreEntry(b, q) - scoreEntry(a, q));
}

// Rarity: 1–10 → render N filled diamonds
function RarityPips({ level }: { level: number }) {
  return (
    <div className="pips-container">
      {Array.from({ length: 10 }).map((_, i) => (
        <div 
          key={i} 
          className={`pip ${i < level ? 'filled' : ''}`} 
          style={{ 
            width: 6, 
            height: 6,
            transition: 'background 0.1s'
          }} 
        />
      ))}
    </div>
  );
}

function ToneBadge({ tone }: { tone: string }) {
  return (
    <span className="badge-tone">
      {tone}
    </span>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="highlight">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────
function ResultCard({ id, word, description, tags, tone, rarity_level, query }: Entry & { query: string }) {
  return (
    <div 
      className="result-card"
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 var(--color-purple-04)';
        (e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0 var(--color-white-04)';
        (e.currentTarget as HTMLElement).style.transform = 'translate(0,0)';
      }}
    >
      {/* gold corner pip */}
      <div className="corner-gold" style={{ width: 9, height: 9 }} />

      {/* word + tone */}
      <div className="result-card-header">
        <a href={`/entries/${id}`} className="result-card-link">
          <span className="result-card-word">
            <Highlight text={word} query={query} />
          </span>
        </a>
        <ToneBadge tone={tone} />
      </div>

      {/* description */}
      <p className="result-card-description">
        "<Highlight text={description} query={query} />"
      </p>

      {/* rarity + tags */}
      <div className="result-card-footer">
        <RarityPips level={rarity_level} />
        {tags.length > 0 && (
          <div className="tags-container">
            {tags.map(tag => (
              <span key={tag} className="badge-tag">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-title" style={{ width: 80, height: 18 }} />
        <div className="skeleton-tone" style={{ width: 50, height: 14 }} />
      </div>
      <div className="skeleton-line" style={{ width: '100%', height: 11 }} />
      <div className="skeleton-line" style={{ width: '72%', height: 11 }} />
      <div className="skeleton-pips">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton-pip" style={{ width: 6, height: 6 }} />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" style={{ fontSize: '3rem' }}>◇</div>
      <p className="empty-state-title">
        No entry found for "{query}"
      </p>
      <p className="empty-state-description">
        Perhaps it hasn't been sufficiently overexplained yet.
      </p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon error" style={{ fontSize: '3rem' }}>▲</div>
      <p className="empty-state-title error">
        Database error
      </p>
      <p className="empty-state-description">
        Something went wrong fetching from Supabase. Check your connection.
      </p>
    </div>
  );
}

function IdleState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" style={{ fontSize: '3rem' }}>▓</div>
      <p className="empty-state-description">
        Type something. Any word. Even "blob."
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<Entry[]>([]);
  const [total,   setTotal]   = useState<number | null>(null);
  const [status,  setStatus]  = useState<Status>('idle');
  const [sort,    setSort]    = useState<SortMode>('relevance');
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasQuery = query.trim().length > 0;

  // Total entry count once on mount
  useEffect(() => {
    api.getTotalCount()
      .then(count => setTotal(count))
      .catch(err => console.error('Failed to fetch total count:', err));
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (!q) { 
      setResults([]); 
      setStatus('idle'); 
      return; 
    }

    setStatus('loading');

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.searchEntries(q);
        setResults(data ?? []);
        setStatus('done');
      } catch (error) {
        console.error(error);
        setStatus('error');
      }
    }, 300);

    return () => { 
      if (debounceRef.current) clearTimeout(debounceRef.current); 
    };
  }, [query]);

  const sorted = hasQuery && results.length > 0
    ? applySort(results, query.trim(), sort)
    : results;

  return (
    <>
      <style>{`
        @keyframes shimmer {
          from { opacity: 0.5; }
          to   { opacity: 1;   }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      <div className="search-page-wrapper">
        {/* dot grid */}
        <div className="bg-dot-grid" />

        <div className="search-content">

          {/* HEADER */}
          <div className="search-header">
            <a href="/" className="back-link">
              ← LISHNIY
            </a>
            <h1 className="search-title">
              SEARCH
            </h1>
            <p className="search-subtitle">
              {total !== null ? `${total} entries. All unnecessary. All correct.` : 'Loading entries…'}
            </p>
          </div>

          {/* SEARCH BAR */}
          <div className="search-bar-wrapper">
            <SearchBar value={query} onChange={setQuery} placeholder="search for a word or concept..." size="lg" autoFocus />
          </div>

          {/* SORT + COUNT ROW */}
          {hasQuery && status === 'done' && (
            <div className="sort-row">
              <span className="result-count">
                {results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'no results'}
              </span>
              {results.length > 0 && (
                <div className="sort-buttons">
                  {([
                    ['relevance', '◎ best match'],
                    ['az',        'A→Z'],
                    ['za',        'Z→A'],
                    ['rarity',    '◆ rarity'],
                  ] as [SortMode, string][]).map(([m, label]) => (
                    <button 
                      key={m} 
                      className={`sort-btn ${sort === m ? 'active' : ''}`} 
                      onClick={() => setSort(m)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STATES */}
          {status === 'idle'    && <IdleState />}
          {status === 'error'   && <ErrorState />}
          {status === 'loading' && (
            <div className="result-grid">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
          {status === 'done' && results.length === 0 && <EmptyState query={query.trim()} />}
          {status === 'done' && sorted.length > 0 && (
            <div className="result-grid">
              {sorted.map((entry, i) => (
                <div key={entry.id} className="result-item" style={{ animationDelay: `${i * 0.04}s` }}>
                  <ResultCard {...entry} query={query.trim()} />
                </div>
              ))}
            </div>
          )}

        </div>

        <Footer bg="transparent" />
      </div>
    </>
  );
}