export interface PortfolioProfile {
  displayName: string;
  headline: string;
  bio: string;
  location?: string;
  email?: string;
  resumeUrl?: string;
  avatarImageId?: string;
  usernameSlug: string;
  /** Timestamp of the last explicitly published public profile snapshot. */
  publishedAt?: string;
  updatedAt: string;
}

export interface PortfolioVisibleSections {
  overview: boolean;
  gallery: boolean;
  materials: boolean;
  skills: boolean;
  process: boolean;
  notes: boolean;
  editorials: boolean;
  downloads: boolean;
}

export interface PortfolioProjectSettings {
  isPublic: boolean;
  portfolioSlug: string;
  customPortfolioTitle?: string;
  customPortfolioDescription?: string;
  portfolioCoverImageId?: string;
  featuredPortfolioImageIds: string[];
  attachedEditorialCollectionIds: string[];
  visibleSections: PortfolioVisibleSections;
  featured: boolean;
  /** Timestamp of the last explicitly published public project snapshot. */
  publishedAt?: string;
  /** Private source version represented by the last public snapshot. */
  publishedSourceUpdatedAt?: string;
  sortOrder?: number;
  updatedAt: string;
}

export type PortfolioProjectSettingsPatch = Omit<
  Partial<PortfolioProjectSettings>,
  'visibleSections'
> & {
  visibleSections?: Partial<PortfolioVisibleSections>;
};
