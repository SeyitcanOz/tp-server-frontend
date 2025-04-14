import api from './api';
import type { 
  PagedResponse, 
  ProjectSummary, 
  ProjectDetail, 
  CreateProjectRequest, 
  UpdateProjectRequest 
} from '$lib/types/project';

/**
 * Project service for managing project-related API operations
 */
export const projectService = {
  /**
   * Get a paginated list of projects with filtering and sorting
   */
  async getProjects(
    pageNumber: number = 1,
    pageSize: number = 20,
    options: {
      userId?: string;
      searchTerm?: string;
      modellingType?: string;
      sortBy?: string;
      sortDescending?: boolean;
    } = {}
  ): Promise<PagedResponse<ProjectSummary>> {
    const { userId, searchTerm, modellingType, sortBy, sortDescending } = options;
    
    const response = await api.get<PagedResponse<ProjectSummary>>('/api/projects', {
      params: {
        pageNumber,
        pageSize,
        userId,
        searchTerm,
        modellingType,
        sortBy,
        sortDescending
      }
    });
    
    return response.data;
  },

  /**
   * Get a project by ID
   */
  async getProjectById(id: string): Promise<ProjectDetail> {
    const response = await api.get<ProjectDetail>(`/api/projects/${id}`);
    return response.data;
  },

  /**
   * Get available modelling types for filtering
   */
  async getModellingTypes(): Promise<string[]> {
    const response = await api.get<string[]>('/api/projects/modelling-types');
    return response.data;
  },

  /**
   * Create a new project
   */
  async createProject(project: CreateProjectRequest): Promise<ProjectDetail> {
    const response = await api.post<ProjectDetail>('/api/projects', project);
    return response.data;
  },

  /**
   * Update an existing project
   */
  async updateProject(id: string, project: UpdateProjectRequest): Promise<ProjectDetail> {
    const response = await api.put<ProjectDetail>(`/api/projects/${id}`, project);
    return response.data;
  },

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    await api.delete(`/api/projects/${id}`);
  }
};

export default projectService;