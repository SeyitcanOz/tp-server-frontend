import api from './api';

/**
 * Download service for handling file downloads
 */
export const downloadService = {
  /**
   * Downloads a project as a zip folder
   * @param projectId Project ID
   * @param versionNumber Optional version number (defaults to latest)
   * @returns A Promise that resolves when the download is complete
   */
  async downloadProjectZip(projectId: string, versionNumber?: number): Promise<void> {
    try {
      const response = await api.get(`/api/download/project/${projectId}/zip`, {
        params: { versionNumber },
        responseType: 'blob'
      });
      
      // Create a URL for the blob data
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      
      // Extract the filename from the response headers if available, or create a default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'project.zip';
      
      if (contentDisposition) {
        // Try multiple regex patterns to match different server formats
        let filenameMatch = contentDisposition.match(/filename="(.+?)"/i);
        if (!filenameMatch) {
          filenameMatch = contentDisposition.match(/filename=([^;]+)/i);
        }
        
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/["']/g, '');
        }
      }
      
      // Create a temporary link and trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('Error downloading project zip:', error);
      throw error;
    }
  },

  /**
   * Downloads the DotModel file for a project
   * @param projectId Project ID
   * @param versionNumber Optional version number (defaults to latest)
   */
  async downloadDotModel(projectId: string, versionNumber?: number): Promise<void> {
    try {
      const response = await api.get(`/api/download/project/${projectId}/dotmodel`, {
        params: { versionNumber },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'model.json';
      
      if (contentDisposition) {
        // Try multiple regex patterns to match different server formats
        let filenameMatch = contentDisposition.match(/filename="(.+?)"/i);
        if (!filenameMatch) {
          filenameMatch = contentDisposition.match(/filename=([^;]+)/i);
        }
        
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/["']/g, '');
        }
      }
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('Error downloading dot model:', error);
      throw error;
    }
  },

  /**
   * Downloads results data as CSV for a specific project
   * @param projectId Project ID
   * @param versionNumber Optional version number (defaults to latest)
   */
  async downloadResultsCsv(projectId: string, versionNumber?: number): Promise<void> {
    try {
      const response = await api.get(`/api/download/project/${projectId}/results-csv`, {
        params: { versionNumber },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'results.csv';
      
      if (contentDisposition) {
        // Try multiple regex patterns to match different server formats
        let filenameMatch = contentDisposition.match(/filename="(.+?)"/i);
        if (!filenameMatch) {
          filenameMatch = contentDisposition.match(/filename=([^;]+)/i);
        }
        
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/["']/g, '');
        }
      }
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('Error downloading results CSV:', error);
      throw error;
    }
  },

  /**
   * Downloads results data as CSV for all projects
   */
  async downloadAllProjectsResultsCsv(): Promise<void> {
    try {
      const response = await api.get('/api/download/all-projects/results-csv', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'all_projects_results.csv';
      
      if (contentDisposition) {
        // Try multiple regex patterns to match different server formats
        let filenameMatch = contentDisposition.match(/filename="(.+?)"/i);
        if (!filenameMatch) {
          filenameMatch = contentDisposition.match(/filename=([^;]+)/i);
        }
        
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/["']/g, '');
        }
      }
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('Error downloading all projects results CSV:', error);
      throw error;
    }
  }
};

export default downloadService;