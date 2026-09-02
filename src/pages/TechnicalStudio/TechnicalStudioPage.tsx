import { useState } from 'react';
import { CanonicalWorkspaceState } from '../../components/shared/CanonicalWorkspaceState';
import { Card } from '../../components/shared/Card';
import { GarmentWorkbenchContext, SpecialistWorkbench, WorkbenchTabs } from '../../components/shared/SpecialistWorkbench';
import { useTechnicalStudio } from '../../hooks/useTechnicalStudio';
import { FlatsWorkspace } from './FlatsWorkspace';
import { MeasurementStudio } from './MeasurementStudio';
import { ReleaseStudio, type ReleaseSection } from './ReleaseStudio';
import { TechnicalStudioLanding } from './TechnicalStudioLanding';

export function TechnicalStudioPage({ garmentId, onOpenGarment }: { garmentId?: string; onOpenGarment: (garmentId: string) => void }) {
  const { state } = useTechnicalStudio();
  const [technicalSection, setTechnicalSection] = useState<'flats' | 'pom' | 'measurements' | ReleaseSection>('flats');
  if (!state) return <CanonicalWorkspaceState><Card><p className="text-sm text-stardust/60">Preparing Technical Studio…</p></Card></CanonicalWorkspaceState>;
  if (garmentId) return <CanonicalWorkspaceState><SpecialistWorkbench><GarmentWorkbenchContext garmentId={garmentId} label="Technical Studio" /><WorkbenchTabs active={technicalSection} ariaLabel="Technical Studio sections" items={technicalWorkbenchTabs} onChange={setTechnicalSection} />{technicalSection === 'flats' ? <FlatsWorkspace garmentId={garmentId} /> : technicalSection === 'pom' || technicalSection === 'measurements' ? <MeasurementStudio garmentId={garmentId} onOpenFlats={() => setTechnicalSection('flats')} onOpenPom={() => setTechnicalSection('pom')} section={technicalSection} /> : <ReleaseStudio garmentId={garmentId} section={technicalSection} />}</SpecialistWorkbench></CanonicalWorkspaceState>;
  return <CanonicalWorkspaceState><SpecialistWorkbench><TechnicalStudioLanding onOpenGarment={onOpenGarment} state={state} /></SpecialistWorkbench></CanonicalWorkspaceState>;
}

const technicalWorkbenchTabs = [
  { id: 'flats', label: 'Flats' },
  { id: 'pom', label: 'POM' },
  { id: 'measurements', label: 'Measurements' },
  { id: 'bom', label: 'BOM' },
  { id: 'construction', label: 'Construction' },
  { id: 'grading-files', label: 'Grading & files' },
  { id: 'release', label: 'Tech pack' },
] as const;
