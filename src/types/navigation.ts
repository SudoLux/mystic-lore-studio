import type { LucideIcon } from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'projects'
  | 'technical'
  | 'versions'
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
};
