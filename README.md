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
available as a cloud sync foundation, but the app will continue to run with
localStorage if Supabase environment variables are missing.

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

## MVP Status

Status: MVP feature foundation in progress.

The current app uses local browser persistence. Supabase configuration has been
added as a non-breaking cloud sync foundation for future data sync work.
