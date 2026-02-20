'use client';

import { useState, useEffect } from 'react';
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

// ─── API Client ───────────────────────────────────────────────────────────────
const api = {
  async getVoteHistory() {
    // Since the proxy doesn't handle nested relationships well,
    // we need to fetch vote history and then fetch entries separately
    const historyRes = await fetch('/api/supabase/route?table=vote_history&select=id,entry_id,total_votes,upvotes,downvotes,final_score,started_at,ended_at,archived_at&orderBy=ended_at&orderDirection=desc');
    if (!historyRes.ok) {
      const error = await historyRes.json();
      throw new Error(error.error || 'Failed to fetch vote history');
    }
    const { data: historyData } = await historyRes.json();
    
    if (!historyData || historyData.length === 0) return [];
    
    // Get unique entry IDs
    const entryIds = [...new Set(historyData.map((h: any) => h.entry_id))];
    
    // Fetch all associated entries
    const entryPromises = entryIds.map(id => 
      fetch(`/api/supabase/route?table=entries&select=id,word,description,tone,rarity_level&id=${id}`)
        .then(res => res.json())
        .then(({ data }) => data[0])
    );
    
    const entries = await Promise.all(entryPromises);
    const entryMap = entries.reduce((acc: any, entry: any) => {
      if (entry) acc[entry.id] = entry;
      return acc;
    }, {});
    
    // Combine history with entries
    return historyData.map((h: any) => ({
      ...h,
      entry: entryMap[h.entry_id]
    })).filter((h: any) => h.entry); // Filter out any with missing entries
  }
};

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
    <div className="mini-bar">
      <div className="mini-bar-track">
        <div 
          className="mini-bar-fill mini-bar-up"
          style={{ width: `${upPct}%` }} 
        />
        <div 
          className="mini-bar-fill mini-bar-down"
          style={{ width: `${100 - upPct}%` }} 
        />
      </div>
      <div className="mini-bar-labels">
        <span className="mini-bar-up-label">▲ {upvotes}</span>
        <span className="mini-bar-down-label">{downvotes} ▼</span>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const positive = score > 0;
  const neutral = score === 0;
  
  let badgeClass = 'score-badge';
  if (positive) badgeClass += ' score-badge-positive';
  else if (neutral) badgeClass += ' score-badge-neutral';
  else badgeClass += ' score-badge-negative';

  return (
    <span className={badgeClass}>
      {positive ? '+' : ''}{score}
    </span>
  );
}

function HistoryCard({ row }: { row: VoteHistoryRow }) {
  const upPct = row.total_votes === 0 ? 50 : Math.round((row.upvotes / row.total_votes) * 100);

  return (
    <div 
      className="history-card"
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
      <div className="corner-gold-sm" />

      {/* word row */}
      <div className="history-card-header">
        <a href={`/entries/${row.entry.id}`} className="history-card-link">
          <span className="history-card-word">
            {row.entry.word}
          </span>
        </a>
        <ScoreBadge score={row.final_score} />
      </div>

      {/* description */}
      <p className="history-card-description">
        "{row.entry.description}"
      </p>

      {/* vote bar */}
      <MiniBar upvotes={row.upvotes} downvotes={row.downvotes} />

      {/* meta strip */}
      <div className="history-card-meta">
        <div className="history-card-stats">
          <span className="history-card-stat">
            {row.total_votes} vote{row.total_votes !== 1 ? 's' : ''}
          </span>
          <span className="history-card-stat">
            {upPct}% approval
          </span>
        </div>
        <span className="history-card-date">
          {fmt(row.ended_at)}
        </span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="skeleton-card history-skeleton">
      <div className="skeleton-header-row">
        <div className="skeleton-title-md" />
        <div className="skeleton-badge" />
      </div>
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
      <div className="skeleton-mini-bar" />
      <div className="skeleton-meta-row">
        <div className="skeleton-stat" />
        <div className="skeleton-stat-sm" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function VoteHistory() {
  const [rows, setRows] = useState<VoteHistoryRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [sort, setSort] = useState<SortMode>('newest');
  const [filter, setFilter] = useState<FilterMode>('all');

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      try {
        // Try cache first
        const cached = getCache<VoteHistoryRow[]>(CACHE_KEYS.VOTE_HISTORY, TTL.VOTE_HISTORY);
        if (cached && isMounted) {
          setRows(cached);
          setStatus('done');
        }

        // Fetch fresh
        const data = await api.getVoteHistory();

        if (!isMounted) return;

        setRows(data);
        setCache(CACHE_KEYS.VOTE_HISTORY, data);
        setStatus('done');
      } catch (error) {
        console.error('Failed to fetch vote history:', error);
        if (isMounted && rows.length === 0) {
          setStatus('error');
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [rows.length]);

  const processed = applySort(applyFilter(rows, filter), sort);

  // aggregate stats
  const totalVotesCast = rows.reduce((s, r) => s + r.total_votes, 0);
  const approvedCount = rows.filter(r => r.final_score > 0).length;
  const rejectedCount = rows.filter(r => r.final_score <= 0).length;

  return (
    <>
      <div className="page-wrapper history-page-wrapper">
        {/* dot grid */}
        <div className="bg-dot-grid" />

        <div className="history-container">
          {/* ── HEADER ── */}
          <div className="history-header">
            <div className="history-header-top">
              <a href="/" className="back-link">
                ← LISHNIY
              </a>
              <button
                onClick={() => { window.location.href = '/vote/now'; }}
                className="btn-vote-now"
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

            <h1 className="history-title">
              VOTE HISTORY
            </h1>
            <p className="history-subtitle">
              Every word that faced the jury. Every verdict that followed.
            </p>
          </div>

          {/* ── STATS STRIP ── */}
          {status === 'done' && rows.length > 0 && (
            <div className="history-stats-grid">
              {[
                { label: 'Sessions', val: rows.length },
                { label: 'Votes Cast', val: totalVotesCast },
                { label: 'Approved', val: `${approvedCount}↑ / ${rejectedCount}↓` },
              ].map(({ label, val }) => (
                <div key={label} className="history-stat-card">
                  <div className="history-stat-value">{val}</div>
                  <div className="history-stat-label">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── CONTROLS ── */}
          {status === 'done' && rows.length > 0 && (
            <div className="history-controls">
              {/* filter */}
              <div className="filter-buttons">
                {([
                  ['all', 'All', ''],
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
              <div className="sort-buttons">
                {([
                  ['newest', 'Newest'],
                  ['oldest', 'Oldest'],
                  ['most_votes', 'Most Votes'],
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
            <div className="empty-state">
              <div className="empty-state-icon error">▲</div>
              <p className="empty-state-title error">
                Failed to load history
              </p>
              <p className="empty-state-description">
                Something went wrong. Check your connection.
              </p>
            </div>
          )}

          {status === 'done' && rows.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">◇</div>
              <p className="empty-state-title">
                No history yet
              </p>
              <p className="empty-state-description">
                No votes have been archived yet. Be the first to judge a word.
              </p>
            </div>
          )}

          {status === 'done' && processed.length === 0 && rows.length > 0 && (
            <div className="empty-state small">
              <p className="empty-state-description">
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

        <Footer bg="transparent" />
      </div>
    </>
  );
}