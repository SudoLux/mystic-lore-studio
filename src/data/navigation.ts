import {
  Archive,
  BarChart3,
  BookOpen,
  Columns3,
  Folder,
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import type { NavItem } from '../types/navigation';

export const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Home',
    description: 'Studio overview',
    icon: LayoutDashboard,
  },
  {
    id: 'projects',
    label: 'Projects',
    shortLabel: 'Proj',
    description: 'Garment library',
    icon: Folder,
  },
  {
    id: 'kanban',
    label: 'Kanban',
    shortLabel: 'Flow',
    description: 'Workflow board',
    icon: Columns3,
  },
  {
    id: 'lookbooks',
    label: 'Editorial Collections',
    shortLabel: 'Editorial',
    description: 'Editorial presentation studio',
    icon: BookOpen,
  },
  {
    id: 'fabrics',
    label: 'Fabric Vault',
    shortLabel: 'Fabric',
    description: 'Materials archive',
    icon: Archive,
  },
  {
    id: 'stats',
    label: 'Stats',
    shortLabel: 'Stats',
    description: 'Studio signals',
    icon: BarChart3,
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Prefs',
    description: 'App controls',
    icon: Settings,
  },
];
