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
  createNoteInData,
  createProjectInData,
  createTaskInData,
  deleteFabricInData,
  deleteNoteInData,
  deleteProjectInData,
  deleteTaskInData,
  exportStudioData,
  getStudioData,
  hydrateStudioData,
  importStudioData,
  resetStudioData,
  saveStudioData,
  updateFabricInData,
  updateNoteInData,
  updateProjectInData,
  updateProjectPhaseInData,
  updateTaskInData,
  updateTaskStatusInData,
  type StudioData,
  type StudioDataView,
  type StoredProject,
} from '../lib/studioStorage';
import type {
  Fabric,
  ProjectPhase,
  StudioNote,
  StudioTask,
  TaskStatus,
} from '../types/studio';

type StudioDataContextValue = {
  createFabric: (fabric: Fabric) => void;
  createNote: (note: StudioNote) => void;
  createProject: (project: StoredProject) => void;
  createTask: (task: StudioTask) => void;
  data: StudioDataView;
  deleteFabric: (fabricId: string) => void;
  deleteNote: (noteId: string) => void;
  deleteProject: (projectId: string) => void;
  deleteTask: (taskId: string) => void;
  exportData: () => string;
  importData: (serializedData: string) => void;
  rawData: StudioData;
  resetData: () => void;
  saveData: (nextData: StudioData) => void;
  updateFabric: (fabric: Fabric) => void;
  updateNote: (note: StudioNote) => void;
  updateProject: (project: StoredProject) => void;
  updateProjectPhase: (projectId: string, phase: ProjectPhase) => void;
  updateTask: (task: StudioTask) => void;
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

  const createTask = useCallback((task: StudioTask) => {
    setRawData((current) => {
      const nextData = createTaskInData(current, task);
      saveStudioData(nextData);
      return nextData;
    });
  }, []);

  const createNote = useCallback((note: StudioNote) => {
    setRawData((current) => {
      const nextData = createNoteInData(current, note);
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

  const updateTask = useCallback((task: StudioTask) => {
    setRawData((current) => {
      const nextData = updateTaskInData(current, task);
      saveStudioData(nextData);
      return nextData;
    });
  }, []);

  const updateNote = useCallback((note: StudioNote) => {
    setRawData((current) => {
      const nextData = updateNoteInData(current, note);
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

  const deleteNote = useCallback((noteId: string) => {
    setRawData((current) => {
      const nextData = deleteNoteInData(current, noteId);
      saveStudioData(nextData);
      return nextData;
    });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setRawData((current) => {
      const nextData = deleteTaskInData(current, taskId);
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
      createNote,
      createProject,
      createTask,
      data: hydrateStudioData(rawData),
      deleteFabric,
      deleteNote,
      deleteProject,
      deleteTask,
      exportData,
      importData,
      rawData,
      resetData,
      saveData,
      updateFabric,
      updateNote,
      updateProject,
      updateProjectPhase,
      updateTask,
      updateTaskStatus,
    }),
    [
      createFabric,
      createNote,
      createProject,
      createTask,
      deleteFabric,
      deleteNote,
      deleteProject,
      deleteTask,
      exportData,
      importData,
      rawData,
      resetData,
      saveData,
      updateFabric,
      updateNote,
      updateProject,
      updateProjectPhase,
      updateTask,
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
