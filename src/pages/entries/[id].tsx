'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import SearchBar from '@/components/SearchBar';
import Footer from '@/components/Footer';
import { CACHE_KEYS, getCache, setCache, TTL } from '@/utils/cache';

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

type Status = 'loading' | 'done' | 'error' | 'not_found';

// ─── Sub-components ───────────────────────────────────────────────────────────
function RarityPips({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{
          width: 8, height: 8,
          background: i < level ? 'var(--color-gold-03)' : 'var(--color-white-04)',
          borderRadius: 1,
        }} />
      ))}
      <span style={{
        fontFamily: '"Courier New", monospace',
        fontSize: '0.6rem',
        color: 'var(--color-gold-04)',
        letterSpacing: '0.1em',
        marginLeft: 6,
      }}>
        {level}/10
      </span>
    </div>
  );
}

function ToneBadge({ tone }: { tone: string }) {
  return (
    <span style={{
      fontFamily: '"Courier New", monospace',
      fontSize: '0.6rem',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      padding: '0.2rem 0.6rem',
      border: '2px solid var(--color-purple-04)',
      borderRadius: 2,
      color: 'var(--color-purple-04)',
      background: 'var(--color-white-02)',
    }}>
      {tone}
    </span>
  );
}

// The card that gets screenshotted — kept as its own ref-able div
function EntryCard({ entry, cardRef }: { entry: Entry; cardRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div
      ref={cardRef}
      id="entry-card"
      style={{
        background: 'white',
        border: '3px solid var(--color-purple-01)',
        borderRadius: 2,
        padding: '2.5rem 2.5rem 2rem',
        position: 'relative',
        boxShadow: '8px 8px 0 var(--color-purple-04)',
      }}
    >
      {/* corner pips */}
      <div style={{ position: 'absolute', top: -3, left:  -3, width: 12, height: 12, background: 'var(--color-gold-03)' }} />
      <div style={{ position: 'absolute', top: -3, right: -3, width: 12, height: 12, background: 'var(--color-gold-03)' }} />
      <div style={{ position: 'absolute', bottom: -3, left:  -3, width: 12, height: 12, background: 'var(--color-purple-04)' }} />
      <div style={{ position: 'absolute', bottom: -3, right: -3, width: 12, height: 12, background: 'var(--color-purple-04)' }} />

      {/* eyebrow row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '0.58rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'var(--color-purple-06)',
        }}>
          ◆ LISHNIY DICTIONARY
        </span>
        <ToneBadge tone={entry.tone} />
      </div>

      {/* word */}
      <h1 style={{
        fontFamily: '"Courier New", monospace',
        fontSize: 'clamp(2.4rem, 8vw, 4.5rem)',
        fontWeight: 900,
        color: 'var(--color-purple-01)',
        letterSpacing: '-0.04em',
        textTransform: 'lowercase',
        margin: '0 0 0.2rem 0',
        lineHeight: 1,
        textShadow: '3px 3px 0 var(--color-white-04)',
      }}>
        {entry.word}
      </h1>

      {/* language tag */}
      <div style={{
        fontFamily: '"Courier New", monospace',
        fontSize: '0.62rem',
        color: 'var(--color-gray-01)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        marginBottom: '1.75rem',
      }}>
        {entry.language}
      </div>

      {/* divider */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, var(--color-purple-01), var(--color-white-02))', marginBottom: '1.75rem', borderRadius: 1 }} />

      {/* description */}
      <p style={{
        fontFamily: 'Georgia, serif',
        fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
        color: 'var(--color-black-01)',
        lineHeight: 1.75,
        fontStyle: 'italic',
        margin: '0 0 2rem 0',
      }}>
        "{entry.description}"
      </p>

      {/* rarity */}
      <div style={{ marginBottom: entry.tags.length > 0 ? '1rem' : 0 }}>
        <div style={{
          fontFamily: '"Courier New", monospace',
          fontSize: '0.55rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--color-gray-01)',
          marginBottom: '0.4rem',
        }}>
          RARITY
        </div>
        <RarityPips level={entry.rarity_level} />
      </div>

      {/* tags */}
      {entry.tags.length > 0 && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {entry.tags.map(tag => (
            <span key={tag} style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '0.58rem',
              letterSpacing: '0.1em',
              padding: '0.15rem 0.5rem',
              background: 'var(--color-white-01)',
              border: '2px solid var(--color-white-04)',
              borderRadius: 2,
              color: 'var(--color-gray-02)',
            }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* watermark footer inside card */}
      <div style={{
        marginTop: '2rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--color-white-04)',
        fontFamily: '"Courier New", monospace',
        fontSize: '0.55rem',
        color: 'var(--color-white-04)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>lishniy.app</span>
        <span>лишний · superfluous · unnecessary</span>
      </div>
    </div>
  );
}

function ActionBtn({
  onClick, icon, label, subtle = false,
}: { onClick: () => void; icon: React.ReactNode; label: string; subtle?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: '"Courier New", monospace',
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        border: `2px solid ${subtle ? 'var(--color-white-04)' : 'var(--color-purple-04)'}`,
        borderRadius: 2,
        padding: '0.6rem 1rem',
        background: subtle ? 'white' : 'var(--color-purple-01)',
        color: subtle ? 'var(--color-gray-01)' : 'white',
        boxShadow: subtle ? '3px 3px 0 var(--color-white-04)' : '3px 3px 0 var(--color-purple-04)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translate(-1px,-1px)';
        (e.currentTarget as HTMLElement).style.boxShadow = subtle
          ? '4px 4px 0 var(--color-white-04)'
          : '5px 5px 0 var(--color-purple-04)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translate(0,0)';
        (e.currentTarget as HTMLElement).style.boxShadow = subtle
          ? '3px 3px 0 var(--color-white-04)'
          : '3px 3px 0 var(--color-purple-04)';
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : '12px'})`,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.25s ease, transform 0.25s ease',
      background: 'var(--color-purple-01)',
      color: 'white',
      fontFamily: '"Courier New", monospace',
      fontSize: '0.72rem',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      padding: '0.6rem 1.25rem',
      border: '2px solid var(--color-purple-05)',
      borderRadius: 2,
      boxShadow: '4px 4px 0 var(--color-purple-04)',
      zIndex: 100,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}>
      {message}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function EntryCardSkeleton() {
  const bar = (w: string, h = 14, delay = '0s') => (
    <div style={{ width: w, height: h, background: 'var(--color-white-04)', borderRadius: 2, animation: `shimmer 1.4s ease ${delay} infinite alternate` }} />
  );
  return (
    <div style={{ background: 'white', border: '3px solid var(--color-white-04)', borderRadius: 2, padding: '2.5rem', boxShadow: '8px 8px 0 var(--color-white-04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>{bar('120px', 10)} {bar('60px', 20)}</div>
      {bar('55%', 56, '0.1s')}
      <div style={{ height: 2, background: 'var(--color-white-04)', margin: '1.75rem 0', borderRadius: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
        {bar('100%', 14, '0.15s')}
        {bar('92%',  14, '0.25s')}
        {bar('78%',  14, '0.35s')}
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ width: 8, height: 8, background: 'var(--color-white-04)', borderRadius: 1 }} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EntryPage() {
  const params    = useParams();
  const router    = useRouter();
  const id        = params?.id as string;

  const [entry,  setEntry]  = useState<Entry | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [search, setSearch] = useState('');
  const [toast,  setToast]  = useState({ visible: false, message: '' });

  const cardRef = useRef<HTMLDivElement>(null!);

  // In EntryPage component, modify the data fetching:

  useEffect(() => {
    if (!id) return;

    const fetchEntry = async () => {
      // Try cache first
      const cached = getCache<Entry>(CACHE_KEYS.ENTRY(id), TTL.ENTRY_DETAIL);
      if (cached) {
        setEntry(cached);
        setStatus('done');
      }

      // Fetch fresh in background
      const { data, error } = await supabase
        .from('entries')
        .select('id, word, description, tags, language, tone, rarity_level, created_at')
        .eq('id', id)
        .single();

      if (error || !data) {
        if (!cached) {
          setStatus(error?.code === 'PGRST116' ? 'not_found' : 'error');
        }
      } else {
        setEntry(data);
        setCache(CACHE_KEYS.ENTRY(id), data);
        setStatus('done');
      }
    };

    fetchEntry();
  }, [id]);

  // ── Toast helper ──
  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2200);
  };

  // ── Share ──
const handleShare = async () => {
  const url = window.location.href;

  if (navigator.share) {
    try {
      await navigator.share({ title: `Lishniy: ${entry?.word}`, text: entry?.description, url });
    } catch (_) { /* user cancelled */ }
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard ◆');
  } catch (_) {
    // Fallback for insecure contexts or unsupported browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Link copied to clipboard ◆');
    } catch (_) {
      showToast('Clipboard not supported ▲');
    }
    document.body.removeChild(textArea);
  }
};

  // ── Screenshot via html2canvas ──
  const handleScreenshot = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const el = cardRef.current;
    if (!el) return;
    showToast('Generating screenshot…');
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `lishniy-${entry?.word ?? 'entry'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Screenshot saved ◆');
    } catch {
      showToast('Screenshot failed ▲');
    }
  };

  // ── Search submit ──
  const handleSearchSubmit = (q: string) => {
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <>
      <style>{`
        @keyframes shimmer { from { opacity: 0.5; } to { opacity: 1; } }
        @keyframes pop-in {
          from { opacity: 0; transform: scale(0.97) translateY(14px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .entry-card-anim { animation: pop-in 0.5s cubic-bezier(0.22,1,0.36,1) both; }
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

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, width: '100%', margin: '0 auto', padding: '2.5rem 2rem', flex: 1 }}>

          {/* ── TOP NAV ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
              <span style={{ fontFamily: '"Courier New", monospace', fontWeight: 900, fontSize: '1rem', color: 'var(--color-purple-01)', letterSpacing: '-0.02em' }}>
                ← lishniy
              </span>
            </a>
            <div style={{ flex: 1, minWidth: 200, maxWidth: 420 }}>
              <SearchBar
                value={search}
                onChange={setSearch}
                onSubmit={handleSearchSubmit}
                placeholder="search another word..."
                size="sm"
              />
            </div>
          </div>

          {/* ── STATES ── */}

          {status === 'loading' && <EntryCardSkeleton />}

          {status === 'not_found' && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1rem' }}>◇</div>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-purple-04)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Entry not found
              </p>
              <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--color-gray-01)', margin: 0 }}>
                This word may not exist yet. Or it does and we misplaced it.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1rem' }}>▲</div>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-red-01)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Failed to load entry
              </p>
              <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--color-gray-01)', margin: 0 }}>
                Supabase returned an error. Check your connection and try again.
              </p>
            </div>
          )}

          {status === 'done' && entry && (
            <div className="entry-card-anim">

              {/* breadcrumb */}
              <div style={{ marginBottom: '1.25rem', fontSize: '0.6rem', color: 'var(--color-gray-01)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                <a href="/search" style={{ color: 'var(--color-purple-04)', textDecoration: 'none' }}>Search</a>
                {' '}›{' '}
                <span style={{ color: 'var(--color-black-01)' }}>{entry.word}</span>
              </div>

              {/* ── THE CARD ── */}
              <EntryCard entry={entry} cardRef={cardRef} />

              {/* ── ACTION BUTTONS ── */}
              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                <ActionBtn
                  onClick={handleShare}
                  label="Share"
                  icon={
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <circle cx="13" cy="3"  r="2" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="13" cy="13" r="2" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="3"  cy="8"  r="2" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M5 7.1L11 4M5 8.9L11 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
                    </svg>
                  }
                />
                <ActionBtn
                  onClick={handleScreenshot}
                  label="Screenshot"
                  subtle
                  icon={
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="3" width="14" height="10" rx="0" stroke="currentColor" strokeWidth="1.8" />
                      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M5 3L6.5 1h3L11 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" />
                    </svg>
                  }
                />
                <ActionBtn
                  onClick={() => router.push('/search')}
                  label="Browse all"
                  subtle
                  icon={
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
                    </svg>
                  }
                />
              </div>

              {/* metadata strip */}
              <div style={{
                marginTop: '1.5rem',
                padding: '0.75rem 1rem',
                background: 'white',
                border: '2px solid var(--color-white-04)',
                borderRadius: 2,
                display: 'flex',
                gap: '1.5rem',
                flexWrap: 'wrap',
                boxShadow: '3px 3px 0 var(--color-white-04)',
              }}>
                {[
                  { label: 'ID',      value: entry.id.slice(0, 8) + '…' },
                  { label: 'LANG',    value: entry.language.toUpperCase() },
                  { label: 'ADDED',   value: new Date(entry.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.5rem', letterSpacing: '0.2em', color: 'var(--color-gray-01)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-black-01)', fontWeight: 700 }}>{value}</div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Footer bg="transparent" />
        </div>

        <Toast message={toast.message} visible={toast.visible} />
      </div>
    </>
  );
}