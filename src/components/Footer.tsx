type FooterBg = 'fill' | 'transparent' | 'opaque';

const bgStyles: Record<FooterBg, React.CSSProperties> = {
  fill:        { background: 'var(--color-purple-04)', borderColor: 'var(--color-purple-04)' },
  transparent: { background: 'transparent',            borderColor: 'var(--color-white-04)'  },
  opaque:      { background: 'rgba(255,255,255,0.6)',  borderColor: 'var(--color-white-04)', backdropFilter: 'blur(8px)' },
};

const textStyles: Record<FooterBg, { site: string; copy: string; name: string }> = {
  fill:        { site: 'var(--color-white-01)', copy: 'var(--color-white-02)', name: 'var(--color-gold-03)'   },
  transparent: { site: 'var(--color-purple-01)', copy: 'var(--color-gray-01)', name: 'var(--color-purple-06)' },
  opaque:      { site: 'var(--color-purple-01)', copy: 'var(--color-gray-01)', name: 'var(--color-purple-06)' },
};

export default function Footer({ bg = 'transparent' }: { bg?: FooterBg }) {
  const year = new Date().getFullYear();
  const yearDisplay = year === 2026 ? '2026' : `2026–${year}`;
  const colors = textStyles[bg];

  return (
    <footer style={{
      ...bgStyles[bg],
      borderTop: '2px solid',
      padding: '1.25rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '0.5rem',
      fontFamily: '"Courier New", monospace',
    }}>
      <span style={{ fontWeight: 900, fontSize: '0.9rem', color: colors.site, letterSpacing: '-0.01em' }}>
        LISHNIY
      </span>

      <span style={{ fontSize: '0.65rem', color: colors.copy, letterSpacing: '0.08em' }}>
        © {yearDisplay} — made by{' '}
        <span style={{ color: colors.name, fontWeight: 700 }}>Debaditya Malakar</span>
      </span>
    </footer>
  );
}