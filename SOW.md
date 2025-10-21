# Statement of Work: Cursor Resources Management Website

**Project**: Transform Next.js + Supabase Starter into Cursor Resources Management Platform  
**Generated**: October 19, 2025  
**Confidence Level**: 95%

---

## 1. Executive Summary

Transform the existing Next.js 15.3 + Supabase starter template into a comprehensive Cursor Resources Management Website where users can browse, search, preview, and download 509+ Cursor-related resources (commands, rules, MCP tools, and shell scripts). Authenticated users can save favorites for quick access. You will have to configure supabase and create .env.local file.

### Key Objectives
- **Professional dark theme design system** with pre-built components
- Public resource browsing and downloading (no login required)
- Advanced search with fuzzy matching across 509 resources
- Rich preview system with syntax highlighting
- User favorites system (authentication required)
- Download tracking and popular resources analytics
- Fast performance (sub-2s page loads)

---

## 2. System Architecture

### 2.1 Architecture Pattern: Hybrid Static + Database

**Static Layer** (Build-time):
- Pre-process 509 files into searchable JSON index
- Generate static pages for resource browsing
- Client-side search with Fuse.js

**Database Layer** (Runtime):
- User favorites (user-specific data)
- Download tracking (analytics)
- Popular resources queries

**Benefits**:
- ⚡ Fast initial page loads (static HTML)
- 🔍 Instant search results (client-side)
- 💾 Minimal database load
- 📈 Easy to scale to 1000+ resources

### 2.2 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BUILD TIME                            │
├─────────────────────────────────────────────────────────────┤
│  cursor-resources/ (509 files)                              │
│         ↓                                                    │
│  scripts/index-resources.ts                                 │
│         ↓                                                    │
│  public/data/resources-index.json (searchable index)        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        RUNTIME                               │
├─────────────────────────────────────────────────────────────┤
│  User → / (Browse Page)                                     │
│         ↓                                                    │
│  Load resources-index.json → ResourceBrowser (client)       │
│         ↓                                                    │
│  Fuse.js Search & Filter → Display Grid                     │
│         ↓                                                    │
│  User Actions:                                               │
│    • Preview → Modal with syntax highlighting               │
│    • Download → API route → Track count                     │
│    • Favorite → Server Action → Supabase                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Technology Stack

#### Already Available ✅
- Next.js 15.3 (App Router, Server Components, Server Actions)
- Supabase (PostgreSQL, Auth, RLS)
- TypeScript (strict mode)
- Tailwind CSS v4 (**Critical**: `postcss.config.mjs` must use object syntax: `plugins: { "@tailwindcss/postcss": {} }`)
- next-themes (dark mode provider configured in root layout)
- shadcn/ui components
- Zod (validation)
- lucide-react (icons)
- Vitest (testing)

#### To Be Added 📦
```json
{
  "dependencies": {
    "gray-matter": "^4.0.3",
    "shiki": "^1.22.0",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "fuse.js": "^7.0.0",
    "file-saver": "^2.0.5",
    "@tanstack/react-virtual": "^3.10.8"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.7",
    "tsx": "^4.19.0"
  }
}
```

---

## 3. Database Schema Design

### 3.1 Resources Table (Lightweight Metadata)

```sql
CREATE TABLE public.resources (
  slug TEXT PRIMARY KEY,
  download_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_resources_download_count ON public.resources(download_count DESC);
```

**Purpose**: Track download counts only. Full resource metadata lives in JSON index.

### 3.2 Favorites Table

```sql
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_slug TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('command', 'rule', 'mcp', 'hook')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_user_favorite UNIQUE(user_id, resource_slug)
);

CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_resource_slug ON public.favorites(resource_slug);
CREATE INDEX idx_favorites_resource_type ON public.favorites(resource_type);
```

### 3.3 Row Level Security (RLS)

```sql
-- Resources: Public read
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Resources are viewable by everyone" ON public.resources
  FOR SELECT USING (true);

-- Favorites: User-specific
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);
```

### 3.4 PostgreSQL Functions

```sql
-- Increment download count safely
CREATE OR REPLACE FUNCTION public.increment_download_count(resource_slug_param TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO public.resources (slug, download_count)
  VALUES (resource_slug_param, 1)
  ON CONFLICT (slug) 
  DO UPDATE SET 
    download_count = public.resources.download_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get popular resources
CREATE OR REPLACE FUNCTION public.get_popular_resources(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(slug TEXT, download_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT r.slug, r.download_count
  FROM public.resources r
  ORDER BY r.download_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

---

## 4. Resource Index Structure

### 4.1 Resource Metadata Type

```typescript
export type ResourceType = 'command' | 'rule' | 'mcp' | 'hook'

export interface ResourceMetadata {
  slug: string                    // Unique: "command-automation-ci-cd-pipeline-manager"
  title: string                   // "CI/CD Pipeline Manager"
  description: string             // From frontmatter or extracted
  type: ResourceType              // command | rule | mcp | hook
  category: string                // "automation", "database", etc.
  filePath: string                // "commands/automation/ci-cd-pipeline-manager.md"
  fileName: string                // "ci-cd-pipeline-manager.md"
  fileSize: number                // In bytes
  extension: string               // ".md", ".mdc", ".json", ".sh"
  excerpt: string                 // First 300 characters
  tags: string[]                  // From frontmatter or extracted
  frontmatter: Record<string, any> | null
  searchContent: string           // Full text for Fuse.js
  createdAt: string               // ISO timestamp
}

export interface ResourceIndex {
  resources: ResourceMetadata[]
  categories: Record<ResourceType, string[]>
  totalCount: number
  generatedAt: string
}
```

### 4.2 Slug Generation Strategy

**Format**: `{type}-{category}-{filename-without-extension}`

**Examples**:
- `command-automation-ci-cd-pipeline-manager`
- `rule-database-supabase-schema-architect-intelligent`
- `mcp-devtools-stripe`
- `hook-automation-vercel-auto-deploy`

**Benefits**:
- Unique across all resources
- SEO-friendly
- Human-readable
- Type and category embedded

---

## 5. Component Architecture

### 5.1 Page Structure

```
app/
├── page.tsx                          # Main landing/browse page (enhanced)
├── resources/
│   └── [slug]/
│       └── page.tsx                  # Individual resource page (optional)
├── (dashboard)/
│   └── dashboard/
│       └── page.tsx                  # User favorites dashboard
└── api/
    └── resources/
        └── download/
            └── [slug]/
                └── route.ts          # Download handler API
```

### 5.2 Component Hierarchy

```
HomePage (Server Component)
└── ResourceBrowser (Client Component)
    ├── ResourceFilters (Client)
    │   ├── Search Input
    │   ├── Type Tabs
    │   ├── Category Select
    │   └── Sort Dropdown
    ├── ResourceGrid (Client)
    │   └── ResourceCard[] (Client)
    │       ├── FavoriteButton (Client)
    │       ├── DownloadButton (Client)
    │       └── PreviewButton → Modal (Client)
    └── PopularResources (Server Component)

DashboardPage (Server Component)
└── FavoritesDashboard (Client Component)
    └── Tabs by Resource Type
        └── ResourceCard[] (with unfavorite action)

ResourcePreviewModal (Client Component)
├── CodeBlock (with syntax highlighting)
├── MarkdownRenderer
├── CopyButton
└── DownloadButton
```

---

## 6. Feature Specifications

### 6.1 Resource Browsing

**Features**:
- Grid layout with resource cards (responsive: 1/2/3/4 columns)
- Real-time search with 300ms debounce
- Filter by type (All, Commands, Rules, MCPs, Hooks)
- Filter by category (dynamic based on selected type)
- Sort by: Name (A-Z), Downloads (High-Low), Recent
- Visual indicators: file type icons, badges for categories
- Download count displayed on each card
- Empty state when no results found

**Performance**:
- Client-side search (no network latency)
- Memoized Fuse.js instance
- Virtual scrolling for 200+ results (using @tanstack/react-virtual)

### 6.2 Search System

**Powered by**: Fuse.js fuzzy search

**Configuration**:
```typescript
{
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'description', weight: 0.3 },
    { name: 'searchContent', weight: 0.2 },
    { name: 'tags', weight: 0.1 }
  ],
  threshold: 0.4,
  minMatchCharLength: 2,
  shouldSort: true
}
```

**Search Scope**:
- File names
- Descriptions (from frontmatter or extracted)
- Full file content
- Tags

**User Experience**:
- Instant results as you type
- Typo-tolerant (fuzzy matching)
- Highlighted search terms in results
- Search term preserved in URL (shareable searches)

### 6.3 Preview System

**Modal Features**:
- Full-screen overlay with close button
- Syntax highlighting (VS Code Dark+ theme via Shiki)
- Responsive layout (scrollable content area)
- Header showing: title, type badge, category, file size
- Action bar: Copy Entire File, Download, Close

**Rendering by File Type**:
- `.md` files: Markdown rendered with GitHub-flavored syntax
- `.mdc` files: Frontmatter displayed separately + markdown content
- `.json` files: Pretty-printed with syntax highlighting
- `.sh` files: Bash syntax highlighting + comment header extracted

**Code Blocks**:
- Individual copy buttons per code block
- Line numbers (optional)
- Language label in top-right corner

### 6.4 Download System

**Flow**:
1. User clicks "Download" button
2. Call `incrementDownload()` server action (async, non-blocking)
3. Fetch from `/api/resources/download/[slug]`
4. Browser triggers file download with proper filename
5. Toast notification: "Downloaded {filename}"

**API Route** (`/api/resources/download/[slug]`):
- Validate slug format (prevent path traversal)
- Map slug to file path in cursor-resources/
- Read file from filesystem
- Set headers:
  - `Content-Type: application/octet-stream`
  - `Content-Disposition: attachment; filename="{original-name}"`
  - `Content-Length: {size}`
- Stream file to response

**Security**:
- Whitelist allowed extensions: `.md`, `.mdc`, `.json`, `.sh`
- Resolve absolute paths and verify within `cursor-resources/`
- Rate limiting: 100 downloads per hour per IP (optional)

### 6.5 Favorites System

**Authentication Flow**:
- Non-authenticated users see "Login to Favorite" tooltip
- Clicking favorite redirects to `/signin?redirect=/resources/{slug}`
- After login, redirect back to resource

**Favorite Toggle**:
- Heart icon (outline when not favorited, filled when favorited)
- Optimistic UI update (instant visual feedback)
- Server action: `toggleFavorite(slug, type)`
- Toast notification on success/error
- Revert on error

**Favorites Dashboard**:
- Accessible at `/dashboard`
- Tabs for each resource type (Commands, Rules, MCPs, Hooks, All)
- Grid of favorited resources
- Unfavorite button on each card
- Empty state: "No favorites yet. Browse resources to get started."
- Link back to browse page

**Database Operations**:
- INSERT on favorite (with unique constraint)
- DELETE on unfavorite
- SELECT to load user's favorites
- RLS ensures users only see their own favorites

### 6.6 Popular Resources

**Display**:
- Section on homepage: "Most Downloaded Resources"
- Horizontal scroll or grid (top 10)
- Compact card design with download count badge
- "View All" link to browse page with "popular" sort

**Data Source**:
- PostgreSQL function: `get_popular_resources(10)`
- Cached with revalidation every hour
- Fallback to empty state if no downloads yet

---

## 7. File Structure

```
├── app/
│   ├── page.tsx                                    # Main browse page (MODIFIED)
│   ├── resources/
│   │   └── [slug]/
│   │       └── page.tsx                            # Resource detail page (NEW)
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       └── page.tsx                            # Favorites dashboard (MODIFIED)
│   └── api/
│       └── resources/
│           └── download/
│               └── [slug]/
│                   └── route.ts                    # Download API (NEW)
│
├── components/
│   └── features/
│       └── resources/                              # NEW DIRECTORY
│           ├── resource-browser.tsx                # Main grid component
│           ├── resource-card.tsx                   # Resource card
│           ├── resource-card-skeleton.tsx          # Loading skeleton
│           ├── resource-filters.tsx                # Search & filters
│           ├── resource-preview-modal.tsx          # Preview modal
│           ├── resource-error-boundary.tsx         # Error handling
│           ├── favorite-button.tsx                 # Favorite toggle
│           ├── download-button.tsx                 # Download handler
│           ├── code-block.tsx                      # Syntax highlighting
│           ├── popular-resources.tsx               # Top downloads
│           └── favorites-dashboard.tsx             # Dashboard component
│
├── server/
│   ├── actions/
│   │   ├── favorites.ts                            # Favorite operations (NEW)
│   │   └── resources.ts                            # Download tracking (NEW)
│   └── queries/
│       └── resources.ts                            # Resource data fetching (NEW)
│
├── lib/
│   ├── resources.ts                                # Resource utilities (NEW)
│   ├── search.ts                                   # Fuse.js integration (NEW)
│   ├── clipboard.ts                                # Copy utilities (NEW)
│   └── file-utils.ts                               # File helpers (NEW)
│
├── hooks/
│   ├── use-resource-analytics.ts                   # Analytics tracking (NEW)
│   └── use-copy-to-clipboard.ts                    # Clipboard hook (NEW)
│
├── scripts/
│   └── index-resources.ts                          # Build-time indexer (NEW)
│
├── types/
│   └── resources.ts                                # Resource types (NEW)
│
├── supabase/
│   └── migrations/
│       └── [timestamp]_create_resources_and_favorites.sql  # Database schema (NEW)
│
└── public/
    └── data/
        └── resources-index.json                    # Generated index (NEW, gitignored)
```

---

## 8. Implementation Plan

### Phase 1: Foundation - Build-time Indexing & Static Browsing

#### Task 1.1: Install Dependencies
- [ ] Install new npm packages: `gray-matter`, `shiki`, `react-markdown`, `remark-gfm`, `fuse.js`, `file-saver`, `@tanstack/react-virtual`
- [ ] Install dev dependencies: `@types/file-saver`, `tsx`
- [ ] Update `package.json` scripts to include `resources:index` and modify `build` script

#### Task 1.2: Create Resource Indexing Script
- [ ] Create `scripts/index-resources.ts`
- [ ] Implement recursive directory scanner for `cursor-resources/`
- [ ] Implement file metadata extraction:
  - [ ] `.md` files: Parse with gray-matter, extract title from `<task name="...">` or filename
  - [ ] `.mdc` files: Parse frontmatter, use `description` field
  - [ ] `.json` files: Parse JSON, extract description
  - [ ] `.sh` files: Extract comment header
- [ ] Implement slug generation: `{type}-{category}-{filename}`
- [ ] Generate `searchContent` field (title + description + excerpt)
- [ ] Output to `public/data/resources-index.json`
- [ ] Test script with all 509 files

#### Task 1.3: Create Resource Types
- [ ] Create `types/resources.ts`
- [ ] Define `ResourceType` enum
- [ ] Define `ResourceMetadata` interface
- [ ] Define `ResourceIndex` interface
- [ ] Export all types

#### Task 1.4: Create Resource Utilities
- [ ] Create `lib/resources.ts`
- [ ] Implement `getResourceIndex()` - load JSON index
- [ ] Implement `getResourceBySlug()` - find by slug
- [ ] Implement `getResourcesByType()` - filter by type
- [ ] Implement `getResourcesByCategory()` - filter by type + category
- [ ] Implement `getResourceContent()` - read file from filesystem
- [ ] Add path validation to prevent directory traversal

#### Task 1.5: Implement Search System
- [ ] Create `lib/search.ts`
- [ ] Configure Fuse.js with weighted keys
- [ ] Implement `createSearchIndex()` - initialize Fuse instance
- [ ] Implement `searchResources()` - search with filters
- [ ] Add debounce utility for search input

#### Task 1.6: Create File Utilities
- [ ] Create `lib/file-utils.ts`
- [ ] Implement file type detection
- [ ] Implement icon mapping (FileCode, FileText, FileJson, Terminal)
- [ ] Implement file size formatting (bytes to KB/MB)
- [ ] Implement extension extraction

#### Task 1.7: Build ResourceCard Component
- [ ] Create `components/features/resources/resource-card.tsx`
- [ ] Add icon based on resource type
- [ ] Display title, description (truncated)
- [ ] Add category badge
- [ ] Show file size and extension
- [ ] Add placeholder for download count
- [ ] Add placeholder for favorite button
- [ ] Add preview button
- [ ] Add download button
- [ ] Style with Tailwind CSS classes
- [ ] Add hover effects

#### Task 1.8: Build ResourceFilters Component
- [ ] Create `components/features/resources/resource-filters.tsx`
- [ ] Implement search input with icon
- [ ] Implement type tabs (All, Commands, Rules, MCPs, Hooks)
- [ ] Implement category select (dynamic options based on type)
- [ ] Implement sort dropdown (Name, Downloads, Recent)
- [ ] Add "Clear filters" button
- [ ] Emit filter change events to parent

#### Task 1.9: Build ResourceBrowser Component
- [ ] Create `components/features/resources/resource-browser.tsx`
- [ ] Add `'use client'` directive
- [ ] Accept `initialResources` and `categories` props
- [ ] Implement state: `searchQuery`, `activeType`, `activeCategory`, `sortBy`
- [ ] Initialize Fuse.js instance (memoized)
- [ ] Implement search logic with debounce (300ms)
- [ ] Implement filter logic
- [ ] Implement sort logic
- [ ] Render ResourceFilters component
- [ ] Render grid of ResourceCard components
- [ ] Add empty state when no results
- [ ] Add loading skeleton during search

#### Task 1.10: Create Loading Skeletons
- [ ] Create `components/features/resources/resource-card-skeleton.tsx`
- [ ] Match ResourceCard layout
- [ ] Use shadcn/ui Skeleton component
- [ ] Create grid of skeletons for loading state

#### Task 1.11: Update Landing Page
- [ ] Modify `app/page.tsx`
- [ ] Make it async Server Component
- [ ] Load resource index with `getResourceIndex()`
- [ ] Pass resources to ResourceBrowser
- [ ] Add hero section with search bar
- [ ] Add statistics (total resources, categories)
- [ ] Replace starter template content

#### Task 1.12: Test Phase 1
- [ ] Run build script to generate resource index
- [ ] Verify `public/data/resources-index.json` created
- [ ] Verify all 509 resources indexed correctly
- [ ] Test search functionality (keyword, fuzzy matching)
- [ ] Test filters (type, category)
- [ ] Test sorting
- [ ] Test responsive layout (mobile, tablet, desktop)
- [ ] Verify no console errors

---

### Phase 2: Database & Favorites System

#### Task 2.1: Create Database Migration
- [ ] Run `supabase migration new create_resources_and_favorites`
- [ ] Add `resources` table schema
- [ ] Add `favorites` table schema
- [ ] Add indexes (download_count, user_id, resource_slug)
- [ ] Enable RLS on both tables
- [ ] Create RLS policies for resources (public read)
- [ ] Create RLS policies for favorites (user-specific)
- [ ] Create `increment_download_count()` function
- [ ] Create `get_popular_resources()` function
- [ ] Create `handle_updated_at()` trigger function
- [ ] Add trigger to resources table

#### Task 2.2: Apply Migration and Generate Types
- [ ] Run `npm run db:reset` to apply migration
- [ ] Run `npm run db:types` to regenerate TypeScript types
- [ ] Verify types in `types/supabase.ts` include new tables
- [ ] Test migration with sample data

#### Task 2.3: Create Favorites Server Actions
- [ ] Create `server/actions/favorites.ts`
- [ ] Add `'use server'` directive
- [ ] Implement `toggleFavorite(slug, type)`:
  - [ ] Check authentication
  - [ ] Check if already favorited (SELECT)
  - [ ] If favorited, DELETE favorite
  - [ ] If not favorited, INSERT favorite
  - [ ] Handle unique constraint errors
  - [ ] Return success status and new favorited state
- [ ] Implement `getFavorites()`:
  - [ ] Check authentication
  - [ ] SELECT all favorites for current user
  - [ ] Return favorites array
- [ ] Implement `getFavoritesByType(type)`:
  - [ ] Check authentication
  - [ ] SELECT favorites filtered by type
  - [ ] Return favorites array
- [ ] Implement `isFavorited(slug)`:
  - [ ] Check authentication
  - [ ] SELECT COUNT for user + slug
  - [ ] Return boolean
- [ ] Add error handling and validation
- [ ] Add Zod schemas for input validation

#### Task 2.4: Create Resources Server Actions
- [ ] Create `server/actions/resources.ts`
- [ ] Add `'use server'` directive
- [ ] Implement `incrementDownload(slug)`:
  - [ ] Call `increment_download_count()` SQL function
  - [ ] No authentication required
  - [ ] Handle errors silently (don't block downloads)
- [ ] Implement `getDownloadCount(slug)`:
  - [ ] SELECT download_count from resources table
  - [ ] Return 0 if resource not found
- [ ] Implement `getPopularResources(limit)`:
  - [ ] Call `get_popular_resources()` SQL function
  - [ ] Cache with 1 hour revalidation
  - [ ] Return array of slugs with counts

#### Task 2.5: Create Resources Query Functions
- [ ] Create `server/queries/resources.ts`
- [ ] Add `'use server'` directive
- [ ] Implement `getResourceContent(filePath)`:
  - [ ] Validate file path (prevent traversal)
  - [ ] Read file with `fs.readFile`
  - [ ] Return content as string
  - [ ] Handle errors (file not found)
- [ ] Implement `getResourceWithContent(slug)`:
  - [ ] Get metadata from index
  - [ ] Get content from filesystem
  - [ ] Return combined object

#### Task 2.6: Build FavoriteButton Component
- [ ] Create `components/features/resources/favorite-button.tsx`
- [ ] Add `'use client'` directive
- [ ] Accept props: `resourceSlug`, `resourceType`, `initialIsFavorited`
- [ ] Implement local state for optimistic updates
- [ ] Render heart icon (outline or filled based on state)
- [ ] Implement click handler:
  - [ ] Check if user is authenticated (use `createClient().auth.getUser()`)
  - [ ] If not authenticated, show login prompt or redirect
  - [ ] If authenticated, call `toggleFavorite()` server action
  - [ ] Update local state optimistically
  - [ ] Show toast notification on success/error
  - [ ] Revert on error
- [ ] Add loading state (disable button during action)
- [ ] Style with hover effects

#### Task 2.7: Integrate FavoriteButton into ResourceCard
- [ ] Update `components/features/resources/resource-card.tsx`
- [ ] Add `isFavorited` prop (optional)
- [ ] Render FavoriteButton if user is authenticated
- [ ] Pass resource slug and type to FavoriteButton

#### Task 2.8: Build FavoritesDashboard Component
- [ ] Create `components/features/resources/favorites-dashboard.tsx`
- [ ] Add `'use client'` directive
- [ ] Accept props: `favorites` (array), `resources` (index)
- [ ] Match favorites with resource metadata
- [ ] Group by resource type
- [ ] Render Tabs component (All, Commands, Rules, MCPs, Hooks)
- [ ] Render grid of ResourceCard per tab
- [ ] Add unfavorite action to each card
- [ ] Add empty state per tab: "No {type} favorites yet"
- [ ] Link to browse page from empty state

#### Task 2.9: Update Dashboard Page
- [ ] Modify `app/(dashboard)/dashboard/page.tsx`
- [ ] Keep existing user info section
- [ ] Add favorites section below
- [ ] Fetch user favorites with `getFavorites()`
- [ ] Load resource index
- [ ] Pass data to FavoritesDashboard component
- [ ] Handle loading state
- [ ] Handle error state

#### Task 2.10: Update ResourceBrowser with Auth State
- [ ] Modify `components/features/resources/resource-browser.tsx`
- [ ] Fetch user authentication state
- [ ] Fetch user favorites (if authenticated)
- [ ] Pass `isFavorited` to each ResourceCard
- [ ] Handle authentication changes (re-fetch favorites)

#### Task 2.11: Test Phase 2
- [ ] Test favorite toggle (authenticated users)
- [ ] Test login redirect (non-authenticated users)
- [ ] Test optimistic UI updates
- [ ] Test error handling (network errors, duplicate favorites)
- [ ] Test favorites dashboard (all tabs)
- [ ] Test unfavorite action
- [ ] Verify RLS policies (users can't see others' favorites)
- [ ] Test edge cases (favoriting same resource twice)

---

### Phase 3: Preview & Download System

#### Task 3.1: Build CodeBlock Component
- [ ] Create `components/features/resources/code-block.tsx`
- [ ] Add `'use client'` directive
- [ ] Accept props: `code`, `language`, `showLineNumbers`
- [ ] Use Shiki for syntax highlighting (server-side render)
- [ ] Apply VS Code Dark+ theme
- [ ] Add copy button with clipboard API
- [ ] Show "Copied!" feedback (toast or inline)
- [ ] Style with proper spacing and scrollbars

#### Task 3.2: Build ResourcePreviewModal Component
- [ ] Create `components/features/resources/resource-preview-modal.tsx`
- [ ] Add `'use client'` directive
- [ ] Use shadcn/ui Dialog component
- [ ] Accept props: `resource`, `isOpen`, `onClose`
- [ ] Lazy load file content on open (use `getResourceContent()`)
- [ ] Show loading skeleton while fetching
- [ ] Render header with:
  - [ ] Title
  - [ ] Type badge
  - [ ] Category
  - [ ] File size
  - [ ] Close button
- [ ] Render content based on file type:
  - [ ] `.md`: Use react-markdown with remark-gfm
  - [ ] `.mdc`: Display frontmatter separately + markdown content
  - [ ] `.json`: Pretty-print with CodeBlock component
  - [ ] `.sh`: CodeBlock with bash language
- [ ] Render action bar:
  - [ ] "Copy Entire File" button
  - [ ] "Download" button
  - [ ] Close button
- [ ] Implement copy to clipboard
- [ ] Implement download trigger
- [ ] Handle errors (file not found, parse errors)

#### Task 3.3: Create Markdown Renderer
- [ ] Configure react-markdown with:
  - [ ] remark-gfm plugin (GitHub-flavored markdown)
  - [ ] Custom components (headings, links, code blocks)
  - [ ] Use CodeBlock component for code blocks
  - [ ] Style tables, lists, blockquotes
- [ ] Handle syntax highlighting in markdown code blocks
- [ ] Add anchor links to headings

#### Task 3.4: Integrate Preview Modal into ResourceCard
- [ ] Update `components/features/resources/resource-card.tsx`
- [ ] Add "Preview" button
- [ ] Implement modal open state
- [ ] Render ResourcePreviewModal component
- [ ] Pass resource metadata to modal

#### Task 3.5: Create Download API Route
- [ ] Create `app/api/resources/download/[slug]/route.ts`
- [ ] Implement GET handler
- [ ] Extract slug from params
- [ ] Load resource index to get file path
- [ ] Validate slug format (regex: `/^[a-z0-9-]+$/`)
- [ ] Map slug to absolute file path
- [ ] Verify path is within `cursor-resources/` directory
- [ ] Verify file exists
- [ ] Call `incrementDownload(slug)` (async, don't await)
- [ ] Read file with `fs.readFile`
- [ ] Set response headers:
  - [ ] `Content-Type: application/octet-stream`
  - [ ] `Content-Disposition: attachment; filename="{original-name}"`
  - [ ] `Content-Length: {size}`
- [ ] Stream file to response
- [ ] Handle errors (404 for not found, 500 for server errors)
- [ ] Log download events (optional)

#### Task 3.6: Build DownloadButton Component
- [ ] Create `components/features/resources/download-button.tsx`
- [ ] Add `'use client'` directive
- [ ] Accept props: `resource`
- [ ] Render download icon button
- [ ] Implement click handler:
  - [ ] Fetch from `/api/resources/download/[slug]`
  - [ ] Use `file-saver` to trigger browser download
  - [ ] Show loading state during download
  - [ ] Show success toast with filename
  - [ ] Show error toast on failure
- [ ] Add keyboard accessibility (Enter key)

#### Task 3.7: Integrate Download Button
- [ ] Update ResourceCard to use DownloadButton
- [ ] Update ResourcePreviewModal to use DownloadButton
- [ ] Ensure download count increments correctly

#### Task 3.8: Create Clipboard Utilities
- [ ] Create `lib/clipboard.ts`
- [ ] Implement `copyToClipboard(text)` function:
  - [ ] Use `navigator.clipboard.writeText()`
  - [ ] Fallback to textarea method for older browsers
  - [ ] Return success boolean
- [ ] Create `hooks/use-copy-to-clipboard.ts`
- [ ] Implement custom hook:
  - [ ] State for `copied` (boolean)
  - [ ] `copy(text)` function
  - [ ] Auto-reset `copied` after 2 seconds
  - [ ] Return `{ copy, copied }`

#### Task 3.9: Add Copy Functionality
- [ ] Integrate clipboard hook into CodeBlock
- [ ] Integrate clipboard hook into ResourcePreviewModal ("Copy Entire File")
- [ ] Show visual feedback (checkmark icon, "Copied!" text)
- [ ] Add toast notifications

#### Task 3.10: Create Resource Analytics Hook
- [ ] Create `hooks/use-resource-analytics.ts`
- [ ] Track resource views (optional)
- [ ] Track downloads
- [ ] Return analytics functions

#### Task 3.11: Test Phase 3
- [ ] Test preview modal for all file types (.md, .mdc, .json, .sh)
- [ ] Test markdown rendering (headings, lists, code blocks, tables)
- [ ] Test syntax highlighting (multiple languages)
- [ ] Test copy to clipboard (entire file, individual code blocks)
- [ ] Test download functionality (all file types)
- [ ] Verify download count increments
- [ ] Test error states (file not found, parse errors)
- [ ] Test modal on mobile (responsive layout)
- [ ] Verify no memory leaks (close modal properly)

---

### Phase 4: Polish & Analytics

#### Task 4.1: Build PopularResources Component
- [ ] Create `components/features/resources/popular-resources.tsx`
- [ ] Make it a Server Component (async)
- [ ] Fetch popular resources with `getPopularResources(10)`
- [ ] Load resource metadata from index
- [ ] Render section header: "Most Downloaded Resources"
- [ ] Render horizontal scroll or grid
- [ ] Use compact ResourceCard design
- [ ] Show download count badge
- [ ] Add "View All" link to browse page with popular sort
- [ ] Handle empty state (no downloads yet)
- [ ] Cache with 1 hour revalidation

#### Task 4.2: Integrate PopularResources into Landing Page
- [ ] Update `app/page.tsx`
- [ ] Add PopularResources component below hero
- [ ] Wrap in Suspense with skeleton fallback

#### Task 4.3: Add Download Count to ResourceCard
- [ ] Update ResourceCard to accept `downloadCount` prop
- [ ] Fetch download counts for visible resources (batch query)
- [ ] Display count with download icon
- [ ] Format large numbers (1000 → 1K)
- [ ] Update count after download (optimistic)

#### Task 4.4: Enhance Landing Page Hero
- [ ] Add hero section with dark theme background
- [ ] Add tagline: "Discover and Download Cursor Resources"
- [ ] Add prominent search bar (pre-filled, auto-focus)
- [ ] Add quick links to resource types (4 large buttons)
- [ ] Add statistics section:
  - [ ] Total resources count
  - [ ] Total categories
  - [ ] Total downloads (sum of all resources)
- [ ] Style with animations (fade-in, slide-up)

#### Task 4.5: Create Error Boundary
- [ ] Create `components/features/resources/resource-error-boundary.tsx`
- [ ] Implement React Error Boundary pattern
- [ ] Catch errors in preview modal and resource cards
- [ ] Show friendly error message
- [ ] Add "Try Again" button
- [ ] Log errors to console (development)
- [ ] Log errors to monitoring service (production, optional)

#### Task 4.6: Add Virtual Scrolling (if needed)
- [ ] Test performance with 509 cards rendered
- [ ] If slow (< 60fps), implement virtual scrolling:
  - [ ] Use `@tanstack/react-virtual`
  - [ ] Update ResourceBrowser to use virtual list
  - [ ] Maintain search and filter functionality
  - [ ] Test scrolling performance

#### Task 4.7: Add Loading States
- [ ] Add skeleton for PopularResources
- [ ] Add skeleton for ResourceBrowser initial load
- [ ] Add loading spinner for preview modal content
- [ ] Add loading spinner for download button
- [ ] Add loading spinner for favorite button
- [ ] Ensure all async operations show loading feedback

#### Task 4.8: Implement Toast Notifications
- [ ] Already using sonner (from starter)
- [ ] Add toast for favorite added
- [ ] Add toast for favorite removed
- [ ] Add toast for download started
- [ ] Add toast for download completed
- [ ] Add toast for copy to clipboard
- [ ] Add toast for errors (network, server)

#### Task 4.9: Add Accessibility Features
- [ ] Add ARIA labels to all interactive elements
- [ ] Ensure keyboard navigation works (Tab, Enter, Escape)
- [ ] Add focus visible styles
- [ ] Test with screen reader
- [ ] Add skip links (skip to main content)
- [ ] Ensure color contrast meets WCAG AA standards

#### Task 4.10: Optimize Performance
- [ ] Lazy load preview modal (dynamic import)
- [ ] Lazy load Shiki (code splitting)
- [ ] Optimize resource index size (gzip compression)
- [ ] Add image optimization (if any thumbnails added)
- [ ] Minimize bundle size (analyze with `next bundle-analyzer`)
- [ ] Test Lighthouse scores (aim for 90+ performance)

#### Task 4.11: Add SEO Metadata
- [ ] Update `app/layout.tsx` with site metadata
- [ ] Add Open Graph tags
- [ ] Add Twitter Card tags
- [ ] Add structured data (JSON-LD) for resources
- [ ] Generate sitemap.xml (include all resource pages)
- [ ] Add robots.txt

#### Task 4.12: Write Tests
- [ ] Test resource indexing script:
  - [ ] Verify all files processed
  - [ ] Verify slug uniqueness
  - [ ] Verify metadata extraction
- [ ] Test search functionality:
  - [ ] Fuzzy matching
  - [ ] Filter by type
  - [ ] Filter by category
  - [ ] Sort options
- [ ] Test server actions:
  - [ ] `toggleFavorite()` (authenticated)
  - [ ] `getFavorites()`
  - [ ] `incrementDownload()`
- [ ] Test components:
  - [ ] ResourceCard rendering
  - [ ] FavoriteButton interactions
  - [ ] DownloadButton interactions
  - [ ] ResourcePreviewModal rendering
- [ ] Test API routes:
  - [ ] Download endpoint
  - [ ] Path traversal prevention
  - [ ] Error handling
- [ ] Run full test suite: `npm run test`
- [ ] Aim for 80%+ code coverage

#### Task 4.13: Create Documentation
- [ ] Update README.md:
  - [ ] Project description
  - [ ] Features list
  - [ ] Setup instructions
  - [ ] Build instructions
  - [ ] Deployment guide
- [ ] Document resource indexing script
- [ ] Document how to add new resources
- [ ] Document database schema
- [ ] Document API routes
- [ ] Add code comments (minimal, only where necessary)

#### Task 4.14: Final Testing & Bug Fixes
- [ ] Test entire user flow (browse → preview → download)
- [ ] Test authenticated flow (login → favorite → view dashboard)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (iOS, Android)
- [ ] Test with slow network (3G simulation)
- [ ] Test with empty database (no favorites, no downloads)
- [ ] Fix all bugs found
- [ ] Verify no console errors or warnings

---

## 9. Deployment Checklist

### Pre-Deployment
- [ ] Verify `postcss.config.mjs` uses object syntax: `plugins: { "@tailwindcss/postcss": {} }`
- [ ] Verify `ThemeProvider` wraps app in `app/layout.tsx`
- [ ] Run `npm run resources:index` to generate resource index
- [ ] Run `npm run build` to verify production build
- [ ] Run `npm run test` to ensure all tests pass
- [ ] Run `npm run lint` to check for linting errors
- [ ] Verify environment variables are set:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (if using service role)

### Supabase Setup
- [ ] Create Supabase project (or use existing)
- [ ] Push migrations: `npm run db:push`
- [ ] Verify tables created (resources, favorites)
- [ ] Verify RLS policies enabled
- [ ] Test authentication flow
- [ ] Set up SMTP for email auth (optional)

### Vercel Deployment
- [ ] Connect GitHub repository to Vercel
- [ ] Configure build command: `npm run build`
- [ ] Set environment variables in Vercel dashboard
- [ ] Deploy to production
- [ ] Verify deployment successful
- [ ] Test live site functionality

### Post-Deployment
- [ ] Verify resource browsing works
- [ ] Verify search works
- [ ] Verify preview modal works
- [ ] Verify download works
- [ ] Verify favorites work (login required)
- [ ] Check Lighthouse scores
- [ ] Monitor error logs (Vercel dashboard)
- [ ] Set up custom domain (optional)

---

## 10. Maintenance & Future Enhancements

### Regular Maintenance
- Update `SOW.md` as tasks are completed (check off items)
- Keep dependencies up to date
- Monitor performance metrics
- Review and optimize database queries
- Backup Supabase database regularly

### Future Enhancement Ideas
- [ ] User comments/ratings on resources
- [ ] Resource collections/playlists
- [ ] User-submitted resources (moderation required)
- [ ] Advanced analytics dashboard (most viewed, trending)
- [ ] Export favorites as JSON
- [ ] Share favorite collections (public URLs)
- [ ] Resource versioning (track updates)
- [ ] RSS feed for new resources
- [ ] API for programmatic access
- [ ] Resource tagging system (community tags)

---

## 11. Success Metrics

### Performance
- [ ] Initial page load < 2 seconds
- [ ] Search results < 100ms
- [ ] Preview modal opens < 300ms
- [ ] Lighthouse performance score > 90

### Functionality
- [ ] All 509 resources browsable
- [ ] All 509 resources downloadable
- [ ] Search covers 100% of resources
- [ ] Favorites persist across sessions
- [ ] Download counts accurate

### User Experience
- [ ] Zero console errors
- [ ] Mobile responsive (all screen sizes)
- [ ] Accessible (WCAG AA compliant)
- [ ] Intuitive navigation
- [ ] Fast and responsive UI

---

## 12. Risk Mitigation

### Technical Risks

**Risk**: Resource index too large (>1MB)  
**Mitigation**: Limit excerpt length, compress with gzip, lazy load if needed

**Risk**: Shiki bundle size too large  
**Mitigation**: Code split, lazy load only when preview modal opens

**Risk**: File download path traversal attack  
**Mitigation**: Strict path validation, whitelist allowed directories

**Risk**: Database query performance (favorites)  
**Mitigation**: Indexed columns, connection pooling, caching

**Risk**: Build-time indexing script fails  
**Mitigation**: Comprehensive error handling, validation checks, CI/CD pipeline

### Operational Risks

**Risk**: Resources become outdated  
**Mitigation**: Document process for adding new resources, automate indexing

**Risk**: Supabase quota exceeded  
**Mitigation**: Monitor usage, optimize queries, upgrade plan if needed

**Risk**: Vercel bandwidth limits  
**Mitigation**: Optimize file sizes, use CDN for large files (future)

---

## Appendix A: Key Decisions & Rationale

### Why Hybrid Architecture?
- **Performance**: Static generation is faster than SSR or CSR with API calls
- **Scalability**: Client-side search scales to 1000+ resources without server load
- **Cost**: Minimal database usage (only favorites and download counts)
- **Simplicity**: No complex caching or revalidation strategies needed

### Why Fuse.js over PostgreSQL Full-Text Search?
- **Instant results**: No network latency
- **Typo tolerance**: Fuzzy matching improves UX
- **Offline capability**: Works without server connection (future PWA)
- **Simplicity**: No database indexing or query optimization needed

### Why Build-Time Indexing?
- **Performance**: Pre-compute all metadata once
- **Type safety**: Generate TypeScript types from actual files
- **Reliability**: Fail fast if any files are malformed
- **Simplicity**: No runtime file system access required

### Why Separate Favorites Table?
- **Security**: RLS policies isolate user data
- **Performance**: Indexed queries for user-specific data
- **Flexibility**: Easy to add features (collections, tags, notes)

### Why Syntax Highlighting with Shiki?
- **Accuracy**: Same engine as VS Code (best-in-class)
- **Quality**: Beautiful themes out of the box
- **Server-Side**: Reduces client bundle size
- **Language Support**: 200+ languages supported

---

## Appendix B: Environment Variables

### Required
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Optional
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For admin operations
NEXT_PUBLIC_SITE_URL=https://your-domain.com      # For absolute URLs
```

---

## Appendix C: Database Queries Cheat Sheet

### Get User Favorites
```sql
SELECT * FROM favorites WHERE user_id = auth.uid();
```

### Get Popular Resources
```sql
SELECT slug, download_count FROM resources ORDER BY download_count DESC LIMIT 10;
```

### Increment Download Count
```sql
SELECT increment_download_count('command-automation-ci-cd-pipeline-manager');
```

### Check if Favorited
```sql
SELECT EXISTS(
  SELECT 1 FROM favorites 
  WHERE user_id = auth.uid() 
  AND resource_slug = 'command-automation-ci-cd-pipeline-manager'
);
```

---

## Appendix D: npm Scripts Reference

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "npm run resources:index && next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types --local > types/supabase.ts",
    "db:push": "supabase db push",
    "resources:index": "tsx scripts/index-resources.ts"
  }
}
```

---

## Progress Tracking

**Update this section as tasks are completed. Check off items in the implementation plan above.**

### Phase 1 Status: ⬜ Not Started
- 0 / 12 tasks completed

### Phase 2 Status: ⬜ Not Started
- 0 / 11 tasks completed

### Phase 3 Status: ⬜ Not Started
- 0 / 11 tasks completed

### Phase 4 Status: ⬜ Not Started
- 0 / 14 tasks completed

### Overall Progress: 0% (0 / 48 tasks)

---

**Last Updated**: October 21, 2025  
**Status**: Ready for Implementation  
**Next Action**: Begin Phase 1, Task 1.1 - Install Dependencies

---

## Instructions for Using This SOW

1. **Work through tasks sequentially** - Each phase builds on the previous one
2. **Check off tasks as you complete them** - Update the checkboxes [ ] to [x]
3. **Update progress tracking** - Modify the progress section at the end
4. **Document deviations** - If you change approach, note it in the relevant section
5. **Keep this file updated** - This is your single source of truth for project status

**This SOW should be updated throughout development to reflect actual progress and any changes made during implementation.**
