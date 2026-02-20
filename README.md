# LISHNIY

**The internet's most unnecessarily elaborate dictionary.**  
A curated lexicon where meaning is negotiated, then canonized.

> **лишний** *(Russian)* — superfluous, unnecessary, extra  
> The project's namesake and thesis.

---

## Philosophy

LISHNIY is a curated, intentionally elaborate digital lexicon that treats language as both artifact and performance. It's not a traditional dictionary—it's a controlled linguistic archive where words are invented, distorted, reframed, submitted to ritualized public voting, and ultimately canonized through authorial approval.

The project explores the tension between:

- **Language and authority** — Who gets to define meaning?
- **Humor and academia** — Can something be both absurd and scholarly?
- **Collective resonance and singular authorship** — The crowd reacts, but final meaning remains curated.

Each entry exists within a lifecycle: **creation → exposure → judgment → canon**. Voting functions less as democracy and more as a public ritual of resonance. The result is a living lexicon that feels archival yet playful, scholarly yet absurd, structured yet self-aware.

Visually, LISHNIY embraces a singular, intentional aesthetic: a finite color system, deliberate monospaced typography, and minimal interfaces. **There is no light mode, no dark mode, no theming**—the internet got saturated once we started toggling everything. This is the only way it looks.

**Meaning is not discovered here. It is constructed, witnessed, and archived.**

---

## Features

LISHNIY behaves like a product, but thinks like an archive.

### 📖 Browse the Lexicon
Explore a growing collection of entries—each with a word, description, tone, language of origin, rarity level, and tags.

### 🔍 Search
Search by word or concept with real-time results, relevance scoring, and multiple sort modes (A→Z, Z→A, rarity, best match). Keywords are highlighted in results.

### 🗳️ Vote on Words
Active voting sessions let users weigh in on whether a word deserves to exist:
- ▲ **YES** — approve the word
- ▼ **NAH** — reject it

Live vote counts update in real time via Supabase subscriptions. Once you vote, your choice is stored locally to prevent duplicate voting.

### 📜 Vote History
Browse archived voting sessions, complete with final scores, approval percentages, and timestamps. Filter by approved/rejected words and sort by date, vote count, or score.

### 🔗 Share & Export
Every entry has a permanent URL. Share it directly or generate a pixel-perfect PNG screenshot of the entry card (thanks to `html2canvas`) to share elsewhere.

### 🎲 Surprise Me
Land on a random entry with one click—because discovery should have an element of chance.

---

## Tech Stack

- **Framework:** Next.js (Pages Router)
- **Language:** TypeScript
- **Styling:** Custom CSS variables + minimal Tailwind
- **Database:** Supabase (PostgreSQL)
- **Realtime:** Supabase Realtime subscriptions for live vote updates
- **Screenshots:** `html2canvas`
- **Deployment:** Vercel / Netlify compatible

---

## Project Structure

```
src/
├── components/          # Reusable UI
│   ├── Footer.tsx      # Footer with background variants
│   └── SearchBar.tsx   # Search input with clear button & keyboard shortcuts
├── pages/
│   ├── _app.tsx        # Global app wrapper
│   ├── _document.tsx   # Custom document
│   ├── index.tsx       # Landing page (hero, featured entry, stats)
│   ├── entries/
│   │   └── [id].tsx    # Individual entry view + screenshot generation
│   ├── search/
│   │   └── index.tsx   # Search with filters & sorting
│   └── vote/
│       ├── now/
│       │   └── index.tsx # Active voting session
│       └── history/
│           └── index.tsx # Archived vote sessions
├── styles/
│   └── globals.css     # Single source of truth for all colors
└── utils/
    └── supabase.ts     # Supabase client singleton
```

---

## Public Data Model

The public frontend interacts with these Supabase tables:

### `entries`
- `id` (uuid, primary)
- `word` (text)
- `description` (text)
- `tags` (text[])
- `language` (text)
- `tone` (text)
- `rarity_level` (int2, 1–10)
- `created_at` (timestamp)

### `vote_sessions`
- `id` (uuid, primary)
- `entry_id` (uuid, references entries)
- `started_at` (timestamp)
- `ends_at` (timestamp, nullable)
- `is_active` (boolean)

### `votes`
- `id` (uuid, primary)
- `vote_session_id` (uuid, references vote_sessions)
- `vote_value` (int2, 1 for up, -1 for down)
- `created_at` (timestamp)

### `vote_history` (view)
Aggregated vote data per session (total_votes, upvotes, downvotes, final_score).

---

## Design System

LISHNIY uses a single, intentional color palette defined as CSS custom properties in `globals.css`:

- **Purples** (`--color-purple-01` through `-08`) — primary brand, authority
- **Golds** (`--color-gold-01` through `-08`) — rarity, highlights
- **Emeralds** (`--color-emerald-01` through `-08`) — approval, "yes" votes
- **Reds** (`--color-red-01` through `-03`) — rejection, "no" votes
- **Grays** (`--color-gray-01` through `-03`) — secondary text, metadata
- **Whites/Blacks** (`--color-white-01` through `-06`, `--color-black-01` through `-05`) — backgrounds, shadows

**There is no theme switching.** These colors are fixed. If you fork this project and want a different look, you change the CSS file—that's it. **Constraints are part of the design, not limitations to be removed.**

Typography is primarily **Courier New, monospace** for a technical, archival feel, with **Georgia, serif** used for descriptive text (italicized).

Visual motifs include:
- Hard borders and drop shadows (pixel-inspired)
- Corner accents (colored squares at card edges)
- Rarity "pips" (10-segment bars)
- Floating background bubbles on the landing page
- Subtle dot-grid backgrounds

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase project (with the tables above)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/lishniy.git
cd lishniy
```

2. Install dependencies
```bash
npm install
# or
yarn
```

3. Create a `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
```

4. Run the development server
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000)

---

## Deployment

The app is ready for deployment on Vercel or Netlify. Make sure to add the environment variables in your hosting dashboard.

---

## Roadmap / Future Ideas

- [ ] Advanced search (by tag, language, tone, date range)
- [ ] "Word of the Day" widget
- [ ] API endpoints for programmatic access
- [ ] User-submitted word proposals (under consideration)
- [ ] Collaborative tagging experiments (maybe)

---

## License

MIT — use it, remix it, change the colors if you must, but give credit where it's due.

---

## Credits

Created by **Debaditya Malakar**.

LISHNIY is a project about language, absurdity, and the unnecessary beauty of over-explanation.