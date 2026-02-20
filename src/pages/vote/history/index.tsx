'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import Footer from '@/components/Footer';
import { getCache, CACHE_KEYS, TTL, setCache } from '@/utils/cache';

// ─── Types ────────────────────────────────────────────────────────────────────
interface VoteHistoryRow {
  id: string;
  entry_id: string;
  total_votes: number;
  upvotes: number;
  downvotes: number;
  final_score: number;
  started_at: string | null;
  ended_at: string | null;
  archived_at: string | null;
  entry: {
    id: string;
    word: string;
    description: string;
    tone: string;
    rarity_level: number;
  };
}

type SortMode = 'newest' | 'oldest' | 'most_votes' | 'highest_score' | 'lowest_score';
type FilterMode = 'all' | 'approved' | 'rejected';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function applySort(rows: VoteHistoryRow[], sort: SortMode): VoteHistoryRow[] {
  const c = [...rows];
  if (sort === 'newest')       return c.sort((a, b) => new Date(b.ended_at ?? 0).getTime() - new Date(a.ended_at ?? 0).getTime());
  if (sort === 'oldest')       return c.sort((a, b) => new Date(a.ended_at ?? 0).getTime() - new Date(b.ended_at ?? 0).getTime());
  if (sort === 'most_votes')   return c.sort((a, b) => b.total_votes - a.total_votes);
  if (sort === 'highest_score') return c.sort((a, b) => b.final_score - a.final_score);
  if (sort === 'lowest_score') return c.sort((a, b) => a.final_score - b.final_score);
  return c;
}

function applyFilter(rows: VoteHistoryRow[], filter: FilterMode): VoteHistoryRow[] {
  if (filter === 'approved') return rows.filter(r => r.final_score > 0);
  if (filter === 'rejected') return rows.filter(r => r.final_score <= 0);
  return rows;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MiniBar({ upvotes, downvotes }: { upvotes: number; downvotes: number }) {
  const total = upvotes + downvotes;
  const upPct = total === 0 ? 50 : Math.round((upvotes / total) * 100);
  return (
    <div>
      <div style={{ display: 'flex', height: 6, borderRadius: 1, overflow: 'hidden', background: 'var(--color-white-04)' }}>
        <div style={{ width: `${upPct}%`, background: 'var(--color-emerald-07)', transition: 'width 0.4s ease' }} />
        <div style={{ width: `${100 - upPct}%`, background: 'var(--color-red-03)', opacity: 0.55 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.52rem', color: 'var(--color-emerald-03)', letterSpacing: '0.08em' }}>▲ {upvotes}</span>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.52rem', color: 'var(--color-red-02)', letterSpacing: '0.08em' }}>{downvotes} ▼</span>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const positive = score > 0;
  const neutral  = score === 0;
  const bg     = positive ? 'var(--color-emerald-07)' : neutral ? 'var(--color-white-04)' : 'rgba(210,17,13,0.12)';
  const border = positive ? 'var(--color-emerald-03)' : neutral ? 'var(--color-gray-01)' : 'var(--color-red-03)';
  const color  = positive ? 'var(--color-emerald-03)' : neutral ? 'var(--color-gray-01)' : 'var(--color-red-02)';

  return (
    <span style={{
      fontFamily: '"Courier New", monospace',
      fontWeight: 900,
      fontSize: '0.7rem',
      letterSpacing: '0.08em',
      padding: '0.2rem 0.55rem',
      border: `2px solid ${border}`,
      borderRadius: 2,
      background: bg,
      color,
      whiteSpace: 'nowrap',
    }}>
      {positive ? '+' : ''}{score}
    </span>
  );
}

function HistoryCard({ row }: { row: VoteHistoryRow }) {
  const upPct = row.total_votes === 0 ? 50 : Math.round((row.upvotes / row.total_votes) * 100);

  return (
    <div style={{
      background: 'white',
      border: '3px solid var(--color-purple-04)',
      borderRadius: 2,
      padding: '1.25rem 1.5rem',
      boxShadow: '4px 4px 0 var(--color-white-04)',
      transition: 'box-shadow 0.15s, transform 0.15s',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.65rem',
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
      {/* gold corner */}
      <div style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, background: 'var(--color-gold-03)' }} />

      {/* word row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <a href={`/entries/${row.entry.id}`} style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: '"Courier New", monospace',
            fontSize: '1.15rem', fontWeight: 900,
            color: 'var(--color-purple-01)', letterSpacing: '-0.02em',
          }}>
            {row.entry.word}
          </span>
        </a>
        <ScoreBadge score={row.final_score} />
      </div>

      {/* description */}
      <p style={{
        fontFamily: 'Georgia, serif', fontStyle: 'italic',
        fontSize: '0.85rem', color: 'var(--color-black-01)',
        lineHeight: 1.6, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        "{row.entry.description}"
      </p>

      {/* vote bar */}
      <MiniBar upvotes={row.upvotes} downvotes={row.downvotes} />

      {/* meta strip */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem',
        paddingTop: '0.5rem', borderTop: '1px solid var(--color-white-04)',
      }}>
        <div style={{ display: 'flex', gap: '0.85rem' }}>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.55rem', color: 'var(--color-gray-01)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {row.total_votes} vote{row.total_votes !== 1 ? 's' : ''}
          </span>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.55rem', color: 'var(--color-gray-01)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {upPct}% approval
          </span>
        </div>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.52rem', color: 'var(--color-gray-01)', letterSpacing: '0.08em' }}>
          {fmt(row.ended_at)}
        </span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  const bar = (w: string, h = 11, delay = '0s') => (
    <div style={{ width: w, height: h, background: 'var(--color-white-04)', borderRadius: 2, animation: `shimmer 1.4s ease ${delay} infinite alternate` }} />
  );
  return (
    <div style={{ background: 'white', border: '3px solid var(--color-white-04)', borderRadius: 2, padding: '1.25rem 1.5rem', boxShadow: '4px 4px 0 var(--color-white-04)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>{bar('40%', 18)} {bar('14%', 22, '0.1s')}</div>
      {bar('100%', 11, '0.1s')} {bar('80%', 11, '0.2s')}
      {bar('100%', 6, '0.15s')}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--color-white-04)' }}>
        {bar('30%', 10, '0.2s')} {bar('20%', 10, '0.3s')}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function VoteHistory() {
  const [rows,   setRows]   = useState<VoteHistoryRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [sort,   setSort]   = useState<SortMode>('newest');
  const [filter, setFilter] = useState<FilterMode>('all');

  useEffect(() => {
    const fetchHistory = async () => {
      // Try cache first
      const cached = getCache<VoteHistoryRow[]>(CACHE_KEYS.VOTE_HISTORY, TTL.VOTE_HISTORY);
      if (cached) {
        setRows(cached);
        setStatus('done');
      }

      // Fetch fresh
      const { data, error } = await supabase
        .from('vote_history')
        .select(`
          id, entry_id, total_votes, upvotes, downvotes, final_score,
          started_at, ended_at, archived_at,
          entry:entries ( id, word, description, tone, rarity_level )
        `)
        .order('ended_at', { ascending: false });

      if (error) {
        if (!cached) setStatus('error');
      } else {
        const rows = (data ?? []) as unknown as VoteHistoryRow[];
        setRows(rows);
        setCache(CACHE_KEYS.VOTE_HISTORY, rows);
        setStatus('done');
      }
    };

    fetchHistory();
  }, []);
  const processed = applySort(applyFilter(rows, filter), sort);

  // aggregate stats
  const totalVotesCast = rows.reduce((s, r) => s + r.total_votes, 0);
  const approvedCount  = rows.filter(r => r.final_score > 0).length;
  const rejectedCount  = rows.filter(r => r.final_score <= 0).length;

  return (
    <>
      <style>{`
        @keyframes shimmer { from { opacity: 0.5; } to { opacity: 1; } }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .hist-item { animation: slide-up 0.22s ease both; }
        .hist-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.85rem;
        }
        @media (min-width: 640px) { .hist-grid { grid-template-columns: 1fr 1fr; } }

        .ctrl-btn {
          font-family: "Courier New", monospace;
          font-size: 0.58rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 0.28rem 0.65rem;
          border: 2px solid var(--color-white-04);
          border-radius: 2px;
          cursor: pointer;
          background: white;
          color: var(--color-gray-01);
          transition: all 0.1s;
          white-space: nowrap;
        }
        .ctrl-btn:hover  { border-color: var(--color-purple-04); color: var(--color-purple-04); }
        .ctrl-btn.active { background: var(--color-purple-01); border-color: var(--color-purple-01); color: white; }
        .ctrl-btn.emerald.active { background: var(--color-emerald-03); border-color: var(--color-emerald-03); color: white; }
        .ctrl-btn.red.active     { background: var(--color-red-02);     border-color: var(--color-red-02);     color: white; }
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

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, width: '100%', margin: '0 auto', padding: '2.5rem 2rem', flex: 1 }}>

          {/* ── HEADER ── */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <a href="/" style={{ textDecoration: 'none' }}>
                <span style={{ fontFamily: '"Courier New", monospace', fontWeight: 900, fontSize: '1rem', color: 'var(--color-purple-01)', letterSpacing: '-0.02em' }}>
                  ← LISHNIY
                </span>
              </a>
              <button
                onClick={() => { window.location.href = '/vote/now'; }}
                style={{
                  fontFamily: '"Courier New", monospace', fontWeight: 700,
                  fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase',
                  cursor: 'pointer', border: '2px solid var(--color-emerald-03)', borderRadius: 2,
                  padding: '0.45rem 0.9rem', background: 'var(--color-emerald-03)', color: 'white',
                  boxShadow: '3px 3px 0 var(--color-emerald-05)', transition: 'transform 0.1s, box-shadow 0.1s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 var(--color-emerald-05)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translate(0,0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0 var(--color-emerald-05)';
                }}
              >
                ▲ Vote Now
              </button>
            </div>

            <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.6rem)', fontWeight: 900, color: 'var(--color-purple-01)', textTransform: 'uppercase', letterSpacing: '-0.03em', textShadow: '3px 3px 0 var(--color-white-04)', margin: '0 0 0.3rem 0' }}>
              VOTE HISTORY
            </h1>
            <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--color-gray-01)', margin: 0 }}>
              Every word that faced the jury. Every verdict that followed.
            </p>
          </div>

          {/* ── STATS STRIP ── */}
          {status === 'done' && rows.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', marginBottom: '1.75rem' }}>
              {[
                { label: 'Sessions',    val: rows.length         },
                { label: 'Votes Cast',  val: totalVotesCast      },
                { label: 'Approved',    val: `${approvedCount}↑ / ${rejectedCount}↓` },
              ].map(({ label, val }) => (
                <div key={label} style={{
                  background: 'white', border: '2px solid var(--color-white-04)', borderRadius: 2,
                  padding: '0.85rem 1rem', textAlign: 'center', boxShadow: '3px 3px 0 var(--color-white-04)',
                }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--color-purple-01)', letterSpacing: '-0.02em', marginBottom: '0.15rem' }}>{val}</div>
                  <div style={{ fontSize: '0.52rem', color: 'var(--color-gray-01)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── CONTROLS ── */}
          {status === 'done' && rows.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '1.25rem' }}>

              {/* filter */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {([
                  ['all',      'All',      ''],
                  ['approved', 'Approved', 'emerald'],
                  ['rejected', 'Rejected', 'red'],
                ] as [FilterMode, string, string][]).map(([f, label, cls]) => (
                  <button
                    key={f}
                    className={`ctrl-btn ${cls} ${filter === f ? 'active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {label} {f === 'all' ? `(${rows.length})` : f === 'approved' ? `(${approvedCount})` : `(${rejectedCount})`}
                  </button>
                ))}
              </div>

              {/* sort */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {([
                  ['newest',        'Newest'],
                  ['oldest',        'Oldest'],
                  ['most_votes',    'Most Votes'],
                  ['highest_score', 'Top Score'],
                ] as [SortMode, string][]).map(([s, label]) => (
                  <button
                    key={s}
                    className={`ctrl-btn ${sort === s ? 'active' : ''}`}
                    onClick={() => setSort(s)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STATES ── */}
          {status === 'loading' && (
            <div className="hist-grid">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1rem', userSelect: 'none' }}>▲</div>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-red-01)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Failed to load history
              </p>
              <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--color-gray-01)', margin: 0 }}>
                Supabase returned an error. Check your connection.
              </p>
            </div>
          )}

          {status === 'done' && rows.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1rem', userSelect: 'none' }}>◇</div>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-purple-04)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                No history yet
              </p>
              <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--color-gray-01)', margin: 0 }}>
                No votes have been archived yet. Be the first to judge a word.
              </p>
            </div>
          )}

          {status === 'done' && processed.length === 0 && rows.length > 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--color-gray-01)', margin: 0 }}>
                No entries match this filter.
              </p>
            </div>
          )}

          {status === 'done' && processed.length > 0 && (
            <div className="hist-grid">
              {processed.map((row, i) => (
                <div key={row.id} className="hist-item" style={{ animationDelay: `${i * 0.035}s` }}>
                  <HistoryCard row={row} />
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