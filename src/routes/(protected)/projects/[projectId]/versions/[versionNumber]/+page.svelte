<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { user } from '$lib/stores/auth';
  import api from '$lib/services/api';
  import type { ProjectDetail } from '$lib/types/project';
  import type { ProjectVersion } from '$lib/types/version';
  
  // Type definitions for the results data
  interface ResultRow {
      [key: string]: any;
  }
  
  interface ResultsData {
      metadata?: { rowCount: number };
      rows?: ResultRow[];
  }
  
  // Extend the ProjectVersion type to include properly typed resultsData
  type ExtendedProjectVersion = ProjectVersion & {
      resultsData?: ResultsData;
  };
  
  // Project and version data
  let project: ProjectDetail | null = null;
  let version: ExtendedProjectVersion | null = null;
  let isLoading = true;
  let error: string | null = null;
  
  // For results table pagination
  let currentPage = 1;
  let pageSize = 48;
  let totalPages = 1;
  
  // Download state tracking
  let isDownloading: Record<string, boolean> = {
    'project': false,
    'dotmodel': false,
    'results': false
  };
  
  // Extract IDs from URL parameters
  $: projectId = $page.params.projectId;
  $: versionNumber = parseInt($page.params.versionNumber);
  
  // Check if user is admin or project owner
  $: isAdminOrOwner = $user && ($user.roles.includes('Admin') || ($user.id === project?.createdBy));
  
  // Filter results data for pagination
  $: paginatedResults = version?.resultsData?.rows 
    ? version.resultsData.rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : [];
  
  // Calculate total pages for results pagination
  $: {
    if (version?.resultsData?.rows && Array.isArray(version.resultsData.rows)) {
      totalPages = Math.ceil(version.resultsData.rows.length / pageSize);
    } else {
      totalPages = 1;
    }
  }
  
  // Check what data is available
  $: hasProjectData = !!version?.projectData && Object.keys(version.projectData).length > 0;
  $: hasModelInfoData = !!version?.modelInfoData && Object.keys(version.modelInfoData).length > 0;
  $: hasDotModelData = !!version?.dotModelData && Object.keys(version.dotModelData).length > 0;
  $: hasResultsData = !!version?.resultsData?.rows && version.resultsData.rows.length > 0;
  
  async function loadData() {
    isLoading = true;
    error = null;
    
    try {
      // Load project data
      const projectResponse = await api.get<ProjectDetail>(`/api/projects/${projectId}`);
      project = projectResponse.data;
      
      // Load version data
      const versionResponse = await api.get<ProjectVersion>(`/api/versions/${projectId}/${versionNumber}`);
      version = versionResponse.data;
    } catch (err) {
      console.error('Error fetching data:', err);
      error = 'Failed to load version details. Please try again.';
    } finally {
      isLoading = false;
    }
  }
  
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Navigate to previous/next version if available
  function goToVersion(newVersionNumber: number) {
    if (newVersionNumber >= 1 && newVersionNumber <= (project?.currentVersion || 0)) {
      window.location.href = `/projects/${projectId}/versions/${newVersionNumber}`;
    }
  }
  
  // Mark this version as the current version
  async function makeCurrentVersion() {
    if (!confirm('Set this as the current version?')) {
      return;
    }
    
    try {
      await api.post(`/api/versions/${projectId}/${versionNumber}/setcurrent`);
      // Reload data to refresh the UI
      await loadData();
    } catch (err) {
      console.error('Error setting current version:', err);
      alert('Failed to update current version. Please try again.');
    }
  }
  
  // Download handlers with proper authentication
  async function downloadProjectZip() {
    if (isDownloading.project || !hasProjectData) return;
    
    try {
      isDownloading.project = true;
      
      // Make an authenticated request for the file using our API instance
      const response = await api.get(`/api/download/project/${projectId}/zip?versionNumber=${versionNumber}`, {
        responseType: 'blob' // Important: tells axios to handle the response as binary data
      });
      
      // Create a URL for the blob data
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      
      // Create a safe filename
      const safeName = project?.projectName?.replace(/[^a-z0-9-]/gi, '_') || 'project';
      const filename = `${safeName}_v${versionNumber}.zip`;
      
      // Create a temporary link and trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading project:', err);
      alert('Failed to download project. Please try again.');
    } finally {
      isDownloading.project = false;
    }
  }
  
  async function downloadDotModel() {
    if (isDownloading.dotmodel || !hasDotModelData) return;
    
    try {
      isDownloading.dotmodel = true;
      
      const response = await api.get(`/api/download/project/${projectId}/dotmodel?versionNumber=${versionNumber}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      
      const safeName = project?.projectName?.replace(/[^a-z0-9-]/gi, '_') || 'model';
      const filename = `${safeName}_v${versionNumber}.model`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading model file:', err);
      alert('Failed to download model file. Please try again.');
    } finally {
      isDownloading.dotmodel = false;
    }
  }
  
  async function downloadResultsCsv() {
    if (isDownloading.results || !hasResultsData) return;
    
    try {
      isDownloading.results = true;
      
      const response = await api.get(`/api/download/project/${projectId}/results-csv?versionNumber=${versionNumber}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const safeName = project?.projectName?.replace(/[^a-z0-9-]/gi, '_') || 'results';
      const filename = `${safeName}_results_v${versionNumber}.csv`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading results CSV:', err);
      alert('Failed to download results. Please try again.');
    } finally {
      isDownloading.results = false;
    }
  }
  
  // Pagination handlers
  function changePage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
    }
  }
  
  // Get the column headers for the results table
  function getResultsHeaders(): string[] {
    if (!version?.resultsData?.rows || 
        !Array.isArray(version.resultsData.rows) || 
        version.resultsData.rows.length === 0) {
      return [];
    }
    
    return Object.keys(version.resultsData.rows[0] || {});
  }
  
  // Format cell value for display
  function formatCellValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }
  
  // Add the pageTitle reactive declaration
  $: pageTitle = project && version 
    ? `Version #${versionNumber} of ${project.projectName} - TPServer` 
    : 'Version Details - TPServer';
  
  onMount(() => {
    loadData();
  });
</script>

<svelte:head>
<title>{pageTitle}</title>
</svelte:head>

<div class="container version-container">
{#if isLoading}
  <div class="loading">
    <div class="loading-spinner"></div>
    <p>Loading version details...</p>
  </div>
{:else if error}
  <div class="error-message">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <p>{error}</p>
    <div class="error-actions">
      <button class="btn btn-primary" on:click={loadData}>Try Again</button>
      <a href={`/projects/${projectId}`} class="btn btn-outline">Back to Project</a>
    </div>
  </div>
{:else if project && version}
  <div class="page-header">
    <div class="breadcrumbs">
      <a href="/projects">Projects</a> &gt; 
      <a href={`/projects/${projectId}`}>{project.projectName}</a> &gt; 
      Version #{versionNumber}
    </div>
    
    <div class="header-content">
      <div class="header-left">
        <h1>Version #{versionNumber}</h1>
        <p class="version-date">Created on {formatDate(version.createdAt)}</p>
        
        <div class="version-status">
          {#if versionNumber === project.currentVersion}
            <div class="current-version">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Current Version</span>
            </div>
          {:else}
            <div class="older-version">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Previous Version</span>
            </div>
          {/if}
        </div>
      </div>
      
      <div class="header-actions">
        <div class="version-navigation">
          <button 
            class="btn btn-outline btn-nav" 
            disabled={versionNumber <= 1}
            on:click={() => goToVersion(versionNumber - 1)}
            title={versionNumber <= 1 ? "This is the first version" : `Go to version ${versionNumber - 1}`}
            aria-label={versionNumber <= 1 ? "This is the first version" : `Go to version ${versionNumber - 1}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Previous Version
          </button>
          <button 
            class="btn btn-outline btn-nav" 
            disabled={versionNumber >= project.currentVersion}
            on:click={() => goToVersion(versionNumber + 1)}
            title={versionNumber >= project.currentVersion ? "This is the latest version" : `Go to version ${versionNumber + 1}`}
            aria-label={versionNumber >= project.currentVersion ? "This is the latest version" : `Go to version ${versionNumber + 1}`}
          >
            Next Version
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
        
        {#if isAdminOrOwner && versionNumber !== project.currentVersion}
          <button class="btn btn-primary" on:click={makeCurrentVersion}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Set as Current
          </button>
        {/if}
      </div>
    </div>
  </div>

  <div class="main-layout">
    <div class="main-content">
      <!-- Results Section -->
      <div class="results-section">
        <h2>Analysis Results</h2>
        
        {#if hasResultsData}
          <div class="results-table-container">
            <div class="table-wrapper">
              <table class="results-table">
                <thead>
                  <tr>
                    {#each getResultsHeaders() as header}
                      <th>{header}</th>
                    {/each}
                  </tr>
                </thead>
                <tbody>
                  {#each paginatedResults as row}
                    <tr>
                      {#each getResultsHeaders() as header}
                        <td>{formatCellValue(row[header])}</td>
                      {/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            
            {#if totalPages > 1}
              <div class="pagination">
                <button 
                  class="pagination-btn" 
                  disabled={currentPage === 1} 
                  on:click={() => changePage(1)}
                  title="First page"
                  aria-label="Go to first page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="11 17 6 12 11 7"></polyline>
                    <polyline points="18 17 13 12 18 7"></polyline>
                  </svg>
                </button>
                
                <button 
                  class="pagination-btn" 
                  disabled={currentPage === 1} 
                  on:click={() => changePage(currentPage - 1)}
                  title="Previous page"
                  aria-label="Go to previous page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                
                <div class="page-info">
                  <span class="current-page">{currentPage}</span>
                  <span class="page-divider">of</span>
                  <span class="total-pages">{totalPages}</span>
                </div>
                
                <button 
                  class="pagination-btn" 
                  disabled={currentPage === totalPages} 
                  on:click={() => changePage(currentPage + 1)}
                  title="Next page"
                  aria-label="Go to next page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
                
                <button 
                  class="pagination-btn" 
                  disabled={currentPage === totalPages} 
                  on:click={() => changePage(totalPages)}
                  title="Last page"
                  aria-label="Go to last page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="13 17 18 12 13 7"></polyline>
                    <polyline points="6 17 11 12 6 7"></polyline>
                  </svg>
                </button>
              </div>
            {/if}
          </div>
        {:else}
          <div class="no-results">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <p>No results data available for this version</p>
          </div>
        {/if}
      </div>
    </div>
    
    <div class="sidebar">
      <!-- Version Info Card -->
      <div class="info-card">
        <h3>Version Details</h3>
        <div class="info-content">
          <div class="info-item">
            <span class="label">Version Number</span>
            <span class="value">{version.versionNumber}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Created At</span>
            <span class="value">{formatDate(version.createdAt)}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Project Name</span>
            <span class="value project-name">{project.projectName}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Modelling Type</span>
            <span class="value modeling-type">{project.modellingType}</span>
          </div>
        </div>
      </div>
      
      <!-- Files & Downloads -->
      <div class="download-card">
        <h3>Downloads</h3>
        <div class="download-list">
          <button 
            class="download-item" 
            class:disabled={!hasProjectData}
            disabled={!hasProjectData || isDownloading.project}
            on:click={downloadProjectZip}
          >
            {#if isDownloading.project}
              <div class="button-spinner"></div>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            {/if}
            <div>
              <span class="item-name">Project Files (ZIP)</span>
              <span class="item-status">{hasProjectData ? 'Available' : 'Not available'}</span>
            </div>
          </button>
          
          <button 
            class="download-item" 
            class:disabled={!hasDotModelData}
            disabled={!hasDotModelData || isDownloading.dotmodel}
            on:click={downloadDotModel}
          >
            {#if isDownloading.dotmodel}
              <div class="button-spinner"></div>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
            {/if}
            <div>
              <span class="item-name">MODEL File</span>
              <span class="item-status">{hasDotModelData ? 'Available' : 'Not available'}</span>
            </div>
          </button>
          
          <button 
            class="download-item" 
            class:disabled={!hasResultsData}
            disabled={!hasResultsData || isDownloading.results}
            on:click={downloadResultsCsv}
          >
            {#if isDownloading.results}
              <div class="button-spinner"></div>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            {/if}
            <div>
              <span class="item-name">Results (CSV)</span>
              <span class="item-status">{hasResultsData ? 'Available' : 'Not available'}</span>
            </div>
          </button>
        </div>
      </div>
      
      <!-- Actions Card -->
      <div class="actions-card">
        <h3>Actions</h3>
        <div class="action-buttons">
          <a href={`/projects/${projectId}`} class="action-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Back to Project
          </a>
          
          <a href={`/projects/${projectId}/versions`} class="action-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            All Versions
          </a>
          
          {#if isAdminOrOwner}
            <a href={`/projects/${projectId}/versions/new`} class="action-button primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create New Version
            </a>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
</div>

<style>
/* Base Styles */
.version-container {
  padding: 2rem 0;
  max-width: 1400px;
  margin: 0 auto;
}

/* Loading and Error States */
.loading, .error-message {
  padding: 4rem 2rem;
  text-align: center;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 2rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(58, 134, 255, 0.2);
  border-left-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-message {
  color: var(--danger-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.error-message svg {
  color: var(--danger-color);
  width: 48px;
  height: 48px;
}

.error-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

/* Page Header & Breadcrumbs */
.breadcrumbs {
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.breadcrumbs a {
  color: var(--primary-color);
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumbs a:hover {
  color: var(--primary-dark);
  text-decoration: underline;
}

.page-header {
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  display: flex;
  flex-direction: column;
}

h1 {
  font-size: 2.5rem;
  color: var(--secondary-color);
  margin: 0;
  margin-bottom: 0.5rem;
  font-weight: 700;
}

.version-date {
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin: 0;
}

/* Version Status Badge */
.version-status {
  margin-top: 1rem;
}

.current-version, .older-version {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.9rem;
}

.current-version {
  background-color: rgba(56, 176, 0, 0.1);
  color: var(--success-color);
  border: 1px solid rgba(56, 176, 0, 0.2);
}

.older-version {
  background-color: rgba(107, 114, 128, 0.1);
  color: var(--text-secondary);
  border: 1px solid rgba(107, 114, 128, 0.2);
}

/* Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.version-navigation {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.75rem 1.25rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  border: none;
  font-size: 0.95rem;
}

.btn svg {
  flex-shrink: 0;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn-outline {
  background-color: transparent;
  border: 1px solid #dee2e6;
  color: var(--text-color);
}

.btn-outline:hover:not(:disabled) {
  background-color: #f8f9fa;
  border-color: #c1c9d0;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Main Layout */
.main-layout {
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 1.5rem;
}

.main-content {
  display: flex;
  flex-direction: column;
}

/* Results Section */
.results-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  height: 100%;
}

.results-section h2 {
  font-size: 1.5rem;
  color: var(--secondary-color);
  margin-top: 0;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 0.75rem;
  text-align: center;
}

.results-table-container {
  display: flex;
  flex-direction: column;
  height: calc(100% - 70px);
}

.table-wrapper {
  overflow-x: auto;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  flex-grow: 1;
  height: 550px; /* Increased height */
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  table-layout: fixed;
}

.results-table th {
  background-color: #f8f9fa;
  padding: 0.5rem 0.75rem;
  text-align: center;
  font-weight: 600;
  color: var(--secondary-color);
  border-bottom: 2px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 10;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.results-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-color);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.results-table tr:hover td {
  background-color: rgba(58, 134, 255, 0.04);
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  color: var(--text-secondary);
  height: 100%;
  padding: 4rem;
  text-align: center;
}

.no-results svg {
  opacity: 0.4;
}

/* Pagination Styles */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;
  gap: 0.5rem;
}

.pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  display: flex;
  align-items: center;
  padding: 0 0.75rem;
  height: 32px;
  background-color: #f8f9fa;
  border-radius: 6px;
  font-size: 0.9rem;
}

.current-page {
  font-weight: 600;
  color: var(--primary-color);
}

.page-divider {
  margin: 0 0.5rem;
  color: var(--text-secondary);
}

.total-pages {
  color: var(--text-secondary);
}

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-card, .download-card, .actions-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
}

.info-card h3, .download-card h3, .actions-card h3 {
  font-size: 1.25rem;
  color: var(--secondary-color);
  margin-top: 0;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 0.75rem;
  text-align: center;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.value {
  font-size: 1rem;
  color: var(--text-color);
  font-weight: 500;
}

.project-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--secondary-color);
  font-weight: 600;
}

.modeling-type {
  padding: 0.25rem 0.5rem;
  background-color: rgba(58, 134, 255, 0.1);
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 0.85rem;
  display: inline-block;
}

/* Download Section - Improved Minimalist */
.download-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.download-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem;
  background-color: #f8f9fa;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;
}

.download-item:hover:not(.disabled):not(:disabled) {
  background-color: #e9ecef;
}

.download-item.disabled, .download-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.download-item svg {
  color: var(--primary-color);
  flex-shrink: 0;
}

.download-item > div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-grow: 1;
}

.item-name {
  font-weight: 600;
  color: var(--text-color);
}

.item-status {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.button-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(58, 134, 255, 0.3);
  border-left-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Action Buttons */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  color: var(--text-color);
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
}

.action-button:hover {
  background-color: #e9ecef;
  transform: translateY(-2px);
}

.action-button.primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.action-button.primary:hover {
  background-color: var(--primary-dark);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Responsive */
@media (max-width: 1024px) {
  .main-layout {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .sidebar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }
  
  .table-wrapper {
    height: 450px;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .version-navigation {
    width: 100%;
  }
  
  .btn-nav {
    flex: 1;
  }
  
  .sidebar {
    grid-template-columns: 1fr;
  }
  
  .table-wrapper {
    height: 350px;
  }
}
</style>