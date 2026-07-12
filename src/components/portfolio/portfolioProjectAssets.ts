import { getSafePortfolioSettings } from '../../utils/portfolioUtils';
import type { ApparelProject, LocalImageAsset } from '../../types/studio';

export function getProjectPortfolioAssets(
  project: ApparelProject,
): LocalImageAsset[] {
  const assets = new Map<string, LocalImageAsset>();
  if (project.heroImage) assets.set(project.heroImage.id, project.heroImage);
  project.galleryImages?.forEach((image) => assets.set(image.id, image));
  return [...assets.values()];
}

export function resolveProjectPortfolioCover(
  project: ApparelProject,
  assets = getProjectPortfolioAssets(project),
): LocalImageAsset | undefined {
  const settings = getSafePortfolioSettings(project);
  return assets.find((asset) => asset.id === settings.portfolioCoverImageId)
    ?? project.heroImage
    ?? project.galleryImages?.[0];
}
