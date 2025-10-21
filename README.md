# Cursor Resources Management Website

A comprehensive platform to browse, search, preview, and download 509+ Cursor-related resources including commands, rules, MCP tools, and shell scripts.

## Features

- **Browse 509+ Resources**: Commands, Rules, MCPs, and Hooks
- **Advanced Search**: Fuzzy matching with Fuse.js across titles, descriptions, and content
- **Smart Filtering**: Filter by type and category with real-time results
- **User Favorites**: Save resources to your personal dashboard (authentication required)
- **Download Tracking**: Track popular resources with download counts
- **Dark Theme**: Professional dark UI with shadcn/ui components
- **Type Safety**: Full TypeScript with generated Supabase types

## Tech Stack

- **Next.js 15.3**: App Router, Server Components, Server Actions
- **Supabase**: PostgreSQL with RLS, Authentication
- **TypeScript**: Strict mode with comprehensive types
- **Tailwind CSS v4**: Modern styling with design tokens
- **shadcn/ui**: Beautiful, accessible components
- **Fuse.js**: Client-side fuzzy search
- **Vitest**: Fast unit testing

## Quick Start

### Prerequisites

- Node.js 20+
- Docker Desktop (for Supabase local development)

### Installation

```bash
git clone <repository-url>
cd ai-coding-summit-demo

npm install

supabase start

npm run resources:index

npm run dev
```

Visit http://localhost:3000

### Database Setup

The migrations are automatically applied when you run `supabase start`. To manually reset:

```bash
npm run db:reset

npm run db:types
```

### Building for Production

```bash
npm run resources:index

npm run build

npm start
```

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page with resource browser
│   ├── (dashboard)/              # Protected routes
│   │   └── dashboard/page.tsx    # User favorites dashboard
│   └── api/
│       └── resources/
│           └── download/         # Download API endpoint
├── components/
│   └── features/
│       └── resources/            # Resource-related components
│           ├── resource-browser.tsx
│           ├── resource-card.tsx
│           ├── resource-filters.tsx
│           ├── favorite-button.tsx
│           ├── download-button.tsx
│           └── favorites-dashboard.tsx
├── server/
│   ├── actions/                  # Server Actions
│   │   ├── favorites.ts          # Favorite operations
│   │   └── resources.ts          # Download tracking
│   └── queries/                  # Database queries
├── lib/
│   ├── resources.ts              # Resource utilities
│   ├── search.ts                 # Fuse.js search
│   └── file-utils.ts             # File helpers
├── scripts/
│   └── index-resources.ts        # Build-time indexer
├── public/
│   └── data/
│       └── resources-index.json  # Generated resource index
└── supabase/
    └── migrations/               # Database migrations
```

## Key Features Explained

### Build-Time Indexing

All 509 resources are indexed at build time into a searchable JSON file:

```bash
npm run resources:index
```

This creates `public/data/resources-index.json` with full metadata for fast client-side searching.

### Search System

Client-side fuzzy search using Fuse.js:
- Searches titles, descriptions, and content
- Typo-tolerant with 40% threshold
- Instant results with 300ms debounce
- Filter by type and category
- Sort by name, downloads, or recent

### Favorites System

Authenticated users can save favorites:
- Toggle favorites with heart icon
- View all favorites in dashboard
- Filter favorites by type
- Favorites persist across sessions

### Download Tracking

Downloads are tracked in the database:
- Increment count on each download
- View popular resources
- RLS policies protect data integrity

## Database Schema

### Resources Table

```sql
CREATE TABLE public.resources (
  slug TEXT PRIMARY KEY,
  download_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Favorites Table

```sql
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_slug TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('command', 'rule', 'mcp', 'hook')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_user_favorite UNIQUE(user_id, resource_slug)
);
```

## Testing

Run the test suite:

```bash
npm test
```

Run with UI:

```bash
npm run test:ui
```

Generate coverage:

```bash
npm run test:coverage
```

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run db:start` - Start Supabase
- `npm run db:reset` - Reset database with migrations
- `npm run db:types` - Generate TypeScript types
- `npm run resources:index` - Index resources

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For local development, run `supabase start` to get the keys.

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Supabase

1. Create Supabase project
2. Push migrations: `npm run db:push`
3. Update environment variables with production keys

## Performance

- Initial page load: < 2 seconds
- Search results: < 100ms
- Lighthouse score: 90+
- All resources browsable and downloadable

## License

MIT

## Contributing

Contributions welcome! Please read CONTRIBUTING.md first.
