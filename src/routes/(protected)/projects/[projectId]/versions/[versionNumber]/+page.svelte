<!-- src/routes/(protected)/projects/[projectId]/versions/[versionNumber]/+page.svelte -->
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
      resultsData?: ResultsData | null;
  };
  
  // Project and version data
  let project: ProjectDetail | null = null;
  let version: ExtendedProjectVersion | null = null;
  let isLoading = true;
  let error: string | null = null;
  
  // For results table pagination
  let currentPage = 1;
  let pageSize = 20;
  let totalPages = 1;
  let sortColumn: string = "";
  let sortDirection: 'asc' | 'desc' = 'asc';
  let filteredResults: ResultRow[] = [];
  let availableColumns: string[] = [];
  
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
  
  // Apply filtering and sorting to results
  $: {
    if (version?.resultsData?.rows) {
      // Apply filtering if filter text exists
      filteredResults = [...version.resultsData.rows];
      
      // Apply sorting if a column is selected
      if (sortColumn) {
        filteredResults.sort((a, b) => {
          const aValue = a[sortColumn];
          const bValue = b[sortColumn];
          
          // Handle different types of values
          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
          } else {
            const aString = String(aValue || '');
            const bString = String(bValue || '');
            return sortDirection === 'asc' 
              ? aString.localeCompare(bString) 
              : bString.localeCompare(aString);
          }
        });
      }
      
      // Recalculate pagination
      totalPages = Math.ceil(filteredResults.length / pageSize);
      
      // If current page is out of bounds after filtering, reset to page 1
      if (currentPage > totalPages && totalPages > 0) {
        currentPage = 1;
      }
    } else {
      filteredResults = [];
    }
  }
  
  // Paginated results based on filtered and sorted data
  $: paginatedResults = filteredResults.slice(
    (currentPage - 1) * pageSize, 
    currentPage * pageSize
  );
  
  // Check what data is available
  $: hasProjectData = !!version?.projectData && Object.keys(version.projectData || {}).length > 0;
  $: hasModelInfoData = !!version?.modelInfoData && Object.keys(version.modelInfoData || {}).length > 0;
  $: hasDotModelData = !!version?.dotModelData && Object.keys(version.dotModelData || {}).length > 0;
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
      
      // Get available columns for table
      if (version?.resultsData?.rows && version.resultsData.rows.length > 0) {
        availableColumns = Object.keys(version.resultsData.rows[0]);
      }
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
      
      // Make an authenticated request for the file
      const response = await api.get(`/api/download/project/${projectId}/zip?versionNumber=${versionNumber}`, {
        responseType: 'blob'
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
  
  // Sort results by column
  function sortByColumn(column: string) {
    if (sortColumn === column) {
      // If already sorting by this column, toggle direction
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, default to ascending
      sortColumn = column;
      sortDirection = 'asc';
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
    return availableColumns;
  }
  
  // Format cell value for display
  function formatCellValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }
  
  // Page title
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
        </div>
        
        <div class="header-actions">
          <!-- Version Navigation -->
          <div class="version-navigation">
            <button 
              class="btn btn-outline btn-nav" 
              disabled={versionNumber <= 1}
              on:click={() => goToVersion(versionNumber - 1)}
              title={versionNumber <= 1 ? "This is the first version" : `Go to version ${versionNumber - 1}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Previous
            </button>
            <button 
              class="btn btn-outline btn-nav" 
              disabled={versionNumber >= project.currentVersion}
              on:click={() => goToVersion(versionNumber + 1)}
              title={versionNumber >= project.currentVersion ? "This is the latest version" : `Go to version ${versionNumber + 1}`}
            >
              Next
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
          
          {#if isAdminOrOwner && versionNumber !== project.currentVersion}
            <button class="btn btn-primary" on:click={makeCurrentVersion}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Set as Current
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Combined Information and Downloads Card -->
    <div class="unified-card">
      <!-- Version Information Section -->
      <div class="card-section">
        <div class="section-header">
          <h2>Version Information</h2>
        </div>
        <div class="info-row">
          <div class="info-item">
            <span class="label">Version ID</span>
            <span class="value">{version.id}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Created On</span>
            <span class="value">{formatDate(version.createdAt)}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Status</span>
            <span class="value">
              {#if versionNumber === project.currentVersion}
                <span class="status-indicator current">Current Version</span>
              {:else}
                <span class="status-indicator">Previous Version</span>
              {/if}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="card-divider"></div>
      
      <!-- Downloads Section -->
      <div class="card-section">
        <div class="section-header">
          <h2>Downloads</h2>
        </div>
        <div class="download-row">
          <button 
            class="download-btn" 
            class:disabled={!hasProjectData}
            disabled={!hasProjectData || isDownloading.project}
            on:click={downloadProjectZip}
          >
            {#if isDownloading.project}
              <div class="button-spinner"></div>
            {:else}
              <div class="btn-icon project">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </div>
            {/if}
            <div class="btn-content">
              <span class="btn-title">Project Files</span>
              <span class="btn-subtitle">TP Project Folder</span>
            </div>
          </button>
          
          <button 
            class="download-btn" 
            class:disabled={!hasDotModelData}
            disabled={!hasDotModelData || isDownloading.dotmodel}
            on:click={downloadDotModel}
          >
            {#if isDownloading.dotmodel}
              <div class="button-spinner"></div>
            {:else}
              <div class="btn-icon model">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              </div>
            {/if}
            <div class="btn-content">
              <span class="btn-title">Model File</span>
              <span class="btn-subtitle">.MODEL Format</span>
            </div>
          </button>
          
          <button 
            class="download-btn" 
            class:disabled={!hasResultsData}
            disabled={!hasResultsData || isDownloading.results}
            on:click={downloadResultsCsv}
          >
            {#if isDownloading.results}
              <div class="button-spinner"></div>
            {:else}
              <div class="btn-icon csv">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
            {/if}
            <div class="btn-content">
              <span class="btn-title">Results Data</span>
              <span class="btn-subtitle">CSV Format</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Results Section -->
    <div class="results-section">
      <div class="results-header">
        <h2>Analysis Results</h2>
        
        <div class="results-info">
          {#if version?.resultsData?.rows && version.resultsData.rows.length > 0}
            <span class="results-count">
              Showing {Math.min((currentPage - 1) * pageSize + 1, version.resultsData.rows.length)}-{Math.min(currentPage * pageSize, version.resultsData.rows.length)} of {version.resultsData.rows.length} results
            </span>
          {/if}
        </div>
      </div>
      
      {#if hasResultsData}
        <div class="results-table-container">
          <div class="table-wrapper">
            <table class="results-table">
              <thead>
                <tr>
                  {#each getResultsHeaders() as header}
                    <th>
                      <button class="header-button" on:click={() => sortByColumn(header)}>
                        {header}
                        {#if sortColumn === header}
                          <span class="sort-indicator">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        {/if}
                      </button>
                    </th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#if filteredResults.length === 0}
                  <tr>
                    <td colspan={getResultsHeaders().length} class="no-results-cell">
                      No results available
                    </td>
                  </tr>
                {:else}
                  {#each paginatedResults as row}
                    <tr>
                      {#each getResultsHeaders() as header}
                        <td>{formatCellValue(row[header])}</td>
                      {/each}
                    </tr>
                  {/each}
                {/if}
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

.loading-spinner, .button-spinner {
  border: 3px solid rgba(58, 134, 255, 0.2);
  border-left-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner {
  width: 48px;
  height: 48px;
}

.button-spinner {
  width: 16px;
  height: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
  align-items: center;
}

.header-left {
  display: flex;
  flex-direction: column;
}

h1 {
  font-size: 2.5rem;
  color: var(--secondary-color);
  margin: 0;
  font-weight: 700;
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

.btn-nav {
  white-space: nowrap;
}

/* Unified Card Layout */
.unified-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.5rem;
  border-top: 4px solid var(--primary-color);
  overflow: hidden;
}

.card-section {
  padding: 1.25rem;
}

.section-header {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.section-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--secondary-color);
}

.card-divider {
  height: 1px;
  background-color: #e9ecef;
  margin: 0;
}

.info-row {
  display: flex;
  gap: 2rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
}

.label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.value {
  font-size: 0.95rem;
  color: var(--text-color);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  background-color: #f0f0f0;
  color: #6c757d;
}

.status-indicator.current {
  background-color: #e6f7ee;
  color: #38b000;
}

/* Download Section */
.download-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
}

.download-btn {
  display: flex;
  align-items: center;
  padding: 1rem;
  background-color: #ffffff;
  border: 1px solid #eaeaea;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  gap: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  flex: 1;
  min-width: 200px;
}

.download-btn:not(.disabled):not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: #d0d0d0;
}

.download-btn.disabled, .download-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  flex-shrink: 0;
}

.btn-icon.project {
  background-color: rgba(56, 176, 0, 0.1);
  color: #38b000;
}

.btn-icon.model {
  background-color: rgba(58, 134, 255, 0.1);
  color: #3a86ff;
}

.btn-icon.csv {
  background-color: rgba(240, 173, 78, 0.1);
  color: #f0ad4e;
}

.btn-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.btn-title {
  font-weight: 600;
  color: var(--text-color);
  font-size: 0.95rem;
}

.btn-subtitle {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

/* Results Section */
.results-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border-left: 4px solid #f0f4fa;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 1rem;
}

.results-header h2 {
  font-size: 1.4rem;
  color: var(--secondary-color);
  margin: 0;
}

.results-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.results-count {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Results Table */
.results-table-container {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.table-wrapper {
  overflow-x: auto;
  max-height: 600px;
  overflow-y: auto;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  table-layout: auto;
  min-width: 100%;
}

.results-table th {
  position: sticky;
  top: 0;
  background-color: #f8f9fa;
  z-index: 10;
  border-bottom: 2px solid #e9ecef;
  padding: 0;
  font-weight: 600;
  color: var(--secondary-color);
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.header-button {
  width: 100%;
  height: 100%;
  padding: 0.85rem 0.75rem;
  text-align: center;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  position: relative;
  gap: 0.5rem;
  white-space: nowrap;
}

.header-button:hover {
  background-color: rgba(58, 134, 255, 0.05);
}

.sort-indicator {
  display: inline-block;
  color: var(--primary-color);
  font-weight: bold;
}

.results-table td {
  padding: 0.85rem 0.75rem;
  border-bottom: 1px solid #f0f0f0;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px; /* Limit max width of cells */
  text-align: center; /* Center align content */
}

.results-table tr:last-child td {
  border-bottom: none;
}

.results-table tr:hover td {
  background-color: rgba(58, 134, 255, 0.04);
}

.no-results-cell {
  text-align: center;
  padding: 2.5rem !important;
  color: var(--text-secondary);
  font-style: italic;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 4rem 0;
  color: var(--text-secondary);
  text-align: center;
}

.no-results svg {
  opacity: 0.3;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  gap: 0.75rem;
  border-top: 1px solid #f0f0f0;
  background-color: #fbfbfb;
}

.pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: white;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.05);
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  background-color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.current-page {
  font-weight: 600;
  color: var(--primary-color);
}

.page-divider {
  margin: 0 0.4rem;
  color: var(--text-secondary);
}

.total-pages {
  color: var(--text-secondary);
}

/* Responsive Styles */
@media (max-width: 992px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
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
  
  .info-row {
    flex-direction: column;
    gap: 1rem;
  }
  
  .download-row {
    flex-direction: column;
  }
  
  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .table-wrapper {
    overflow-x: auto;
  }
  
  .results-table {
    min-width: 600px;
  }
}
</style>