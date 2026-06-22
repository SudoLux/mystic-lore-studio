# Mystic Lore Studio

Mystic Lore Studio is a responsive apparel project management and lookbook app for an independent fashion brand. It helps organize garment projects, manage garment-specific workflows, track fabrics and materials, and create professional project displays.

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Supabase cloud sync foundation
- Local browser persistence
- PWA support

## Core Modules

- Dashboard
- Project Library
- Global Project Kanban
- Project Detail Pages
- Project Task Board
- Fabric Vault
- Fabric Detail Pages
- Fabric-to-project linking
- Yardage tracking
- Lookbook Builder
- Stats
- Settings
- Export/import backups
- PWA support

## Development Commands

```bash
npm install
npm run dev
npm run build
```

## Supabase Configuration

Mystic Lore Studio currently keeps local browser persistence active. Supabase is
the primary data source for authenticated users. A user-scoped localStorage
cache plus an IndexedDB mutation queue and image-blob store keep the app usable
when Supabase is temporarily unavailable.

Required Vite environment variables:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

For local development, add these values to `.env.local` in the project root.
Restart `npm run dev` after changing environment variables.

For Netlify, add the same variables in:

```text
Site configuration > Environment variables
```

After updating Netlify environment variables, trigger a new deploy so Vite can
include the values in the client build.

### Required Database Objects

Apply the SQL migrations in `supabase/migrations` in timestamp order. The sync
layer expects these user-owned tables with Row Level Security enabled:

- `profiles`
- `projects`
- `tasks`
- `notes`
- `fabrics`
- `materials`
- `yardage_entries`
- `project_images`
- `lookbook_pages`

Every synced row includes `user_id`, a UUID primary key, and a unique
user-scoped `client_id`. The browser continues using its existing stable string
IDs while Supabase UUIDs remain internal to database relationships. Frontend
queries always use the authenticated user and never require a service-role key.

### Private Image Storage

The follow-up sync migration creates a private Supabase Storage bucket named:

```text
project-images
```

Project and lookbook images use:

```text
users/{userId}/projects/{projectId}/{imageId}.webp
```

Fabric Vault images use:

```text
users/{userId}/fabrics/{fabricId}/{imageId}.webp
```

Storage policies only permit authenticated users to access objects beneath
their own `users/{userId}` path. The app generates short-lived signed URLs for
display and refreshes them when the app regains focus or a URL expires.

### Migration and Offline Behavior

When an authenticated account has no cloud records, the app checks the current
device for meaningful local data. Untouched bundled demo data is ignored. If
user-created or edited data exists, the app offers a one-time migration that:

- upserts projects and related records using stable `client_id` values;
- converts legacy Base64 project, lookbook, and fabric images to WebP;
- uploads media to the private Storage bucket;
- preserves the legacy localStorage dataset as a recovery backup;
- records migration completion without deleting local data.

Before migration or synchronization starts, the app verifies authentication,
all required tables, Row Level Security access, and the private Storage bucket.
Missing schema, missing bucket, permission, authentication, timeout, and
network failures produce distinct recovery messages.

All edits remain optimistic: React state and the user-scoped localStorage cache
update immediately. IndexedDB stores optimized upload blobs and a durable,
versioned queue of record-level upsert/delete operations. Repeated edits to the
same record are coalesced, parent records are sent before their dependents,
database writes use batches of 50, and no more than two images upload at once.
Database requests time out after 15 seconds and image requests after 45 seconds;
only network failures retry with 1, 2, and 4 second backoff. Explicit delete
tombstones remain queued until confirmed by the cloud.

Migration runs in the background after confirmation and reports validation,
record preparation, record saving, image upload, and verification phases. A
migration is complete only after its queue drains and a verification fetch
succeeds. The app retries on browser focus, network reconnect, or the manual
Retry Sync action. Conflicts are resolved using the newest `updated_at` value,
and local data and backups are never removed automatically.

## MVP Status

Status: MVP feature foundation in progress.

Authenticated sessions use Supabase as the cloud source of truth with local
cache and offline queue recovery. Cloud sync requires both repository SQL
migrations to be applied to the configured Supabase project.
