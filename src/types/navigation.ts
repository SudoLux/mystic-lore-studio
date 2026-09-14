import type { LucideIcon } from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'projects'
  | 'technical'
  | 'production'
  | 'versions'
  | 'ai'
  | 'kanban'
  | 'lookbooks'
  | 'portfolio'
  | 'fabrics'
  | 'stats'
  | 'settings';

export type NavItem = {
  id: PageId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  group: 'studio' | 'make' | 'present' | 'tools';
};
