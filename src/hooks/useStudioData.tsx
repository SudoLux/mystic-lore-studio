import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createProjectInData,
  deleteProjectInData,
  exportStudioData,
  getStudioData,
  hydrateStudioData,
  importStudioData,
  resetStudioData,
  saveStudioData,
  updateProjectInData,
  updateProjectPhaseInData,
  updateTaskStatusInData,
  type StudioData,
  type StudioDataView,
  type StoredProject,
} from '../lib/studioStorage';
import type { ProjectPhase, TaskStatus } from '../types/studio';

type StudioDataContextValue = {
  createProject: (project: StoredProject) => void;
  data: StudioDataView;
  deleteProject: (projectId: string) => void;
  exportData: () => string;
  importData: (serializedData: string) => void;
  rawData: StudioData;
  resetData: () => void;
  saveData: (nextData: StudioData) => void;
  updateProject: (project: StoredProject) => void;
  updateProjectPhase: (projectId: string, phase: ProjectPhase) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
};

const StudioDataContext = createContext<StudioDataContextValue | null>(null);

export function StudioDataProvider({ children }: { children: ReactNode }) {
  const [rawData, setRawData] = useState<StudioData>(() => getStudioData());

  const saveData = useCallback((nextData: StudioData) => {
    saveStudioData(nextData);
    setRawData(nextData);
  }, []);

  const resetData = useCallback(() => {
    setRawData(resetStudioData());
  }, []);

  const exportData = useCallback(() => exportStudioData(rawData), [rawData]);

  const importData = useCallback(
    (serializedData: string) => {
      saveData(importStudioData(serializedData));
    },
    [saveData],
  );

  const createProject = useCallback((project: StoredProject) => {
    setRawData((current) => {
      const nextData = createProjectInData(current, project);
      saveStudioData(nextData);
      return nextData;
    });
  }, []);

  const updateProject = useCallback((project: StoredProject) => {
    setRawData((current) => {
      const nextData = updateProjectInData(current, project);
      saveStudioData(nextData);
      return nextData;
    });
  }, []);

  const deleteProject = useCallback((projectId: string) => {
    setRawData((current) => {
      const nextData = deleteProjectInData(current, projectId);
      saveStudioData(nextData);
      return nextData;
    });
  }, []);

  const updateProjectPhase = useCallback(
    (projectId: string, phase: ProjectPhase) => {
      setRawData((current) => {
        const nextData = updateProjectPhaseInData(current, projectId, phase);
        saveStudioData(nextData);
        return nextData;
      });
    },
    [],
  );

  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setRawData((current) => {
      const nextData = updateTaskStatusInData(current, taskId, status);
      saveStudioData(nextData);
      return nextData;
    });
  }, []);

  const value = useMemo<StudioDataContextValue>(
    () => ({
      createProject,
      data: hydrateStudioData(rawData),
      deleteProject,
      exportData,
      importData,
      rawData,
      resetData,
      saveData,
      updateProject,
      updateProjectPhase,
      updateTaskStatus,
    }),
    [
      createProject,
      deleteProject,
      exportData,
      importData,
      rawData,
      resetData,
      saveData,
      updateProject,
      updateProjectPhase,
      updateTaskStatus,
    ],
  );

  return (
    <StudioDataContext.Provider value={value}>
      {children}
    </StudioDataContext.Provider>
  );
}

export function useStudioData() {
  const context = useContext(StudioDataContext);

  if (!context) {
    throw new Error('useStudioData must be used inside StudioDataProvider.');
  }

  return context;
}
