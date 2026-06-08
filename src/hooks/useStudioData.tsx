import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  exportStudioData,
  getStudioData,
  hydrateStudioData,
  importStudioData,
  resetStudioData,
  saveStudioData,
  updateProjectPhaseInData,
  updateTaskStatusInData,
  type StudioData,
  type StudioDataView,
} from '../lib/studioStorage';
import type { ProjectPhase, TaskStatus } from '../types/studio';

type StudioDataContextValue = {
  data: StudioDataView;
  exportData: () => string;
  importData: (serializedData: string) => void;
  rawData: StudioData;
  resetData: () => void;
  saveData: (nextData: StudioData) => void;
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
      data: hydrateStudioData(rawData),
      exportData,
      importData,
      rawData,
      resetData,
      saveData,
      updateProjectPhase,
      updateTaskStatus,
    }),
    [
      exportData,
      importData,
      rawData,
      resetData,
      saveData,
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
