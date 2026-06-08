import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createFabricInData,
  createProjectInData,
  deleteFabricInData,
  deleteProjectInData,
  exportStudioData,
  getStudioData,
  hydrateStudioData,
  importStudioData,
  resetStudioData,
  saveStudioData,
  updateFabricInData,
  updateProjectInData,
  updateProjectPhaseInData,
  updateTaskStatusInData,
  type StudioData,
  type StudioDataView,
  type StoredProject,
} from '../lib/studioStorage';
import type { Fabric, ProjectPhase, TaskStatus } from '../types/studio';

type StudioDataContextValue = {
  createFabric: (fabric: Fabric) => void;
  createProject: (project: StoredProject) => void;
  data: StudioDataView;
  deleteFabric: (fabricId: string) => void;
  deleteProject: (projectId: string) => void;
  exportData: () => string;
  importData: (serializedData: string) => void;
  rawData: StudioData;
  resetData: () => void;
  saveData: (nextData: StudioData) => void;
  updateFabric: (fabric: Fabric) => void;
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

  const createFabric = useCallback((fabric: Fabric) => {
    setRawData((current) => {
      const nextData = createFabricInData(current, fabric);
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

  const updateFabric = useCallback((fabric: Fabric) => {
    setRawData((current) => {
      const nextData = updateFabricInData(current, fabric);
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

  const deleteFabric = useCallback((fabricId: string) => {
    setRawData((current) => {
      const nextData = deleteFabricInData(current, fabricId);
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
      createFabric,
      createProject,
      data: hydrateStudioData(rawData),
      deleteFabric,
      deleteProject,
      exportData,
      importData,
      rawData,
      resetData,
      saveData,
      updateFabric,
      updateProject,
      updateProjectPhase,
      updateTaskStatus,
    }),
    [
      createFabric,
      createProject,
      deleteFabric,
      deleteProject,
      exportData,
      importData,
      rawData,
      resetData,
      saveData,
      updateFabric,
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
