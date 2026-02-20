'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreEntry(entry: Entry, q: string): number {
  const w = entry.word.toLowerCase();
  const d = entry.description.toLowerCase();
  if (w === q)          return 100;
  if (w.startsWith(q))  return 80;
  if (w.includes(q))    return 60;
  if (d.includes(q))    return 30;
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
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{
          width: 6, height: 6,
          background: i < level ? 'var(--color-gold-03)' : 'var(--color-white-04)',
          borderRadius: 1,
          transition: 'background 0.1s',
        }} />
      ))}
    </div>
  );
}

function ToneBadge({ tone }: { tone: string }) {
  return (
    <span style={{
      fontFamily: '"Courier New", monospace',
      fontSize: '0.55rem',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      padding: '0.15rem 0.45rem',
      border: '2px solid var(--color-purple-04)',
      borderRadius: 2,
      color: 'var(--color-purple-04)',
      background: 'var(--color-white-02)',
      whiteSpace: 'nowrap',
    }}>
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
          <mark key={i} style={{ background: 'var(--color-white-03)', color: 'var(--color-purple-01)', fontStyle: 'inherit', borderRadius: 2, padding: '0 2px' }}>
            {part}
          </mark>
        ) : part
      )}
    </>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────
function ResultCard({ id, word, description, tags, tone, rarity_level, query }: Entry & { query: string }) {
  return (
    <div
      style={{
        background: 'white',
        border: '3px solid var(--color-purple-04)',
        borderRadius: 2,
        padding: '1.25rem 1.5rem',
        boxShadow: '4px 4px 0 var(--color-white-04)',
        transition: 'box-shadow 0.15s, transform 0.15s',
        position: 'relative',
        cursor: 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
      }}
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
      <div style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, background: 'var(--color-gold-03)' }} />

      {/* word + tone */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <a href={`/entries/${id}`} style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-purple-01)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            <Highlight text={word} query={query} />
          </span>
        </a>
        <ToneBadge tone={tone} />
      </div>

      {/* description */}
      <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.9rem', color: 'var(--color-black-01)', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
        "<Highlight text={description} query={query} />"
      </p>

      {/* rarity + tags */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
        <RarityPips level={rarity_level} />
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {tags.map(tag => (
              <span key={tag} style={{
                fontFamily: '"Courier New", monospace',
                fontSize: '0.55rem',
                letterSpacing: '0.1em',
                padding: '0.1rem 0.4rem',
                background: 'var(--color-white-01)',
                border: '1px solid var(--color-white-04)',
                borderRadius: 2,
                color: 'var(--color-gray-02)',
              }}>
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
  const bar = (w: string, h = 11, delay = '0s') => (
    <div style={{ width: w, height: h, background: 'var(--color-white-04)', borderRadius: 2, animation: `shimmer 1.4s ease ${delay} infinite alternate` }} />
  );
  return (
    <div style={{ background: 'white', border: '3px solid var(--color-white-04)', borderRadius: 2, padding: '1.25rem 1.5rem', boxShadow: '4px 4px 0 var(--color-white-04)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        {bar('80px', 18)}
        {bar('50px', 14, '0.2s')}
      </div>
      {bar('100%', 11, '0.1s')}
      {bar('72%',  11, '0.3s')}
      <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ width: 6, height: 6, background: 'var(--color-white-04)', borderRadius: 1 }} />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <div style={{ fontFamily: '"Courier New", monospace', fontSize: '3rem', marginBottom: '1rem', opacity: 0.2, userSelect: 'none' }}>◇</div>
      <p style={{ fontFamily: '"Courier New", monospace', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-purple-04)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
        No entry found for "{query}"
      </p>
      <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--color-gray-01)', margin: 0 }}>
        Perhaps it hasn't been sufficiently overexplained yet.
      </p>
    </div>
  );
}

function ErrorState() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <div style={{ fontFamily: '"Courier New", monospace', fontSize: '3rem', marginBottom: '1rem', opacity: 0.25, userSelect: 'none' }}>▲</div>
      <p style={{ fontFamily: '"Courier New", monospace', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-red-01)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
        Database error
      </p>
      <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--color-gray-01)', margin: 0 }}>
        Something went wrong fetching from Supabase. Check your connection.
      </p>
    </div>
  );
}

function IdleState() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <div style={{ fontFamily: '"Courier New", monospace', fontSize: '3rem', marginBottom: '1rem', opacity: 0.2, userSelect: 'none' }}>▓</div>
      <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--color-gray-01)', margin: 0 }}>
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
    supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => { if (count !== null) setTotal(count); });
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (!q) { setResults([]); setStatus('idle'); return; }

    setStatus('loading');

    debounceRef.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from('entries')
        .select('id, word, description, tags, language, tone, rarity_level, created_at')
        .or(`word.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(50);

      if (error) { console.error(error); setStatus('error'); return; }

      setResults(data ?? []);
      setStatus('done');
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
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
        .result-item { animation: slide-up 0.22s ease both; }
        .result-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.85rem;
        }
        @media (min-width: 640px) {
          .result-grid { grid-template-columns: 1fr 1fr; }
        }
        .sort-btn {
          font-family: "Courier New", monospace;
          font-size: 0.6rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 0.3rem 0.7rem;
          border: 2px solid var(--color-white-04);
          border-radius: 2px;
          cursor: pointer;
          background: white;
          color: var(--color-gray-01);
          transition: all 0.1s;
        }
        .sort-btn:hover  { border-color: var(--color-purple-04); color: var(--color-purple-04); }
        .sort-btn.active { background: var(--color-purple-01); border-color: var(--color-purple-01); color: white; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, var(--color-white-06) 0%, var(--color-white-02) 45%, var(--color-white-05) 100%)',
        fontFamily: '"Courier New", monospace',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* dot grid */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: 'radial-gradient(circle, rgba(109,6,177,0.09) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, width: '100%', margin: '0 auto', padding: '2.5rem 2rem', flex: 1 }}>

          {/* HEADER */}
          <div style={{ marginBottom: '2.5rem' }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: '"Courier New", monospace', fontWeight: 900, fontSize: '1rem', color: 'var(--color-purple-01)', letterSpacing: '-0.02em', display: 'inline-block', marginBottom: '1.75rem' }}>
                ← LISHNIY
              </span>
            </a>
            <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.6rem)', fontWeight: 900, color: 'var(--color-purple-01)', textTransform: 'uppercase', letterSpacing: '-0.03em', textShadow: '3px 3px 0 var(--color-white-04)', margin: '0 0 0.3rem 0' }}>
              SEARCH
            </h1>
            <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--color-gray-01)', margin: 0 }}>
              {total !== null ? `${total} entries. All unnecessary. All correct.` : 'Loading entries…'}
            </p>
          </div>

          {/* SEARCH BAR */}
          <div style={{ marginBottom: '1.5rem' }}>
            <SearchBar value={query} onChange={setQuery} placeholder="search for a word or concept..." size="lg" autoFocus />
          </div>

          {/* SORT + COUNT ROW */}
          {hasQuery && status === 'done' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--color-gray-01)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'no results'}
              </span>
              {results.length > 0 && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {([
                    ['relevance', '◎ best match'],
                    ['az',        'A→Z'],
                    ['za',        'Z→A'],
                    ['rarity',    '◆ rarity'],
                  ] as [SortMode, string][]).map(([m, label]) => (
                    <button key={m} className={`sort-btn${sort === m ? ' active' : ''}`} onClick={() => setSort(m)}>
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

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Footer bg="transparent" />
        </div>
      </div>
    </>
  );
}