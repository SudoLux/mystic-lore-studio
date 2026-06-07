# Product Requirements Document

## Product Summary

Mystic Lore Studio is a responsive apparel project management and lookbook app for organizing garment projects, managing garment-specific workflows, tracking fabrics and materials, and creating professional project displays.

The app is designed for an independent fashion brand that needs a focused workspace for moving garments from concept to presentation while keeping project details, tasks, fabrics, yardage, and lookbook assets connected.

## Goals

- Provide one clear workspace for active and archived garment projects.
- Track garment-specific workflow stages and tasks.
- Maintain a reusable fabric and materials library.
- Link fabrics and materials to garment projects.
- Track yardage inventory, reservations, and usage.
- Support professional project displays through lookbook tools.
- Work well across desktop, tablet, and mobile screen sizes.
- Prepare the app for backup, restore, and offline-friendly PWA support.

## Target User

The primary user is an independent fashion designer, studio owner, or small apparel brand operator who manages garment concepts, fabrics, production notes, and presentation materials without a large enterprise PLM system.

The app should support creative planning and operational tracking without feeling like a generic task manager.

## UX/Design Direction

- Responsive-first interface that works across desktop and mobile.
- Calm, editorial, fashion-studio feel with practical workflow density.
- Clear navigation between projects, fabrics, tasks, and lookbook views.
- Project pages should feel like garment dossiers with structured tabs.
- Fabric views should support quick scanning of inventory and usage.
- Lookbook outputs should feel polished enough for client, buyer, or internal presentation review.
- Avoid cluttered dashboards; prioritize useful status, next actions, and project visibility.

## Main App Modules

### Dashboard

Overview of active projects, upcoming tasks, recent fabrics, workflow status, and key studio metrics.

### Project Library

Searchable and filterable list of garment projects with statuses, categories, seasons, tags, and key metadata.

### Global Project Kanban

Cross-project workflow board for moving garments through stages such as concept, design, sampling, production, shoot, and archived.

### Project Detail Pages

Dedicated page for each garment project with summary information, project status, images or references when supported, materials, notes, and related tasks.

### Project Task Board

Project-specific task workflow for creating, editing, completing, and organizing garment work items.

### Fabric Vault

Searchable fabric and materials library with inventory details, supplier notes, tags, and usage visibility.

### Fabric Detail Pages

Dedicated fabric records with material details, yardage, linked projects, notes, and inventory history.

### Fabric-to-Project Linking

Relationship system for assigning fabrics or materials to one or more garment projects.

### Yardage Tracking

Track available yardage, reserved yardage, used yardage, and remaining inventory.

### Lookbook Builder

Create curated project displays for presentation and review.

### Stats

Summaries for project counts, workflow progress, fabric usage, inventory value, and completion trends.

### Settings

App preferences, data management controls, and configuration options.

### Export/Import Backups

Data backup and restore workflows to keep the project portable and resilient.

### PWA Support

Installable app support and offline-friendly foundations where feasible.

## Data Models Summary

### Project

Represents a garment or apparel project. Expected fields include id, name, description, category, season, status, workflow stage, tags, priority, dates, notes, linked fabrics, tasks, and presentation metadata.

### Task

Represents work tied to a project or global workflow. Expected fields include id, project id, title, description, status, priority, due date, created date, and completed date.

### Fabric

Represents a fabric or material in the vault. Expected fields include id, name, type, color, supplier, composition, weight, width, tags, total yardage, reserved yardage, used yardage, remaining yardage, notes, and linked projects.

### Fabric Allocation

Represents a fabric-to-project relationship. Expected fields include id, fabric id, project id, reserved yardage, used yardage, purpose, and notes.

### Lookbook

Represents a curated project presentation. Expected fields include id, title, description, selected project ids, layout preferences, and export metadata.

### App Settings

Represents local user preferences, theme options, data backup settings, and PWA-related configuration.

## MVP Scope

- App scaffold and foundation.
- Mystic Lore visual theme.
- Responsive navigation.
- TypeScript data models.
- Seed data for projects, tasks, and fabrics.
- Dashboard overview.
- Project Library.
- Project Detail Page with core sections.
- Materials and Notes tabs.
- Global Kanban.
- Project Task Board with create, edit, and delete.
- Fabric Vault.
- Fabric Detail Page.
- Fabric create, edit, and delete.
- Fabric-to-project linking.
- Yardage reservation and usage tracking.
- Basic Lookbook preview and editing.
- Stats page.
- Settings page.
- Export/import backup foundation.
- PWA setup.

## Future Features

- Image uploads and richer media management.
- Advanced lookbook layouts and export formats.
- Supplier and vendor management.
- Costing and margin tools.
- Size range and measurement specs.
- Sample tracking.
- Production batch tracking.
- Calendar planning.
- Collaboration and comments.
- Cloud sync.
- Advanced analytics.

## Acceptance Criteria

- Users can navigate between all MVP modules on desktop and mobile.
- Users can create, view, edit, and delete garment projects.
- Users can manage project-specific tasks.
- Users can view projects on a global Kanban board.
- Users can create, view, edit, and delete fabric records.
- Users can link fabrics to projects.
- Users can track total, reserved, used, and remaining yardage.
- Users can create a basic lookbook presentation from selected projects.
- Users can view useful dashboard and stats summaries.
- Users can export and import backup data.
- The app builds successfully after each coding milestone.
- The UI remains responsive and usable across common viewport sizes.
