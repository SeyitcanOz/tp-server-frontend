import api from './api';
import type { ProjectDetail } from '$lib/types/project';
import type { ProjectVersion } from '$lib/types/version';

/**
 * Service for handling file uploads for projects and versions
 */
export const uploadService = {
  /**
   * Upload files to create a new project
   * @param projectName The name of the project
   * @param modellingType The modelling type (e.g., 'RC', 'Masonry')
   * @param files Object containing the project files
   * @returns Promise with the created project details
   */
  async createProject(
    projectName: string,
    modellingType: string,
    files: {
      project: File | null;
      modelInfo?: File | null;
      model?: File | null;
      modelInput?: File | null;
      results?: File | null;
    }
  ): Promise<ProjectDetail> {
    // Validate required project file
    if (!files.project) {
      throw new Error('Project.json file is required');
    }
    
    // Create FormData for the request
    const formData = new FormData();
    formData.append('projectName', projectName);
    formData.append('modellingType', modellingType);
    
    // Append each file to the FormData
    formData.append('files', files.project);
    
    if (files.modelInfo) {
      formData.append('files', files.modelInfo);
    }
    
    if (files.model) {
      formData.append('files', files.model);
    }
    
    if (files.modelInput) {
      formData.append('files', files.modelInput);
    }
    
    if (files.results) {
      formData.append('files', files.results);
    }
    
    try {
      const response = await api.post<ProjectDetail>('/api/upload/project', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error uploading project files:', error);
      handleUploadError(error);
      throw error;
    }
  },
  
  /**
   * Upload files to create a new version of an existing project
   * @param projectId The ID of the project to create a version for
   * @param files Object containing the version files
   * @returns Promise with the created version details
   */
  async createVersion(
    projectId: string,
    files: {
      project: File | null;
      modelInfo?: File | null;
      model?: File | null;
      modelInput?: File | null;
      results?: File | null;
    }
  ): Promise<ProjectVersion> {
    // Validate required project file
    if (!files.project) {
      throw new Error('Project.json file is required');
    }
    
    // Create FormData for the request
    const formData = new FormData();
    
    // Append each file to the FormData
    formData.append('files', files.project);
    
    if (files.modelInfo) {
      formData.append('files', files.modelInfo);
    }
    
    if (files.model) {
      formData.append('files', files.model);
    }
    
    if (files.modelInput) {
      formData.append('files', files.modelInput);
    }
    
    if (files.results) {
      formData.append('files', files.results);
    }
    
    try {
      const response = await api.post<ProjectVersion>(`/api/upload/version/${projectId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error uploading version files:', error);
      handleUploadError(error);
      throw error;
    }
  }
};

/**
 * Helper function to handle and extract error messages from upload errors
 */
function handleUploadError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: string | { message?: string } } };
    
    if (typeof axiosError.response?.data === 'string') {
      return axiosError.response.data;
    } else if (typeof axiosError.response?.data === 'object') {
      return axiosError.response.data.message || 'Upload failed. Please check your files and try again.';
    }
  }
  
  return 'Upload failed. Please check your files and try again.';
}

export default uploadService;