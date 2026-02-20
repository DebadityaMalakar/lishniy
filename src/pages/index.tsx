'use client';

import Footer from '@/components/Footer';
import { useState, useEffect } from 'react';
import { CACHE_KEYS, getCache, setCache, TTL } from '@/utils/cache';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Entry {
  id: string;
  word: string;
  description: string;
  tone: string;
}

// ─── API Client ───────────────────────────────────────────────────────────────
const api = {
  async getEntries(limit = 6) {
    // Try cache first
    const cached = getCache<Entry[]>(CACHE_KEYS.ENTRIES_ALL, TTL.ENTRIES_LIST);
    if (cached) return cached;

    const res = await fetch(`/api/supabase/route?table=entries&select=id,word,description,tone&limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch entries');
    const { data } = await res.json();
    
    // Cache the result
    setCache(CACHE_KEYS.ENTRIES_ALL, data);
    return data;
  },

  async getTotalCount() {
    // Try cache first
    const cached = getCache<number>(CACHE_KEYS.TOTAL_COUNT, TTL.ENTRIES_LIST);
    if (cached !== null) return cached;

    const res = await fetch('/api/supabase/route?table=entries&count=true');
    if (!res.ok) throw new Error('Failed to fetch count');
    const { count } = await res.json();
    
    // Cache the result
    setCache(CACHE_KEYS.TOTAL_COUNT, count);
    return count;
  },

  async getRandomEntryId(total: number) {
    // Try to get from cache first
    const cachedEntries = getCache<Entry[]>(CACHE_KEYS.ENTRIES_ALL, TTL.ENTRIES_LIST);
    if (cachedEntries && cachedEntries.length > 0) {
      const randomIndex = Math.floor(Math.random() * cachedEntries.length);
      return cachedEntries[randomIndex].id;
    }

    // Fallback to API
    const randomOffset = Math.floor(Math.random() * total);
    const res = await fetch(`/api/supabase/route?table=entries&select=id&range=${randomOffset}-${randomOffset}`);
    if (!res.ok) throw new Error('Failed to fetch random entry');
    const { data } = await res.json();
    return data[0]?.id;
  }
};

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
    <div 
      className="bubble"
      style={{
        left, top,
        width: size, height: size,
        background: color,
        animation: `bobble ${duration} ease-in-out ${delay} infinite alternate`,
        boxShadow: `inset -${Math.round(size * 0.15)}px -${Math.round(size * 0.1)}px ${Math.round(size * 0.25)}px rgba(255,255,255,0.65), 0 4px 14px rgba(109,6,177,0.07)`,
      }}
    />
  );
}

// ─── Word Card ────────────────────────────────────────────────────────────────
function WordCard({ entry, visible }: { entry: Entry; visible: boolean }) {
  return (
    <div className={`word-card-wrapper ${visible ? 'visible' : ''}`}>
      <a href={`/entries/${entry.id}`} className="word-card-link">
        <div 
          className="word-card"
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
          <div className="corner-gold" />
          <div className="corner-gold-bottom-left" />

          <div className="word-card-header">
            <span className="word-card-title">{entry.word}</span>
            {entry.tone && (
              <span className="word-card-tone">{entry.tone}</span>
            )}
            <div className="word-card-divider" />
          </div>

          <p className="word-card-description">
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
    <div className="card-skeleton word-card-skeleton">
      <div className="skeleton-header">
        <div className="skeleton-title" />
        <div className="skeleton-tone" />
      </div>
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Index() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [currentEntry, setCurrentEntry] = useState(0);
  const [visible, setVisible] = useState(true);
  const [loadingEntry, setLoadingEntry] = useState(true);
  const [surpriseLoading, setSurpriseLoading] = useState(false);

  // Fetch total count + featured entries on mount
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        // Try cache for featured entries first
        const cachedEntries = getCache<Entry[]>(CACHE_KEYS.ENTRIES_ALL, TTL.ENTRIES_LIST);
        if (cachedEntries && isMounted) {
          const shuffled = [...cachedEntries].sort(() => Math.random() - 0.5);
          setEntries(shuffled);
          setLoadingEntry(false);
        }

        // Try cache for total count
        const cachedTotal = getCache<number>(CACHE_KEYS.TOTAL_COUNT, TTL.ENTRIES_LIST);
        if (cachedTotal !== null && isMounted) {
          setTotal(cachedTotal);
        }

        // Fetch fresh data in parallel
        const [freshEntries, freshTotal] = await Promise.allSettled([
          api.getEntries(6),
          api.getTotalCount()
        ]);

        if (!isMounted) return;

        // Handle fresh entries
        if (freshEntries.status === 'fulfilled' && freshEntries.value) {
          const shuffled = [...freshEntries.value].sort(() => Math.random() - 0.5);
          setEntries(shuffled);
          setLoadingEntry(false);
        } else if (freshEntries.status === 'rejected') {
          console.error('Failed to fetch entries:', freshEntries.reason);
          setLoadingEntry(false);
        }

        // Handle fresh total
        if (freshTotal.status === 'fulfilled' && freshTotal.value !== null) {
          setTotal(freshTotal.value);
        }

      } catch (error) {
        console.error('Error in data fetching:', error);
        if (isMounted) setLoadingEntry(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
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
      const id = await api.getRandomEntryId(total);
      if (id) {
        window.location.href = `/entries/${id}`;
      }
    } catch (error) {
      console.error('Surprise me failed:', error);
    } finally {
      setSurpriseLoading(false);
    }
  };

  return (
    <>
      <div className="page-wrapper">
        {/* Floating bubbles */}
        {BUBBLES.map((b, i) => <Bubble key={i} {...b} />)}

        {/* Soft dot grid */}
        <div className="bg-dot-grid" />

        {/* ─── CONTENT ─── */}
        <div className="page-container animate-pop-in">
          {/* TOP BAR */}
          <div className="top-bar">
            <div className="color-dots">
              {['var(--color-red-01)', 'var(--color-gold-03)', 'var(--color-emerald-02)'].map((c) => (
                <div key={c} className="color-dot" style={{ background: c }} />
              ))}
            </div>
            <div className="version-badge">
              v0.1.0 — ALPHA BUILD
            </div>
          </div>

          {/* HERO */}
          <div className="hero-section">
            {/* eyebrow */}
            <div className="eyebrow">
              ◆ лишний · superfluous · unnecessary ◆
            </div>

            {/* Title */}
            <h1 className="hero-title">
              LISHNIY
            </h1>

            {/* Subtitle */}
            <p className="hero-subtitle">
              The internet's most unnecessarily elaborate dictionary.
            </p>
            <p className="hero-subtitle-small">
              Because "blob" was never going to cut it.
            </p>

            {/* ROTATING WORD CARD */}
            <div className="featured-section">
              <div className="featured-label">
                ► FEATURED ENTRY
              </div>

              {loadingEntry ? (
                <WordCardSkeleton />
              ) : entries.length > 0 ? (
                <WordCard entry={entries[currentEntry]} visible={visible} />
              ) : null}

              {/* clickable progress pills */}
              {!loadingEntry && entries.length > 0 && (
                <div className="progress-pills">
                  {entries.map((_, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setVisible(false);
                        setTimeout(() => { setCurrentEntry(i); setVisible(true); }, 300);
                      }}
                      className={`progress-pill ${i === currentEntry ? 'active' : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="cta-group">
              <button 
                className="btn-primary btn-large" 
                onClick={() => { window.location.href = '/search'; }}
              >
                ► Enter the Database
              </button>
              <button
                className="btn-secondary btn-large"
                onClick={handleSurprise}
                disabled={surpriseLoading || total === null}
              >
                {surpriseLoading ? '◎ Loading…' : '◎ Surprise Me'}
              </button>
              <button
                className="btn-emerald btn-large"
                onClick={() => { window.location.href = '/vote/now'; }}
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
            <div className="stats-grid">
              {[
                { label: 'Words Defined', val: total !== null ? total.toLocaleString() : '…' },
                { label: 'Warranted', val: '0' },
                { label: 'Apologies', val: 'None' },
              ].map(({ label, val }) => (
                <div key={label} className="stat-card">
                  <div className="stat-value">{val}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* QUOTE FOOTER */}
          <div className="quote-footer">
            <p className="quote-text">
              "Why say few word when many word do trick?"
            </p>
            <div className="color-strip">
              {['var(--color-purple-01)', 'var(--color-gold-03)', 'var(--color-emerald-02)', 'var(--color-sapphire-01)', 'var(--color-red-01)'].map((c) => (
                <div key={c} className="color-block" style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer bg="fill" />
    </>
  );
}