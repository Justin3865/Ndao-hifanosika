// src/hooks/useProjects.ts
import { useState, useEffect, useCallback } from "react";
import { projectService, Project, ProjectFilters } from "@/services/project.service";

export interface UseProjectsReturn {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  fetchProjects: (filters?: ProjectFilters) => Promise<void>;
  getProject: (id: string) => Promise<Project | null>;
  createProject: (data: any) => Promise<Project | null>;
  updateProject: (id: string, data: any) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  updateProgress: (id: string, progress: number) => Promise<Project | null>;
  closeProject: (id: string) => Promise<Project | null>;
  exportProjects: (format: "csv" | "excel" | "pdf") => Promise<Blob | null>;
  refetch: () => Promise<void>;
  filters: ProjectFilters;
  setFilters: (filters: ProjectFilters) => void;
}

export function useProjects(initialFilters: ProjectFilters = {}): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<ProjectFilters>({
    page: 1,
    limit: 10,
    ...initialFilters,
  });

  const fetchProjects = useCallback(async (newFilters?: ProjectFilters) => {
    const currentFilters = newFilters || filters;
    setIsLoading(true);
    setError(null);
    try {
      const response = await projectService.getProjects(currentFilters);
      setProjects(response.projects);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des projets");
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const getProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      return await projectService.getProjectById(id);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement du projet");
      return null;
    }
  }, []);

  const createProject = useCallback(async (data: any): Promise<Project | null> => {
    try {
      const newProject = await projectService.createProject(data);
      await fetchProjects();
      return newProject;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du projet");
      return null;
    }
  }, [fetchProjects]);

  const updateProject = useCallback(async (id: string, data: any): Promise<Project | null> => {
    try {
      const updatedProject = await projectService.updateProject(id, data);
      await fetchProjects();
      return updatedProject;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour du projet");
      return null;
    }
  }, [fetchProjects]);

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    try {
      await projectService.deleteProject(id);
      await fetchProjects();
      return true;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression du projet");
      return false;
    }
  }, [fetchProjects]);

  const updateProgress = useCallback(async (id: string, progress: number): Promise<Project | null> => {
    try {
      const updatedProject = await projectService.updateProjectProgress(id, progress);
      await fetchProjects();
      return updatedProject;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour de la progression");
      return null;
    }
  }, [fetchProjects]);

  const closeProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      const closedProject = await projectService.closeProject(id);
      await fetchProjects();
      return closedProject;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la clôture du projet");
      return null;
    }
  }, [fetchProjects]);

  const exportProjects = useCallback(async (format: "csv" | "excel" | "pdf"): Promise<Blob | null> => {
    try {
      return await projectService.exportProjects(format);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'export des projets");
      return null;
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    isLoading,
    error,
    pagination,
    fetchProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    updateProgress,
    closeProject,
    exportProjects,
    refetch,
    filters,
    setFilters,
  };
}