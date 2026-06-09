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
  createLinkedMaterialInData,
  createNoteInData,
  createProjectInData,
  createTaskInData,
  deleteFabricInData,
  deleteLinkedMaterialInData,
  deleteNoteInData,
  deleteProjectInData,
  deleteTaskInData,
  exportStudioData,
  getStudioData,
  hydrateStudioData,
  importStudioData,
  previewStudioDataImport,
  resetStudioData,
  saveStudioData,
  updateFabricInData,
  updateLinkedMaterialInData,
  updateNoteInData,
  updateProjectInData,
  updateProjectPhaseInData,
  updateTaskInData,
  updateTaskStatusInData,
  upsertLookbookPageInData,
  type StudioData,
  type StudioDataView,
  type ImportPreview,
  type StoredProject,
} from '../lib/studioStorage';
import type {
  Fabric,
  LinkedMaterial,
  LookbookPage,
  ProjectPhase,
  StudioNote,
  StudioTask,
  TaskStatus,
} from '../types/studio';

type StudioDataContextValue = {
  createFabric: (fabric: Fabric) => void;
  createLinkedMaterial: (linkedMaterial: LinkedMaterial) => void;
  createNote: (note: StudioNote) => void;
  createProject: (project: StoredProject) => void;
  createTask: (task: StudioTask) => void;
  data: StudioDataView;
  deleteFabric: (fabricId: string) => void;
  deleteLinkedMaterial: (linkedMaterialId: string) => void;
  deleteNote: (noteId: string) => void;
  deleteProject: (projectId: string) => void;
  deleteTask: (taskId: string) => void;
  exportData: () => string;
  importData: (serializedData: string) => void;
  previewImportData: (serializedData: string) => ImportPreview;
  rawData: StudioData;
  resetData: () => void;
  saveLookbookPage: (lookbookPage: LookbookPage) => void;
  saveData: (nextData: StudioData) => void;
  updateFabric: (fabric: Fabric) => void;
  updateLinkedMaterial: (linkedMaterial: LinkedMaterial) => void;
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
  const previewImportData = useCallback(
    (serializedData: string) => previewStudioDataImport(serializedData),
    [],
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

  const createLinkedMaterial = useCallback((linkedMaterial: LinkedMaterial) => {
    setRawData((current) => {
      const nextData = createLinkedMaterialInData(current, linkedMaterial);
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

  const updateLinkedMaterial = useCallback((linkedMaterial: LinkedMaterial) => {
    setRawData((current) => {
      const nextData = updateLinkedMaterialInData(current, linkedMaterial);
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

  const deleteLinkedMaterial = useCallback((linkedMaterialId: string) => {
    setRawData((current) => {
      const nextData = deleteLinkedMaterialInData(current, linkedMaterialId);
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

  const saveLookbookPage = useCallback((lookbookPage: LookbookPage) => {
    setRawData((current) => {
      const nextData = upsertLookbookPageInData(current, lookbookPage);
      saveStudioData(nextData);
      return nextData;
    });
  }, []);

  const value = useMemo<StudioDataContextValue>(
    () => ({
      createFabric,
      createLinkedMaterial,
      createNote,
      createProject,
      createTask,
      data: hydrateStudioData(rawData),
      deleteFabric,
      deleteLinkedMaterial,
      deleteNote,
      deleteProject,
      deleteTask,
      exportData,
      importData,
      previewImportData,
      rawData,
      resetData,
      saveLookbookPage,
      saveData,
      updateFabric,
      updateLinkedMaterial,
      updateNote,
      updateProject,
      updateProjectPhase,
      updateTask,
      updateTaskStatus,
    }),
    [
      createFabric,
      createLinkedMaterial,
      createNote,
      createProject,
      createTask,
      deleteFabric,
      deleteLinkedMaterial,
      deleteNote,
      deleteProject,
      deleteTask,
      exportData,
      importData,
      previewImportData,
      rawData,
      resetData,
      saveLookbookPage,
      saveData,
      updateFabric,
      updateLinkedMaterial,
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
