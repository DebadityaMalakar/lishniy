'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

// ─── API Client ───────────────────────────────────────────────────────────────
const api = {
  async getEntry(id: string) {
    // Try cache first
    const cached = getCache<Entry>(CACHE_KEYS.ENTRY(id), TTL.ENTRY_DETAIL);
    if (cached) return cached;

    const res = await fetch(`/api/supabase/route?table=entries&select=id,word,description,tags,language,tone,rarity_level,created_at&id=${id}`);
    if (!res.ok) throw new Error('Failed to fetch entry');
    const { data } = await res.json();
    const entry = data[0];
    
    // Cache the result
    if (entry) setCache(CACHE_KEYS.ENTRY(id), entry);
    return entry;
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function RarityPips({ level }: { level: number }) {
  return (
    <div className="pips-container">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className={`pip ${i < level ? 'filled' : ''}`} style={{ width: 8, height: 8 }} />
      ))}
      <span className="rarity-level">
        {level}/10
      </span>
    </div>
  );
}

function ToneBadge({ tone }: { tone: string }) {
  return (
    <span className="badge-tone badge-tone-lg">
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
      className="entry-card"
    >
      {/* corner pips */}
      <div className="corner-gold-lg" />
      <div className="corner-gold-lg corner-gold-lg-right" />
      <div className="corner-purple-lg" />
      <div className="corner-purple-lg corner-purple-lg-right" />

      {/* eyebrow row */}
      <div className="entry-card-header">
        <span className="entry-card-eyebrow">
          ◆ LISHNIY DICTIONARY
        </span>
        <ToneBadge tone={entry.tone} />
      </div>

      {/* word */}
      <h1 className="entry-card-word">
        {entry.word}
      </h1>

      {/* language tag */}
      <div className="entry-card-language">
        {entry.language}
      </div>

      {/* divider */}
      <div className="divider-gradient entry-card-divider" />

      {/* description */}
      <p className="entry-card-description">
        "{entry.description}"
      </p>

      {/* rarity */}
      <div className={entry.tags.length > 0 ? 'mb-4' : ''}>
        <div className="rarity-label">
          RARITY
        </div>
        <RarityPips level={entry.rarity_level} />
      </div>

      {/* tags */}
      {entry.tags.length > 0 && (
        <div className="tags-container entry-card-tags">
          {entry.tags.map(tag => (
            <span key={tag} className="badge-tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* watermark footer inside card */}
      <div className="entry-card-watermark">
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
      className={`action-btn ${subtle ? 'action-btn-subtle' : 'action-btn-primary'}`}
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
    <div className={`toast ${visible ? 'visible' : 'hidden'}`}>
      {message}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function EntryCardSkeleton() {
  return (
    <div className="skeleton-entry-card">
      <div className="skeleton-entry-header">
        <div className="skeleton-entry-eyebrow" />
        <div className="skeleton-entry-tone" />
      </div>
      <div className="skeleton-entry-word" />
      <div className="divider-white skeleton-divider" />
      <div className="skeleton-entry-description">
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
        <div className="skeleton-line shorter" />
      </div>
      <div className="skeleton-pips">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton-pip-lg" />
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

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    const fetchEntry = async () => {
      try {
        // Try cache first
        const cached = getCache<Entry>(CACHE_KEYS.ENTRY(id), TTL.ENTRY_DETAIL);
        if (cached && isMounted) {
          setEntry(cached);
          setStatus('done');
        }

        // Fetch fresh in background
        const data = await api.getEntry(id);

        if (!isMounted) return;

        if (!data) {
          if (!cached) setStatus('not_found');
        } else {
          setEntry(data);
          setStatus('done');
        }
      } catch (error) {
        console.error('Failed to fetch entry:', error);
        if (isMounted && !entry) setStatus('error');
      }
    };

    fetchEntry();

    return () => {
      isMounted = false;
    };
  }, [id, entry]);

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
      <div className="page-wrapper entry-page-wrapper">
        {/* dot grid */}
        <div className="bg-dot-grid" />

        <div className="entry-container">

          {/* ── TOP NAV ── */}
          <div className="entry-nav">
            <a href="/" className="back-link">
              ← lishniy
            </a>
            <div className="entry-search">
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
            <div className="empty-state">
              <div className="empty-state-icon">◇</div>
              <p className="empty-state-title">
                Entry not found
              </p>
              <p className="empty-state-description">
                This word may not exist yet. Or it does and we misplaced it.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="empty-state">
              <div className="empty-state-icon error">▲</div>
              <p className="empty-state-title error">
                Failed to load entry
              </p>
              <p className="empty-state-description">
                Something went wrong. Check your connection and try again.
              </p>
            </div>
          )}

          {status === 'done' && entry && (
            <div className="entry-card-anim">

              {/* breadcrumb */}
              <div className="entry-breadcrumb">
                <a href="/search" className="breadcrumb-link">Search</a>
                {' '}›{' '}
                <span className="breadcrumb-current">{entry.word}</span>
              </div>

              {/* ── THE CARD ── */}
              <EntryCard entry={entry} cardRef={cardRef} />

              {/* ── ACTION BUTTONS ── */}
              <div className="action-buttons">
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
              <div className="metadata-strip">
                {[
                  { label: 'ID',      value: entry.id.slice(0, 8) + '…' },
                  { label: 'LANG',    value: entry.language.toUpperCase() },
                  { label: 'ADDED',   value: new Date(entry.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label} className="metadata-item">
                    <div className="metadata-label">{label}</div>
                    <div className="metadata-value">{value}</div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        <Footer bg="transparent" />

        <Toast message={toast.message} visible={toast.visible} />
      </div>
    </>
  );
}