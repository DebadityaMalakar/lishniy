'use client';

import Footer from '@/components/Footer';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { CACHE_KEYS, getCache, setCache, TTL } from '@/utils/cache';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Entry {
  id: string;
  word: string;
  description: string;
  tone: string;
}

// ─── Bubbles ──────────────────────────────────────────────────────────────────
const BUBBLES = [
  { size: 80,  left: '8%',  top: '12%', color: 'var(--color-white-05)', delay: '0s',    duration: '6s'   },
  { size: 48,  left: '88%', top: '18%', color: 'var(--color-white-02)', delay: '1s',    duration: '7s'   },
  { size: 64,  left: '75%', top: '60%', color: 'var(--color-white-01)', delay: '2s',    duration: '5s'   },
  { size: 36,  left: '20%', top: '72%', color: 'var(--color-white-04)', delay: '0.5s',  duration: '8s'   },
  { size: 52,  left: '55%', top: '7%',  color: 'var(--color-white-06)', delay: '3s',    duration: '6.5s' },
  { size: 28,  left: '93%', top: '78%', color: 'var(--color-white-03)', delay: '1.5s',  duration: '7.5s' },
  { size: 44,  left: '3%',  top: '50%', color: 'var(--color-white-05)', delay: '4s',    duration: '5.5s' },
  { size: 20,  left: '40%', top: '88%', color: 'var(--color-white-02)', delay: '2.5s',  duration: '9s'   },
];

function Bubble({ size, left, top, color, delay, duration }: typeof BUBBLES[0]) {
  return (
    <div style={{
      position: 'absolute', left, top,
      width: size, height: size,
      borderRadius: '50%',
      background: color,
      opacity: 0.75,
      animation: `bobble ${duration} ease-in-out ${delay} infinite alternate`,
      boxShadow: `inset -${Math.round(size * 0.15)}px -${Math.round(size * 0.1)}px ${Math.round(size * 0.25)}px rgba(255,255,255,0.65), 0 4px 14px rgba(109,6,177,0.07)`,
      pointerEvents: 'none',
    }} />
  );
}

// ─── Word Card ────────────────────────────────────────────────────────────────
function WordCard({ entry, visible }: { entry: Entry; visible: boolean }) {
  return (
    <div style={{
      transition: 'opacity 0.45s ease, transform 0.45s ease',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
    }}>
      <a href={`/entries/${entry.id}`} style={{ textDecoration: 'none' }}>
        <div style={{
          background: 'white',
          border: '3px solid var(--color-purple-01)',
          borderRadius: 4,
          padding: '1.5rem 1.75rem',
          boxShadow: '5px 5px 0 var(--color-purple-04)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'box-shadow 0.15s, transform 0.15s',
        }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '7px 7px 0 var(--color-purple-04)';
            (e.currentTarget as HTMLElement).style.transform = 'translate(-1px, -1px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 var(--color-purple-04)';
            (e.currentTarget as HTMLElement).style.transform = 'translate(0, 0)';
          }}
        >
          {/* pixel corner accents */}
          <div style={{ position: 'absolute', top: -3, right: -3, width: 10, height: 10, background: 'var(--color-gold-03)' }} />
          <div style={{ position: 'absolute', bottom: -3, left: -3, width: 10, height: 10, background: 'var(--color-gold-03)' }} />

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.6rem' }}>
            <span style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '1.6rem', fontWeight: 900,
              color: 'var(--color-purple-01)', letterSpacing: '-0.02em',
            }}>
              {entry.word}
            </span>
            {entry.tone && (
              <span style={{
                fontFamily: '"Courier New", monospace',
                fontSize: '0.65rem', color: 'var(--color-purple-06)',
                fontStyle: 'italic', letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {entry.tone}
              </span>
            )}
            <div style={{ flex: 1, height: 2, background: 'var(--color-white-02)', borderRadius: 1 }} />
          </div>

          <p style={{
            fontFamily: 'Georgia, serif',
            fontSize: '0.95rem', color: 'var(--color-black-01)',
            lineHeight: 1.7, margin: 0, fontStyle: 'italic',
          }}>
            "{entry.description}"
          </p>
        </div>
      </a>
    </div>
  );
}

// ─── Word Card Skeleton ───────────────────────────────────────────────────────
function WordCardSkeleton() {
  return (
    <div style={{
      background: 'white', border: '3px solid var(--color-white-04)',
      borderRadius: 4, padding: '1.5rem 1.75rem',
      boxShadow: '5px 5px 0 var(--color-white-04)',
    }}>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ width: 100, height: 22, background: 'var(--color-white-04)', borderRadius: 2, animation: 'shimmer 1.4s ease infinite alternate' }} />
        <div style={{ width: 50,  height: 12, background: 'var(--color-white-02)', borderRadius: 2, animation: 'shimmer 1.4s ease 0.2s infinite alternate' }} />
      </div>
      <div style={{ width: '100%', height: 12, background: 'var(--color-white-02)', borderRadius: 2, marginBottom: '0.4rem', animation: 'shimmer 1.4s ease 0.1s infinite alternate' }} />
      <div style={{ width: '78%',  height: 12, background: 'var(--color-white-02)', borderRadius: 2, animation: 'shimmer 1.4s ease 0.3s infinite alternate' }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Index() {
  const [entries,      setEntries]      = useState<Entry[]>([]);
  const [total,        setTotal]        = useState<number | null>(null);
  const [currentEntry, setCurrentEntry] = useState(0);
  const [visible,      setVisible]      = useState(true);
  const [loadingEntry, setLoadingEntry] = useState(true);
  const [surpriseLoading, setSurpriseLoading] = useState(false);

  // Fetch total count + featured entries on mount
  useEffect(() => {
    // Try cache for featured entries first
    const cachedEntries = getCache<Entry[]>(CACHE_KEYS.ENTRIES_ALL, TTL.ENTRIES_LIST);
    if (cachedEntries) {
      const shuffled = [...cachedEntries].sort(() => Math.random() - 0.5);
      setEntries(shuffled);
      setLoadingEntry(false);
    }

    // Try cache for total count
    const cachedTotal = getCache<number>(CACHE_KEYS.TOTAL_COUNT, TTL.ENTRIES_LIST);
    if (cachedTotal !== null) {
      setTotal(cachedTotal);
    }

    // Always fetch fresh in background
    Promise.all([
      // Fetch featured entries
      supabase
        .from('entries')
        .select('id, word, description, tone')
        .limit(6)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setCache(CACHE_KEYS.ENTRIES_ALL, data);
            const shuffled = [...data].sort(() => Math.random() - 0.5);
            setEntries(shuffled);
          }
          setLoadingEntry(false);
        }),

      // Fetch total count
      supabase
        .from('entries')
        .select('*', { count: 'exact', head: true })
        .then(({ count }) => { 
          if (count !== null) {
            setTotal(count);
            setCache(CACHE_KEYS.TOTAL_COUNT, count);
          }
        })
    ]);
  }, []);

  // Auto-rotate featured card
  useEffect(() => {
    if (entries.length === 0) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentEntry((prev) => (prev + 1) % entries.length);
        setVisible(true);
      }, 500);
    }, 4000);
    return () => clearInterval(interval);
  }, [entries]);

  // Surprise Me: fetch one random entry by offset
  const handleSurprise = async () => {
    if (total === null || surpriseLoading) return;
    
    setSurpriseLoading(true);
    
    try {
      // Try to get a random entry from cache first
      const cachedEntries = getCache<Entry[]>(CACHE_KEYS.ENTRIES_ALL, TTL.ENTRIES_LIST);
      
      if (cachedEntries && cachedEntries.length > 0) {
        // Pick a random entry from cached entries
        const randomIndex = Math.floor(Math.random() * cachedEntries.length);
        const randomEntry = cachedEntries[randomIndex];
        window.location.href = `/entries/${randomEntry.id}`;
        return;
      }

      // Fallback to Supabase if cache is empty
      const randomOffset = Math.floor(Math.random() * total);
      const { data } = await supabase
        .from('entries')
        .select('id')
        .range(randomOffset, randomOffset)
        .single();
        
      if (data?.id) {
        window.location.href = `/entries/${data.id}`;
      }
    } catch (error) {
      console.error('Surprise me failed:', error);
    } finally {
      setSurpriseLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes bobble {
          0%   { transform: translateY(0px)   rotate(-1deg); }
          100% { transform: translateY(-18px) rotate(1deg);  }
        }
        @keyframes shimmer {
          from { opacity: 0.5; }
          to   { opacity: 1;   }
        }
        @keyframes pop-in {
          0%   { opacity: 0; transform: scale(0.9) translateY(16px); }
          60%  { transform: scale(1.02) translateY(-3px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .lish-btn {
          font-family: "Courier New", monospace;
          font-weight: 700;
          font-size: 0.82rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          border: 3px solid;
          padding: 0.8rem 1.75rem;
          border-radius: 2px;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .lish-btn:hover  { transform: translate(-2px, -2px); }
        .lish-btn:active { transform: translate(1px, 1px);   }
        .lish-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .lish-btn-primary {
          background: var(--color-purple-01);
          border-color: var(--color-purple-05);
          color: var(--color-white-01);
          box-shadow: 5px 5px 0 var(--color-purple-04);
        }
        .lish-btn-primary:hover { box-shadow: 7px 7px 0 var(--color-purple-04); }

        .lish-btn-secondary {
          background: white;
          border-color: var(--color-gold-03);
          color: var(--color-gold-04);
          box-shadow: 5px 5px 0 var(--color-gold-07);
        }
        .lish-btn-secondary:hover { box-shadow: 7px 7px 0 var(--color-gold-07); }

        .stat-card {
          background: white;
          border: 2px solid var(--color-white-04);
          border-radius: 2px;
          padding: 1rem 1.25rem;
          text-align: center;
          box-shadow: 3px 3px 0 var(--color-white-04);
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, var(--color-white-06) 0%, var(--color-white-02) 45%, var(--color-white-05) 100%)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Courier New", monospace',
      }}>

        {/* Floating bubbles */}
        {BUBBLES.map((b, i) => <Bubble key={i} {...b} />)}

        {/* Soft dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(109,6,177,0.1) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* ─── CONTENT ─── */}
        <div style={{
          position: 'relative', zIndex: 10,
          maxWidth: 860, margin: '0 auto',
          padding: '2.5rem 2rem',
          display: 'flex', flexDirection: 'column', minHeight: '100vh',
          animation: 'pop-in 0.65s cubic-bezier(0.22,1,0.36,1) both',
        }}>

          {/* TOP BAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3.5rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {['var(--color-red-01)', 'var(--color-gold-03)', 'var(--color-emerald-02)'].map((c) => (
                <div key={c} style={{ width: 12, height: 12, background: c, borderRadius: '50%' }} />
              ))}
            </div>
            <div style={{
              border: '2px solid var(--color-purple-04)',
              borderRadius: 2,
              padding: '0.2rem 0.75rem',
              fontSize: '0.6rem',
              color: 'var(--color-purple-04)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              background: 'white',
            }}>
              v0.1.0 — ALPHA BUILD
            </div>
          </div>

          {/* HERO */}
          <div style={{ flex: 1 }}>

            {/* eyebrow */}
            <div style={{ marginBottom: '0.5rem', fontSize: '0.62rem', color: 'var(--color-purple-06)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
              ◆ лишний · superfluous · unnecessary ◆
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: 'clamp(3.5rem, 11vw, 8.5rem)',
              fontWeight: 900, margin: '0 0 0.5rem 0',
              lineHeight: 0.92, letterSpacing: '-0.04em',
              textTransform: 'uppercase',
              color: 'var(--color-purple-01)',
              textShadow: '4px 4px 0 var(--color-white-04), 7px 7px 0 var(--color-purple-04)',
              userSelect: 'none',
            }}>
              LISHNIY
            </h1>

            {/* Subtitle */}
            <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(0.95rem, 2.2vw, 1.2rem)', color: 'var(--color-black-01)', margin: '0 0 0.35rem 0', maxWidth: 520, lineHeight: 1.55 }}>
              The internet's most unnecessarily elaborate dictionary.
            </p>
            <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--color-gray-01)', margin: '0 0 3rem 0' }}>
              Because "blob" was never going to cut it.
            </p>

            {/* ROTATING WORD CARD */}
            <div style={{ marginBottom: '3rem', maxWidth: 600 }}>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--color-purple-06)', marginBottom: '0.65rem' }}>
                ► FEATURED ENTRY
              </div>

              {loadingEntry
                ? <WordCardSkeleton />
                : entries.length > 0
                  ? <WordCard entry={entries[currentEntry]} visible={visible} />
                  : null
              }

              {/* clickable progress pills */}
              {!loadingEntry && entries.length > 0 && (
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.7rem' }}>
                  {entries.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setVisible(false);
                        setTimeout(() => { setCurrentEntry(i); setVisible(true); }, 300);
                      }}
                      style={{
                        width: i === currentEntry ? 18 : 7,
                        height: 7, borderRadius: 4,
                        background: i === currentEntry ? 'var(--color-purple-01)' : 'var(--color-white-04)',
                        transition: 'all 0.3s ease', cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
              <button className="lish-btn lish-btn-primary" onClick={() => { window.location.href = '/search'; }}>
                ► Enter the Database
              </button>
              <button
                className="lish-btn lish-btn-secondary"
                onClick={handleSurprise}
                disabled={surpriseLoading || total === null}
              >
                {surpriseLoading ? '◎ Loading…' : '◎ Surprise Me'}
              </button>
              <button
                className="lish-btn"
                onClick={() => { window.location.href = '/vote/now'; }}
                style={{
                  background: 'white',
                  borderColor: 'var(--color-emerald-03)',
                  color: 'var(--color-emerald-03)',
                  boxShadow: '5px 5px 0 var(--color-emerald-05)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '7px 7px 0 var(--color-emerald-05)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0 var(--color-emerald-05)';
                }}
              >
                ▲ Vote a Word
              </button>
            </div>

            {/* STATS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', maxWidth: 460, marginBottom: '2.5rem' }}>
              {[
                { label: 'Words Defined', val: total !== null ? total.toLocaleString() : '…' },
                { label: 'Warranted',     val: '0'    },
                { label: 'Apologies',     val: 'None' },
              ].map(({ label, val }) => (
                <div key={label} className="stat-card">
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-purple-01)', letterSpacing: '-0.03em', marginBottom: '0.15rem' }}>{val}</div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--color-gray-01)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* QUOTE FOOTER (above Footer component) */}
          <div style={{ borderTop: '2px solid var(--color-white-04)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.7rem', color: 'var(--color-gray-01)', margin: 0 }}>
              "Why say few word when many word do trick?"
            </p>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {['var(--color-purple-01)', 'var(--color-gold-03)', 'var(--color-emerald-02)', 'var(--color-sapphire-01)', 'var(--color-red-01)'].map((c) => (
                <div key={c} style={{ width: 8, height: 8, background: c }} />
              ))}
            </div>
          </div>

        </div>
      </div>
      <Footer bg='fill' />
    </>
  );
}