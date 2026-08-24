import type { ApparelProject, Fabric } from '../types/studio';

export type ProjectFormState =
  | { mode: 'create'; project?: undefined }
  | { mode: 'edit'; project: ApparelProject };

export type FabricFormState =
  | { fabric?: undefined; mode: 'create' }
  | { fabric: Fabric; mode: 'edit' };
