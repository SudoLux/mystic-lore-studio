# Mystic Lore Studio — Product Requirements Document

## Product Summary

Mystic Lore Studio is a responsive apparel project management and lookbook app for organizing garment projects, managing garment-specific workflows, tracking fabrics and materials, and creating professional project displays.

The app is designed for an independent fashion brand that needs a focused workspace for moving garments from concept to presentation while keeping project details, tasks, fabrics, yardage, and lookbook assets connected.

Mystic Lore Studio should function as a creative command center: part project manager, part garment archive, part material vault, and part professional presentation tool.

---

## Goals

- Provide one clear workspace for active and archived garment projects.
- Track garment-specific workflow stages and tasks.
- Maintain a reusable fabric and materials library.
- Link fabrics and materials to garment projects.
- Track yardage inventory, reservations, usage, and remaining availability.
- Support professional project displays through lookbook tools.
- Work well across desktop, tablet, and mobile screen sizes.
- Prepare the app for backup, restore, and offline-friendly PWA support.
- Keep the app focused, visual, and useful without feeling like a generic task manager.

---

## Target User

The primary user is an independent fashion designer, studio owner, or small apparel brand operator who manages garment concepts, fabrics, production notes, and presentation materials without a large enterprise PLM system.

The app should support creative planning and operational tracking while still feeling beautiful, intentional, and brand-native.

---

## UX / Design Direction

- Responsive-first interface that works across desktop, tablet, and mobile.
- Calm, editorial, fashion-studio feel with practical workflow density.
- Clear navigation between projects, fabrics, tasks, lookbooks, and settings.
- Project pages should feel like garment dossiers with structured tabs.
- Fabric views should support quick scanning of inventory, material properties, and usage.
- Lookbook outputs should feel polished enough for client, buyer, collaborator, or internal presentation review.
- Avoid cluttered dashboards; prioritize useful status, next actions, and project visibility.
- The app should feel premium and tactile without becoming visually noisy.
- The fabric photo, project image, or visual placeholder should often be the hero.
- The interface should support fast studio work first, then presentation polish second.

---

## Mystic Lore Visual System

The app should use the Mystic Lore brand palette:

- Midnight Black: `#0A0A0A`
- Celestial Blue: `#1B3A63`
- Golden Ember: `#C89B3C`
- Nebula Teal: `#2D5C6B`
- Dusk Bronze: `#9A6C3C`
- Stardust Ivory: `#EDE3CF`
- Deep Espresso: `#3D2B1F`

The UI should feel:

- Dark
- Premium
- Editorial
- Tactile
- Fashion-studio focused
- Calm but visually rich
- Mystic Lore branded without becoming cartoon fantasy

Use:

- Dark gradient backgrounds
- Translucent cards
- Thin bronze/gold borders
- Rounded corners
- Subtle hover/tap animation
- Large visual project cards
- Elegant badges and status chips
- Soft shadows
- Clean typography
- Smooth transitions

Avoid:

- Generic SaaS dashboard styling
- Cartoon fantasy UI
- Overly corporate task manager styling
- Cluttered tables as the main experience
- Loud animations that distract from the work

---

## Technical MVP Direction

The MVP should be built as a frontend-first app.

Recommended stack:

- React
- TypeScript
- Vite
- Tailwind CSS

The MVP should not require:

- Authentication
- Backend server
- Cloud database
- Payment system
- Multi-user collaboration

These can be added later if needed.

For MVP, the app should persist data locally in the browser.

Preferred options:

- `localStorage` for simple MVP data
- `IndexedDB` for richer data and images

The app should be structured so a future backend, cloud sync, or authentication system can be added later without rewriting the entire product.

---

## Main App Modules

### Dashboard

The Dashboard is the studio control center.

It should provide an overview of:

- Active projects
- Completed projects
- Projects by workflow phase
- Upcoming or next tasks
- Recently updated projects
- Recent fabrics
- Low-yardage fabric alerts
- Key studio metrics
- Quick actions

Quick actions may include:

- New Project
- Add Fabric
- Open Kanban
- Create Lookbook

The dashboard should not feel cluttered. It should help the user quickly understand what is happening in the studio and what needs attention next.

---

### Project Library

The Project Library is a searchable and filterable list of garment projects.

Projects should be displayed as polished visual cards, with support for alternate views such as compact list view.

Each project card should show useful metadata such as:

- Project title
- Garment type
- Collection or season
- Current workflow phase
- Project status
- Progress percentage
- Priority
- Difficulty
- Linked fabrics or material indicators
- Last updated date

Search and filtering should support:

- Project title
- Garment type
- Collection
- Season
- Status
- Workflow phase
- Priority
- Tags
- Description

---

### Global Project Kanban

The Global Project Kanban is a cross-project workflow board for moving garments through apparel-specific phases from concept through lookbook-ready archive.

The board should allow the user to view all projects grouped by their current workflow phase.

The MVP should support dragging or moving projects between workflow columns.

---

## Default Project Workflow Phases

The global project Kanban should use these default phases:

1. Concept
2. Research
3. Materials
4. Pattern Drafting
5. Sample Sewing
6. Fitting
7. Revision
8. Final Build
9. Photoshoot
10. Lookbook Ready
11. Archived

---

## Project Statuses

Projects should support these statuses:

- Idea
- Active
- Paused
- Blocked
- Ready for Production
- Completed
- Archived

---

### Project Detail Pages

Each garment project should have a dedicated project detail page.

The project detail page should feel like a garment dossier that collects project information, materials, tasks, notes, and lookbook content into one organized view.

A project detail page should include:

- Project title
- Hero visual or gradient placeholder
- Garment type
- Collection or season
- Project status
- Current workflow phase
- Progress percentage
- Priority
- Difficulty
- Due date
- Design intent
- Description
- Target wearer
- Silhouette
- Key features
- Color story
- General notes

---

## Project Detail Tabs

Each project detail page should include these tabs:

1. Overview
2. Materials
3. Tasks
4. Notes
5. Lookbook

Future tabs may include:

- Moodboard
- Pattern Notes
- Fit Notes
- Build Log
- Files

---

### Project Task Board

The Project Task Board is a project-specific workflow for creating, editing, completing, and organizing garment work items.

Each project should have its own task board.

The MVP task board should support these task statuses:

- To Do
- In Progress
- Blocked
- Review
- Done

Tasks should include:

- Task title
- Description
- Project ID
- Status
- Category
- Priority
- Due date
- Created date
- Completed date, if applicable
- Notes
- Linked material or fabric, if applicable

---

## Task Categories

Project tasks should support garment-specific categories:

- Concept
- Research
- Sketch
- Fabric
- Pattern
- Cutting
- Sewing
- Fitting
- Revision
- Trim
- Costing
- Photography
- Lookbook
- Client
- Admin

---

### Fabric Vault

The Fabric Vault is a searchable fabric and materials library.

It should support inventory details, supplier notes, tags, yardage, fabric properties, storage locations, and usage visibility.

The Fabric Vault should help the user quickly answer:

- What fabrics do I have?
- How much do I have left?
- What is this fabric good for?
- Where is it stored?
- What projects is it linked to?
- Is any of it reserved or already used?

---

### Fabric Detail Pages

Each fabric or material should have a dedicated detail page.

Fabric detail pages should function as material archive records that combine practical inventory information with creative usage notes.

---

## Fabric Detail Fields

Fabric records should support:

- Name
- Image
- Fabric type
- Color family
- Primary color
- Secondary colors
- Fiber content
- Weave or knit
- Weight
- Width
- Stretch
- Opacity
- Drape
- Hand feel
- Texture
- Structure
- Supplier/source
- Purchase date
- Cost per yard
- Total cost
- Storage location
- Bin number
- Shelf
- Storage status
- Best uses
- Care notes
- Mood tags
- Rarity
- Lore note
- Linked projects
- Yardage total
- Yardage reserved
- Yardage used
- Yardage remaining

---

### Fabric-to-Project Linking

The app should include a relationship system for assigning fabrics or materials to one or more garment projects.

This system should allow the user to connect specific fabrics to a project and define their role in the garment.

For example, one project may use:

- One shell fabric
- One lining fabric
- One trim fabric
- Buttons
- Zippers
- Thread
- Interfacing
- Labels

---

## Material Roles

Projects should support linked materials with specific garment roles:

- Shell Fabric
- Contrast Fabric
- Lining
- Trim
- Buttons
- Zippers
- Thread
- Interfacing
- Hardware
- Labels
- Other

Each linked material should support:

- Material role
- Material status
- Yardage needed
- Yardage reserved
- Yardage used
- Notes

---

## Material Statuses

Linked project materials should support these statuses:

- Needed
- Selected
- Ordered
- In Stock
- Reserved
- Cut
- Used
- Need More

---

### Yardage Tracking

The app should track fabric inventory through:

- Total yardage
- Reserved yardage
- Used yardage
- Remaining yardage

The app should show warnings when a project needs more yardage than is currently available.

Fabric records should show their linked project allocations.

Project material records should show whether the selected fabric has enough available yardage.

The system should be simple and predictable. It should not automatically subtract yardage unless the user clearly marks yardage as reserved, cut, or used.

---

### Lookbook Builder

The Lookbook Builder allows the user to create curated project displays for presentation and review.

Lookbook pages should feel like polished brand/editorial project pages, not plain database records.

The Lookbook Builder should support project-level lookbook pages and later may support collection-level lookbooks.

---

## Lookbook Templates

The MVP should support basic lookbook preview and editing with these templates:

1. Editorial Hero
2. Technical Showcase
3. Development Story

Lookbook content should include:

- Headline
- Subheadline
- Hero visual
- Garment story
- Design notes
- Material notes
- Styling notes
- Detail image gallery
- Credits
- Display specs

---

## Image Handling

MVP should support visual placeholders and app structure for images.

If feasible during MVP, support local image uploads for:

- Project hero image
- Project gallery images
- Fabric image
- Lookbook visuals

If image upload storage becomes too complex for MVP, the app should still be designed so image upload can be added cleanly in a later phase.

Image generation should not be part of the MVP.

---

## Interactive Project Displays

Project cards and project displays should feel polished and interactive.

Use subtle interactions:

- Card lift on hover
- Soft glow border
- Image or gradient zoom
- Animated progress bars
- Phase path highlighting
- Smooth tab transitions
- Mobile-friendly tap states

The animation should feel premium and controlled, not game-like or distracting.

---

### Stats

The Stats module should summarize project and inventory health.

Stats should include:

- Total projects
- Active projects
- Completed projects
- Projects by workflow phase
- Projects by garment type
- Total fabrics
- Total yardage
- Reserved yardage
- Used yardage
- Low-yardage fabrics
- Estimated fabric inventory value
- Upcoming due dates
- Completion trends, if feasible

---

### Settings

The Settings module should support app preferences, data management controls, and configuration options.

Settings should include:

- Export data
- Import data
- Reset demo/local data
- Theme options or placeholders
- PWA/install information, if useful

---

### Export / Import Backups

The app should support data backup and restore workflows to keep the project portable and resilient.

Export should generate a JSON file containing local app data.

Import should allow the user to restore from a valid JSON backup.

Import should include basic validation and confirmation before replacing existing data.

---

### PWA Support

The app should support installable PWA foundations where feasible.

PWA goals:

- Installable on supported desktop and mobile browsers
- Offline-friendly shell
- Local data access while offline
- App name and theme colors aligned with Mystic Lore branding

---

## Data Models Summary

### Project

Represents a garment or apparel project.

Expected fields include:

- ID
- Name/title
- Description
- Garment type
- Category
- Collection
- Season
- Status
- Workflow phase
- Tags
- Priority
- Difficulty
- Start date
- Due date
- Completion/progress percentage
- Design intent
- Target wearer
- Silhouette
- Key features
- Color story
- General notes
- Linked fabric IDs
- Linked material allocations
- Task IDs
- Lookbook ID
- Presentation metadata
- Created date
- Updated date

---

### Task

Represents work tied to a project or global workflow.

Expected fields include:

- ID
- Project ID
- Title
- Description
- Status
- Category
- Priority
- Due date
- Created date
- Updated date
- Completed date
- Notes
- Linked fabric/material ID, if applicable

---

### Fabric

Represents a fabric or material in the vault.

Expected fields include:

- ID
- Name
- Image
- Type
- Color
- Color family
- Supplier/source
- Composition/fiber content
- Weight
- Width
- Stretch
- Opacity
- Drape
- Hand feel
- Texture
- Structure
- Tags
- Total yardage
- Reserved yardage
- Used yardage
- Remaining yardage
- Cost per yard
- Total cost
- Storage location
- Storage status
- Care notes
- Best uses
- Mood tags
- Rarity
- Lore note
- Linked projects
- Created date
- Updated date

---

### Fabric Allocation

Represents a fabric-to-project relationship.

Expected fields include:

- ID
- Fabric ID
- Project ID
- Material role
- Material status
- Yardage needed
- Yardage reserved
- Yardage used
- Purpose
- Notes
- Created date
- Updated date

---

### Lookbook

Represents a curated project presentation.

Expected fields include:

- ID
- Project ID or selected project IDs
- Title
- Template
- Headline
- Subheadline
- Description
- Garment story
- Design notes
- Material notes
- Styling notes
- Hero visual
- Detail images
- Credits
- Display specs
- Layout preferences
- Export metadata
- Created date
- Updated date

---

### App Settings

Represents local user preferences and app configuration.

Expected fields include:

- Theme options
- Backup settings
- Last export date
- Local data version
- PWA-related configuration
- User preference placeholders

---

## Local Data Persistence

For MVP, the app should persist data locally in the browser.

Preferred options:

- `localStorage` for simple MVP data
- `IndexedDB` for richer data and images

The app should not require authentication or a backend for MVP.

User-created data should persist after refreshing the page.

The local storage architecture should allow future migration to a backend or cloud database.

---

## MVP Scope

The MVP should include:

- App scaffold and foundation
- Mystic Lore visual theme
- Responsive navigation
- TypeScript data models
- Seed data for projects, tasks, fabrics, and lookbooks
- Dashboard overview
- Project Library
- Project Detail Page with core sections
- Materials tab
- Notes tab
- Global Kanban
- Project Task Board
- Project create, edit, and delete
- Task create, edit, and delete
- Fabric Vault
- Fabric Detail Page
- Fabric create, edit, and delete
- Fabric-to-project linking
- Yardage reservation and usage tracking
- Basic Lookbook preview and editing
- Stats page
- Settings page
- Export/import backup foundation
- PWA setup
- Responsive desktop/tablet/mobile layout

---

## Future Features

- Rich image uploads and advanced media management
- Advanced lookbook layouts
- PDF export
- Shareable lookbook links
- Supplier and vendor management
- Costing and margin tools
- Size range and measurement specs
- Sample tracking
- Production batch tracking
- Calendar planning
- Collaboration and comments
- Cloud sync
- User accounts
- Advanced analytics
- AI fabric suggestions
- AI lookbook copy generation
- AI next-task suggestions
- Tech pack export
- QR code fabric/bin labels

---

## Acceptance Criteria

- Users can navigate between all MVP modules on desktop and mobile.
- Users can create, view, edit, and delete garment projects.
- Users can manage project-specific tasks.
- Users can view projects on a global Kanban board.
- Users can move projects between workflow phases.
- Users can create, view, edit, and delete fabric records.
- Users can link fabrics to projects.
- Users can assign material roles to linked fabrics.
- Users can track total, reserved, used, and remaining yardage.
- Users can see warnings when selected fabric yardage is insufficient.
- Users can create and edit a basic lookbook presentation from project data.
- Each project includes Overview, Materials, Tasks, Notes, and Lookbook sections.
- Users can view useful dashboard and stats summaries.
- Users can export and import backup data.
- User-created data persists after page refresh using local browser storage.
- The MVP works without requiring authentication, backend services, or cloud database setup.
- The app builds successfully after each coding milestone.
- The UI remains responsive and usable across common desktop, tablet, and mobile viewport sizes.
- The UI reflects the Mystic Lore visual system and does not feel like a generic SaaS dashboard.