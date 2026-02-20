'use client';

import { useState, useEffect, useCallback } from 'react';
import Footer from '@/components/Footer';
import { CACHE_KEYS, getCache, setCache, TTL } from '@/utils/cache';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Entry {
  id: string;
  word: string;
  description: string;
  tone: string;
  rarity_level: number;
  tags: string[];
}

interface VoteSession {
  id: string;
  entry_id: string;
  started_at: string;
  ends_at: string | null;
  is_active: boolean;
  entry: Entry;
}

interface VoteCounts {
  up: number;
  down: number;
}

type PageStatus = 'loading' | 'active' | 'ended' | 'no_vote' | 'error';
type VoteStatus = 'idle' | 'submitting' | 'voted';

// ─── API Client ───────────────────────────────────────────────────────────────
const api = {
  async getActiveVote() {
    // Fetch the current active vote (only where is_active = true)
    const voteRes = await fetch('/api/supabase/route?table=current_vote&select=id,entry_id,started_at,ends_at,is_active&is_active=true&orderBy=started_at&orderDirection=desc&limit=1');
    if (!voteRes.ok) {
      const error = await voteRes.json();
      throw new Error(error.error || 'Failed to fetch active vote');
    }
    const { data: voteData } = await voteRes.json();
    
    if (!voteData || voteData.length === 0) return null;
    
    const vote = voteData[0];
    
    // Check if the session has ended (if ends_at is in the past)
    if (vote.ends_at && new Date(vote.ends_at) < new Date()) {
      return { ...vote, is_active: false, has_ended: true };
    }
    
    // Fetch the associated entry
    const entryRes = await fetch(`/api/supabase/route?table=entries&select=id,word,description,tone,rarity_level,tags&id=${vote.entry_id}`);
    if (!entryRes.ok) {
      const error = await entryRes.json();
      throw new Error(error.error || 'Failed to fetch entry');
    }
    const { data: entryData } = await entryRes.json();
    
    return {
      ...vote,
      entry: entryData[0]
    };
  },

  async getVoteCounts(sessionId: string) {
    const res = await fetch(`/api/supabase/route?table=votes&select=vote_value&filter_vote_session_id__eq=${sessionId}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to fetch vote counts');
    }
    const { data } = await res.json();
    return data;
  },

  async submitVote(sessionId: string, value: number) {
    const res = await fetch('/api/supabase/route?table=votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'insert',
        data: { vote_session_id: sessionId, vote_value: value }
      })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to submit vote');
    }
    const { data } = await res.json();
    return data;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const VOTED_KEY = (sessionId: string) => `lishniy_voted_${sessionId}`;

function getStoredVote(sessionId: string): number | null {
  try {
    const v = localStorage.getItem(VOTED_KEY(sessionId));
    return v ? parseInt(v) : null;
  } catch { return null; }
}

function storeVote(sessionId: string, value: number) {
  try { localStorage.setItem(VOTED_KEY(sessionId), String(value)); } catch {}
}

function useCountdown(endsAt: string | null, onEnd?: () => void) {
  const [remaining, setRemaining] = useState<string | null>(null);
  const [hasEnded, setHasEnded] = useState(false);

  useEffect(() => {
    if (!endsAt) return;
    
    const checkEnd = () => {
      const now = Date.now();
      const endTime = new Date(endsAt).getTime();
      const diff = endTime - now;
      
      if (diff <= 0) { 
        setRemaining('Ended');
        if (!hasEnded) {
          setHasEnded(true);
          onEnd?.();
        }
        return;
      }
      
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    
    checkEnd();
    const id = setInterval(checkEnd, 1000);
    return () => clearInterval(id);
  }, [endsAt, onEnd, hasEnded]);

  return { remaining, hasEnded };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function RarityPips({ level }: { level: number }) {
  return (
    <div className="pips-container">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className={`pip ${i < level ? 'filled' : ''}`} style={{ width: 7, height: 7 }} />
      ))}
    </div>
  );
}

function VoteBar({ up, down, userVote }: { up: number; down: number; userVote: number | null }) {
  const total = up + down;
  const upPct = total === 0 ? 50 : Math.round((up / total) * 100);
  const downPct = 100 - upPct;

  return (
    <div className="vote-bar">
      <div className="vote-bar-track">
        <div 
          className="vote-bar-fill vote-bar-up"
          style={{ 
            width: `${upPct}%`,
            background: userVote === 1 ? 'var(--color-emerald-02)' : 'var(--color-emerald-07)'
          }} 
        />
        <div 
          className="vote-bar-fill vote-bar-down"
          style={{ 
            width: `${downPct}%`,
            background: userVote === -1 ? 'var(--color-red-02)' : 'var(--color-red-03)',
            opacity: userVote === -1 ? 1 : 0.5
          }} 
        />
      </div>
      <div className="vote-bar-labels">
        <span className="vote-label-up">
          ▲ {up} ({upPct}%)
        </span>
        <span className="vote-label-down">
          {downPct}% ({down}) ▼
        </span>
      </div>
    </div>
  );
}

function VoteButton({
  direction, onClick, disabled, active, loading,
}: {
  direction: 'up' | 'down';
  onClick: () => void;
  disabled: boolean;
  active: boolean;
  loading: boolean;
}) {
  const isUp = direction === 'up';
  const activeClass = isUp ? 'vote-btn-up-active' : 'vote-btn-down-active';
  const idleClass = 'vote-btn-idle';

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`vote-btn ${active ? activeClass : idleClass} ${loading ? 'vote-btn-loading' : ''}`}
      onMouseEnter={e => {
        if (!disabled && !loading) {
          (e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)';
          (e.currentTarget as HTMLElement).style.boxShadow = active
            ? isUp 
              ? '7px 7px 0 var(--color-emerald-05)'
              : '7px 7px 0 var(--color-red-01)'
            : '6px 6px 0 var(--color-white-04)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translate(0,0)';
        (e.currentTarget as HTMLElement).style.boxShadow = active
          ? isUp
            ? '5px 5px 0 var(--color-emerald-05)'
            : '5px 5px 0 var(--color-red-01)'
          : '4px 4px 0 var(--color-white-04)';
      }}
    >
      <span className="vote-btn-icon">{isUp ? '▲' : '▼'}</span>
      <span className="vote-btn-label">
        {loading ? '…' : isUp ? 'YES' : 'NAH'}
      </span>
    </button>
  );
}

function Skeleton() {
  return (
    <div className="skeleton-vote-card">
      <div className="skeleton-vote-word" />
      <div className="divider-white" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
      <div className="skeleton-line shorter" />
      <div className="skeleton-vote-buttons">
        <div className="skeleton-vote-btn" />
        <div className="skeleton-vote-btn" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function VoteNow() {
  const [session,    setSession]    = useState<VoteSession | null>(null);
  const [counts,     setCounts]     = useState<VoteCounts>({ up: 0, down: 0 });
  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [voteStatus, setVoteStatus] = useState<VoteStatus>('idle');
  const [userVote,   setUserVote]   = useState<number | null>(null);
  const [toast,      setToast]      = useState({ visible: false, message: '' });

  const handleSessionEnd = useCallback(() => {
    if (session) {
      setPageStatus('ended');
      showToast('Voting session has ended ▲');
    }
  }, [session]);

  const { remaining, hasEnded } = useCountdown(
    session?.ends_at ?? null, 
    handleSessionEnd
  );

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2400);
  };

  // Fetch vote counts for a session
  const fetchCounts = useCallback(async (sessionId: string) => {
    try {
      const data = await api.getVoteCounts(sessionId);
      setCounts({
        up: data.filter((v: any) => v.vote_value === 1).length,
        down: data.filter((v: any) => v.vote_value === -1).length,
      });
    } catch (error) {
      console.error('Failed to fetch vote counts:', error);
    }
  }, []);

  // Load active session + entry
  useEffect(() => {
    let isMounted = true;

    const loadActiveVote = async () => {
      try {
        // Try cache first
        const cached = getCache<any>(CACHE_KEYS.ACTIVE_VOTE, TTL.ACTIVE_VOTE);
        if (cached && isMounted) {
          // Check if cached session is still active and not ended
          if (cached.is_active && (!cached.ends_at || new Date(cached.ends_at) > new Date())) {
            setSession(cached);
            setPageStatus('active');
            
            const stored = getStoredVote(cached.id);
            if (stored !== null) {
              setUserVote(stored);
              setVoteStatus('voted');
            }
            
            fetchCounts(cached.id);
          }
        }

        // Fetch fresh data
        const data = await api.getActiveVote();
        
        if (!isMounted) return;

        if (!data) {
          setPageStatus('no_vote');
          return;
        }

        // Check if the session has ended (either by is_active=false or ends_at passed)
        if (!data.is_active || data.has_ended) {
          setPageStatus('ended');
          return;
        }

        setSession(data);
        setCache(CACHE_KEYS.ACTIVE_VOTE, data);
        setPageStatus('active');

        // Check if already voted this session
        const stored = getStoredVote(data.id);
        if (stored !== null) {
          setUserVote(stored);
          setVoteStatus('voted');
        }

        fetchCounts(data.id);
      } catch (error) {
        console.error('Failed to load active vote:', error);
        if (isMounted) setPageStatus('error');
      }
    };

    loadActiveVote();

    return () => {
      isMounted = false;
    };
  }, [fetchCounts]);

  // Polling for live vote updates (only if session is active)
  useEffect(() => {
    if (!session || pageStatus !== 'active' || voteStatus !== 'idle') return;

    const interval = setInterval(() => {
      fetchCounts(session.id);
    }, 3000);

    return () => clearInterval(interval);
  }, [session, fetchCounts, voteStatus, pageStatus]);

  const handleVote = async (value: 1 | -1) => {
    // Don't allow voting if session is not active
    if (!session || pageStatus !== 'active' || voteStatus !== 'idle') {
      showToast('Voting is not available at this time ▲');
      return;
    }

    // Double-check if session is still active
    if (!session.is_active || (session.ends_at && new Date(session.ends_at) < new Date())) {
      setPageStatus('ended');
      showToast('Voting session has ended ▲');
      return;
    }

    setVoteStatus('submitting');

    try {
      await api.submitVote(session.id, value);

      storeVote(session.id, value);
      setUserVote(value);
      setVoteStatus('voted');
      fetchCounts(session.id);
      showToast(value === 1 ? 'Voted ▲ — word approved!' : 'Voted ▼ — duly noted.');
    } catch (error) {
      console.error('Vote failed:', error);
      showToast('Vote failed — try again ▲');
      setVoteStatus('idle');
    }
  };

  const total = counts.up + counts.down;

  return (
    <>
      <div className="page-wrapper vote-page-wrapper">
        <div className="bg-dot-grid" />

        <div className="vote-container">
          <div className="vote-header">
            <div>
              <a href="/" className="back-link">
                ← LISHNIY
              </a>
              <div className="vote-title-container">
                <h1 className="vote-title">
                  VOTE
                </h1>
                {pageStatus === 'active' && <span className="live-dot" />}
              </div>
              <p className="vote-subtitle">
                {pageStatus === 'active' 
                  ? 'Should this word make the cut?' 
                  : pageStatus === 'ended'
                  ? 'This voting session has ended'
                  : 'Check back for new words to vote on'}
              </p>
            </div>

            <button
              onClick={() => { window.location.href = '/vote/history'; }}
              className="history-btn"
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 var(--color-purple-04)';
                (e.currentTarget as HTMLElement).style.background = 'var(--color-purple-01)';
                (e.currentTarget as HTMLElement).style.color = 'white';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-purple-01)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translate(0,0)';
                (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0 var(--color-white-04)';
                (e.currentTarget as HTMLElement).style.background = 'white';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-purple-04)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-purple-04)';
              }}
            >
              ◎ Vote History
            </button>
          </div>

          {pageStatus === 'loading' && <Skeleton />}

          {pageStatus === 'no_vote' && (
            <div className="empty-state">
              <div className="empty-state-icon">◇</div>
              <p className="empty-state-title">
                No active vote
              </p>
              <p className="empty-state-description">
                Nothing to vote on right now. Check back soon.
              </p>
            </div>
          )}

          {pageStatus === 'ended' && (
            <div className="empty-state">
              <div className="empty-state-icon">◈</div>
              <p className="empty-state-title">
                Voting session ended
              </p>
              <p className="empty-state-description">
                This voting period has concluded. Check the history to see the results.
              </p>
              <button
                onClick={() => { window.location.href = '/vote/history'; }}
                className="btn-primary btn-large"
                style={{ marginTop: '1.5rem' }}
              >
                View Vote History
              </button>
            </div>
          )}

          {pageStatus === 'error' && (
            <div className="empty-state">
              <div className="empty-state-icon error">▲</div>
              <p className="empty-state-title error">
                Failed to load
              </p>
              <p className="empty-state-description">
                Something went wrong. Check your connection.
              </p>
            </div>
          )}

          {pageStatus === 'active' && session && (
            <div className="vote-card">
              <div className="vote-session-meta">
                <span className="vote-session-label">
                  ► ACTIVE VOTE SESSION
                </span>
                <div className="vote-session-stats">
                  {remaining && remaining !== 'Ended' && (
                    <span className="vote-countdown">
                      ⏱ {remaining}
                    </span>
                  )}
                  <span className="vote-total">
                    {total} vote{total !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="vote-entry-card">
                <div className="corner-gold-md" />
                <div className="corner-gold-md-bottom" />

                <div className="vote-entry-header">
                  <h2 className="vote-entry-word">
                    {session.entry.word}
                  </h2>
                  {session.entry.tone && (
                    <span className="badge-tone vote-entry-tone">
                      {session.entry.tone}
                    </span>
                  )}
                </div>

                <div className="divider-gradient vote-divider" />

                <p className="vote-entry-description">
                  "{session.entry.description}"
                </p>

                <div className="vote-entry-footer">
                  <RarityPips level={session.entry.rarity_level} />
                  {session.entry.tags?.length > 0 && (
                    <div className="tags-container">
                      {session.entry.tags.map(tag => (
                        <span key={tag} className="badge-tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="vote-entry-link">
                  <a href={`/entries/${session.entry.id}`} className="vote-entry-link-text">
                    VIEW FULL ENTRY →
                  </a>
                </div>
              </div>

              {total > 0 && (
                <div className="vote-bar-container">
                  <VoteBar up={counts.up} down={counts.down} userVote={userVote} />
                </div>
              )}

              {voteStatus === 'voted' ? (
                <div className={`vote-confirmation ${userVote === 1 ? 'vote-confirmation-up' : 'vote-confirmation-down'}`}>
                  <div className="vote-confirmation-icon">
                    {userVote === 1 ? '▲' : '▼'}
                  </div>
                  <p className={`vote-confirmation-text ${userVote === 1 ? 'text-emerald' : 'text-red'}`}>
                    {userVote === 1 ? 'You voted YES — word approved' : 'You voted NAH — noted'}
                  </p>
                  <p className="vote-confirmation-subtext">
                    Come back for the next vote.
                  </p>
                </div>
              ) : (
                <div className="vote-actions">
                  <div className="vote-prompt">
                    Does this word deserve to exist?
                  </div>
                  <div className="vote-buttons">
                    <VoteButton
                      direction="up"
                      onClick={() => handleVote(1)}
                      disabled={voteStatus !== 'idle'}
                      active={userVote === 1}
                      loading={voteStatus === 'submitting'}
                    />
                    <VoteButton
                      direction="down"
                      onClick={() => handleVote(-1)}
                      disabled={voteStatus !== 'idle'}
                      active={userVote === -1}
                      loading={voteStatus === 'submitting'}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Footer bg="transparent" />

        <div className={`toast ${toast.visible ? 'visible' : ''}`}>
          {toast.message}
        </div>
      </div>
    </>
  );
}