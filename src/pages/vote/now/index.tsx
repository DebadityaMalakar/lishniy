'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import Footer from '@/components/Footer';

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

type PageStatus = 'loading' | 'active' | 'no_vote' | 'error';
type VoteStatus = 'idle' | 'submitting' | 'voted';

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

function useCountdown(endsAt: string | null) {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return remaining;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function RarityPips({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: 1,
          background: i < level ? 'var(--color-gold-03)' : 'var(--color-white-04)',
        }} />
      ))}
    </div>
  );
}

function VoteBar({ up, down, userVote }: { up: number; down: number; userVote: number | null }) {
  const total = up + down;
  const upPct = total === 0 ? 50 : Math.round((up / total) * 100);
  const downPct = 100 - upPct;

  return (
    <div>
      {/* bar */}
      <div style={{ display: 'flex', height: 12, borderRadius: 2, overflow: 'hidden', border: '2px solid var(--color-white-04)' }}>
        <div style={{
          width: `${upPct}%`,
          background: userVote === 1 ? 'var(--color-emerald-02)' : 'var(--color-emerald-07)',
          transition: 'width 0.5s ease',
        }} />
        <div style={{
          width: `${downPct}%`,
          background: userVote === -1 ? 'var(--color-red-02)' : 'var(--color-red-03)',
          opacity: userVote === -1 ? 1 : 0.5,
          transition: 'width 0.5s ease',
        }} />
      </div>
      {/* labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' }}>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.62rem', color: 'var(--color-emerald-03)', letterSpacing: '0.1em' }}>
          ▲ {up} ({upPct}%)
        </span>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: '0.62rem', color: 'var(--color-red-02)', letterSpacing: '0.1em' }}>
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
  const activeColor = isUp ? 'var(--color-emerald-02)' : 'var(--color-red-02)';
  const activeBorder = isUp ? 'var(--color-emerald-03)' : 'var(--color-red-03)';
  const activeShadow = isUp ? 'var(--color-emerald-05)' : 'var(--color-red-01)';
  const idleColor = 'var(--color-purple-04)';

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        flex: 1,
        fontFamily: '"Courier New", monospace',
        fontWeight: 900,
        fontSize: '1rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: `3px solid ${active ? activeBorder : 'var(--color-white-04)'}`,
        borderRadius: 2,
        padding: '1.1rem',
        background: active ? activeColor : 'white',
        color: active ? 'white' : idleColor,
        boxShadow: active ? `5px 5px 0 ${activeShadow}` : '4px 4px 0 var(--color-white-04)',
        transition: 'all 0.15s ease',
        opacity: disabled && !active ? 0.45 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
      }}
      onMouseEnter={e => {
        if (!disabled && !loading) {
          (e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)';
          (e.currentTarget as HTMLElement).style.boxShadow = active
            ? `7px 7px 0 ${activeShadow}`
            : '6px 6px 0 var(--color-white-04)';
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translate(0,0)';
        (e.currentTarget as HTMLElement).style.boxShadow = active
          ? `5px 5px 0 ${activeShadow}`
          : '4px 4px 0 var(--color-white-04)';
      }}
    >
      <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{isUp ? '▲' : '▼'}</span>
      <span style={{ fontSize: '0.65rem', letterSpacing: '0.2em' }}>
        {loading ? '…' : isUp ? 'YES' : 'NAH'}
      </span>
    </button>
  );
}

function Skeleton() {
  const bar = (w: string, h = 12, delay = '0s') => (
    <div style={{ width: w, height: h, background: 'var(--color-white-04)', borderRadius: 2, animation: `shimmer 1.4s ease ${delay} infinite alternate` }} />
  );
  return (
    <div style={{ background: 'white', border: '3px solid var(--color-white-04)', borderRadius: 2, padding: '2rem 2.25rem', boxShadow: '6px 6px 0 var(--color-white-04)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {bar('45%', 52, '0s')}
      <div style={{ height: 2, background: 'var(--color-white-04)' }} />
      {bar('100%', 12, '0.1s')}
      {bar('88%', 12, '0.2s')}
      {bar('70%', 12, '0.3s')}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        {bar('50%', 72, '0.1s')}
        {bar('50%', 72, '0.2s')}
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

  const countdown = useCountdown(session?.ends_at ?? null);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2400);
  };

  // Fetch vote counts for a session
  const fetchCounts = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('votes')
      .select('vote_value')
      .eq('vote_session_id', sessionId);

    if (data) {
      setCounts({
        up:   data.filter(v => v.vote_value === 1).length,
        down: data.filter(v => v.vote_value === -1).length,
      });
    }
  }, []);

  // Load active session + entry
  useEffect(() => {
    supabase
      .from('current_vote')
      .select(`
        id, entry_id, started_at, ends_at, is_active,
        entry:entries ( id, word, description, tone, rarity_level, tags )
      `)
      .eq('is_active', true)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setPageStatus(error?.code === 'PGRST116' ? 'no_vote' : 'error');
          return;
        }

        const s = data as unknown as VoteSession;
        setSession(s);
        setPageStatus('active');

        // Check if already voted this session
        const stored = getStoredVote(s.id);
        if (stored !== null) {
          setUserVote(stored);
          setVoteStatus('voted');
        }

        fetchCounts(s.id);
      });
  }, [fetchCounts]);

  // Realtime subscription for live vote updates
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`votes:${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'votes',
        filter: `vote_session_id=eq.${session.id}`,
      }, () => fetchCounts(session.id))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, fetchCounts]);

  const handleVote = async (value: 1 | -1) => {
    if (!session || voteStatus !== 'idle') return;
    setVoteStatus('submitting');

    const { error } = await supabase
      .from('votes')
      .insert({ vote_session_id: session.id, vote_value: value });

    if (error) {
      showToast('Vote failed — try again ▲');
      setVoteStatus('idle');
      return;
    }

    storeVote(session.id, value);
    setUserVote(value);
    setVoteStatus('voted');
    fetchCounts(session.id);
    showToast(value === 1 ? 'Voted ▲ — word approved!' : 'Voted ▼ — duly noted.');
  };

  const total = counts.up + counts.down;

  return (
    <>
      <style>{`
        @keyframes shimmer { from { opacity: 0.5; } to { opacity: 1; } }
        @keyframes pop-in {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(109,6,177,0.25); }
          70%  { box-shadow: 0 0 0 12px rgba(109,6,177,0); }
          100% { box-shadow: 0 0 0 0 rgba(109,6,177,0);    }
        }
        .vote-card { animation: pop-in 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .live-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--color-emerald-02);
          animation: pulse-ring 1.8s ease infinite;
          display: inline-block;
        }
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

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, width: '100%', margin: '0 auto', padding: '2.5rem 2rem', flex: 1 }}>

          {/* ── HEADER ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <a href="/" style={{ textDecoration: 'none' }}>
                <span style={{ fontFamily: '"Courier New", monospace', fontWeight: 900, fontSize: '1rem', color: 'var(--color-purple-01)', letterSpacing: '-0.02em', display: 'inline-block', marginBottom: '0.5rem' }}>
                  ← LISHNIY
                </span>
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.4rem)', fontWeight: 900, color: 'var(--color-purple-01)', textTransform: 'uppercase', letterSpacing: '-0.03em', textShadow: '3px 3px 0 var(--color-white-04)', margin: 0 }}>
                  VOTE
                </h1>
                {pageStatus === 'active' && <span className="live-dot" />}
              </div>
              <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.82rem', color: 'var(--color-gray-01)', margin: '0.25rem 0 0' }}>
                Should this word make the cut?
              </p>
            </div>

            {/* history button */}
            <button
              onClick={() => { window.location.href = '/vote/history'; }}
              style={{
                fontFamily: '"Courier New", monospace',
                fontWeight: 700,
                fontSize: '0.65rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                border: '2px solid var(--color-purple-04)',
                borderRadius: 2,
                padding: '0.45rem 0.9rem',
                background: 'white',
                color: 'var(--color-purple-04)',
                boxShadow: '3px 3px 0 var(--color-white-04)',
                transition: 'transform 0.1s, box-shadow 0.1s',
                alignSelf: 'flex-start',
              }}
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

          {/* ── STATES ── */}

          {pageStatus === 'loading' && <Skeleton />}

          {pageStatus === 'no_vote' && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1rem', userSelect: 'none' }}>◇</div>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-purple-04)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                No active vote
              </p>
              <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--color-gray-01)', margin: 0 }}>
                Nothing to vote on right now. Check back soon.
              </p>
            </div>
          )}

          {pageStatus === 'error' && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1rem', userSelect: 'none' }}>▲</div>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-red-01)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Failed to load
              </p>
              <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--color-gray-01)', margin: 0 }}>
                Supabase returned an error. Check your connection.
              </p>
            </div>
          )}

          {pageStatus === 'active' && session && (
            <div className="vote-card">

              {/* ── SESSION META ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-purple-06)' }}>
                  ► ACTIVE VOTE SESSION
                </span>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {countdown && (
                    <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--color-gold-04)', fontWeight: 700 }}>
                      ⏱ {countdown}
                    </span>
                  )}
                  <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--color-gray-01)', textTransform: 'uppercase' }}>
                    {total} vote{total !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* ── ENTRY CARD ── */}
              <div style={{
                background: 'white',
                border: '3px solid var(--color-purple-01)',
                borderRadius: 2,
                padding: '2rem 2.25rem',
                boxShadow: '6px 6px 0 var(--color-purple-04)',
                position: 'relative',
                marginBottom: '1.25rem',
              }}>
                {/* corner pips */}
                <div style={{ position: 'absolute', top: -3, right: -3, width: 11, height: 11, background: 'var(--color-gold-03)' }} />
                <div style={{ position: 'absolute', bottom: -3, left: -3, width: 11, height: 11, background: 'var(--color-gold-03)' }} />

                {/* word + tone */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                  <h2 style={{
                    fontFamily: '"Courier New", monospace',
                    fontSize: 'clamp(2rem, 7vw, 3.5rem)',
                    fontWeight: 900,
                    color: 'var(--color-purple-01)',
                    letterSpacing: '-0.04em',
                    textTransform: 'lowercase',
                    margin: 0,
                    lineHeight: 1,
                    textShadow: '3px 3px 0 var(--color-white-04)',
                  }}>
                    {session.entry.word}
                  </h2>
                  {session.entry.tone && (
                    <span style={{
                      fontFamily: '"Courier New", monospace',
                      fontSize: '0.58rem', letterSpacing: '0.18em',
                      textTransform: 'uppercase', padding: '0.2rem 0.55rem',
                      border: '2px solid var(--color-purple-04)', borderRadius: 2,
                      color: 'var(--color-purple-04)', background: 'var(--color-white-02)',
                      marginTop: '0.4rem',
                    }}>
                      {session.entry.tone}
                    </span>
                  )}
                </div>

                {/* divider */}
                <div style={{ height: 2, background: 'linear-gradient(90deg, var(--color-purple-01), var(--color-white-02))', margin: '1rem 0 1.25rem', borderRadius: 1 }} />

                {/* description */}
                <p style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
                  color: 'var(--color-black-01)',
                  lineHeight: 1.75, fontStyle: 'italic', margin: '0 0 1.25rem',
                }}>
                  "{session.entry.description}"
                </p>

                {/* rarity + tags */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <RarityPips level={session.entry.rarity_level} />
                  {session.entry.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {session.entry.tags.map(tag => (
                        <span key={tag} style={{
                          fontFamily: '"Courier New", monospace', fontSize: '0.55rem',
                          letterSpacing: '0.1em', padding: '0.1rem 0.4rem',
                          background: 'var(--color-white-01)', border: '1px solid var(--color-white-04)',
                          borderRadius: 2, color: 'var(--color-gray-02)',
                        }}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* link to full entry */}
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-white-04)' }}>
                  <a href={`/entries/${session.entry.id}`} style={{
                    fontFamily: '"Courier New", monospace', fontSize: '0.6rem',
                    letterSpacing: '0.15em', textTransform: 'uppercase',
                    color: 'var(--color-purple-04)', textDecoration: 'none',
                  }}>
                    VIEW FULL ENTRY →
                  </a>
                </div>
              </div>

              {/* ── VOTE BAR ── */}
              {total > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <VoteBar up={counts.up} down={counts.down} userVote={userVote} />
                </div>
              )}

              {/* ── VOTE BUTTONS ── */}
              {voteStatus === 'voted' ? (
                <div style={{
                  background: 'white',
                  border: `3px solid ${userVote === 1 ? 'var(--color-emerald-03)' : 'var(--color-red-03)'}`,
                  borderRadius: 2,
                  padding: '1.25rem',
                  textAlign: 'center',
                  boxShadow: `4px 4px 0 ${userVote === 1 ? 'var(--color-emerald-05)' : 'var(--color-red-01)'}`,
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                    {userVote === 1 ? '▲' : '▼'}
                  </div>
                  <p style={{
                    fontFamily: '"Courier New", monospace', fontWeight: 700,
                    fontSize: '0.72rem', letterSpacing: '0.15em',
                    textTransform: 'uppercase', margin: 0,
                    color: userVote === 1 ? 'var(--color-emerald-03)' : 'var(--color-red-02)',
                  }}>
                    {userVote === 1 ? 'You voted YES — word approved' : 'You voted NAH — noted'}
                  </p>
                  <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--color-gray-01)', margin: '0.35rem 0 0' }}>
                    Come back for the next vote.
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-purple-06)', marginBottom: '0.65rem', textAlign: 'center' }}>
                    Does this word deserve to exist?
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
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

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Footer bg="transparent" />
        </div>

        {/* ── TOAST ── */}
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%',
          transform: `translateX(-50%) translateY(${toast.visible ? 0 : '12px'})`,
          opacity: toast.visible ? 1 : 0,
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          background: 'var(--color-purple-01)', color: 'white',
          fontFamily: '"Courier New", monospace', fontSize: '0.72rem',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '0.6rem 1.25rem',
          border: '2px solid var(--color-purple-05)', borderRadius: 2,
          boxShadow: '4px 4px 0 var(--color-purple-04)',
          zIndex: 100, whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          {toast.message}
        </div>

      </div>
    </>
  );
}