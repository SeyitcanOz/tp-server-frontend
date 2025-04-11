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
  let activeTab: 'summary' | 'projectData' | 'modelInfo' | 'dotModel' | 'results' = 'summary';
  
  // For results table pagination
  let currentPage = 1;
  let pageSize = 48;
  let totalPages = 1;
  
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
  
  // Download handlers
  function downloadProjectZip() {
    window.location.href = `${api.defaults.baseURL}/api/download/project/${projectId}/zip?versionNumber=${versionNumber}`;
  }
  
  function downloadDotModel() {
    window.location.href = `${api.defaults.baseURL}/api/download/project/${projectId}/dotmodel?versionNumber=${versionNumber}`;
  }
  
  function downloadResultsCsv() {
    window.location.href = `${api.defaults.baseURL}/api/download/project/${projectId}/results-csv?versionNumber=${versionNumber}`;
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
    <p>{error}</p>
    <button class="btn" on:click={loadData}>Try Again</button>
    <a href={`/projects/${projectId}`} class="btn">Back to Project</a>
  </div>
{:else if project && version}
  <div class="page-header">
    <div class="breadcrumbs">
      <a href="/projects">Projects</a> &gt; 
      <a href={`/projects/${projectId}`}>{project.projectName}</a> &gt; 
      Version #{versionNumber}
    </div>
    
    <div class="header-content">
      <div>
        <h1>Version #{versionNumber}</h1>
        <p class="version-date">Created on {formatDate(version.createdAt)}</p>
      </div>
      
      <div class="header-actions">
        <div class="version-navigation">
          <button 
            class="btn btn-outline btn-nav" 
            disabled={versionNumber <= 1}
            on:click={() => goToVersion(versionNumber - 1)}
          >
            Previous
          </button>
          <button 
            class="btn btn-outline btn-nav" 
            disabled={versionNumber >= project.currentVersion}
            on:click={() => goToVersion(versionNumber + 1)}
          >
            Next
          </button>
        </div>
        
        {#if isAdminOrOwner && versionNumber !== project.currentVersion}
          <button class="btn btn-primary" on:click={makeCurrentVersion}>
            Set as Current Version
          </button>
        {/if}
      </div>
    </div>
  </div>
  
  <div class="version-status">
    {#if versionNumber === project.currentVersion}
      <div class="current-version">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>This is the current version</span>
      </div>
    {:else}
      <div class="older-version">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>This is an older version</span>
      </div>
    {/if}
  </div>
  
  <div class="version-info-card">
    <h2>Version Information</h2>
    
    <div class="info-grid">
      <div class="info-item">
        <span class="label">Version ID</span>
        <span class="value">{version.id}</span>
      </div>
      
      <div class="info-item">
        <span class="label">Project ID</span>
        <span class="value">{version.projectId}</span>
      </div>
      
      <div class="info-item">
        <span class="label">Version Number</span>
        <span class="value">{version.versionNumber}</span>
      </div>
      
      <div class="info-item">
        <span class="label">Created At</span>
        <span class="value">{formatDate(version.createdAt)}</span>
      </div>
    </div>
  </div>
  
  <div class="download-panel">
    <h3>Download Files</h3>
    <div class="download-buttons">
      <button class="download-button" on:click={downloadProjectZip}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download TP Project Folder
      </button>
      
      <button class="download-button" on:click={downloadDotModel}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
        Download MODEL File
      </button>
      
      <button class="download-button" on:click={downloadResultsCsv}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        Download Results CSV
      </button>
    </div>
  </div>
  
  <div class="data-section">
    <div class="data-tabs">
      <button 
        class="tab-button" 
        class:active={activeTab === 'summary'}
        on:click={() => activeTab = 'summary'}
      >
        Summary
      </button>
      <button 
        class="tab-button" 
        class:active={activeTab === 'results'}
        on:click={() => activeTab = 'results'}
      >
        Results Table
      </button>
      <button 
        class="tab-button" 
        class:active={activeTab === 'projectData'}
        on:click={() => activeTab = 'projectData'}
      >
        Project Data
      </button>
      <button 
        class="tab-button" 
        class:active={activeTab === 'modelInfo'}
        on:click={() => activeTab = 'modelInfo'}
      >
        Model Info
      </button>
      <button 
        class="tab-button" 
        class:active={activeTab === 'dotModel'}
        on:click={() => activeTab = 'dotModel'}
      >
        Dot Model
      </button>
    </div>
    
    <div class="data-panel">
      {#if activeTab === 'summary'}
        <div class="summary-view">
          <div class="summary-card">
            <h3>Project Summary</h3>
            <p>This version contains the following data:</p>
            <ul>
              <li>
                <strong>Project Data:</strong> 
                {version.projectData ? 'Available' : 'Not available'}
              </li>
              <li>
                <strong>Model Info:</strong> 
                {version.modelInfoData ? 'Available' : 'Not available'}
              </li>
              <li>
                <strong>Dot Model:</strong> 
                {version.dotModelData ? 'Available' : 'Not available'}
              </li>
              <li>
                <strong>Results:</strong> 
                {version?.resultsData?.rows && Array.isArray(version.resultsData.rows) 
                  ? `${version.resultsData.rows.length} entries` 
                  : 'Not available'}
              </li>
            </ul>
            <p>Use the download buttons above to access the project files or view the tabs for detailed information.</p>
          </div>
        </div>
      {:else if activeTab === 'results' && version?.resultsData?.rows && Array.isArray(version.resultsData.rows) && version.resultsData.rows.length > 0}
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
                on:click={() => changePage(currentPage - 1)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                Previous
              </button>
              
              <div class="page-info">
                Page {currentPage} of {totalPages}
              </div>
              
              <button 
                class="pagination-btn" 
                disabled={currentPage === totalPages} 
                on:click={() => changePage(currentPage + 1)}
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          {/if}
        </div>
      {:else if activeTab === 'projectData'}
        <div class="data-viewer">
          {#if version.projectData}
            <div class="json-wrapper">
              <pre>{JSON.stringify(version.projectData, null, 2)}</pre>
            </div>
            <div class="download-prompt">
              <p>
                This JSON data is quite detailed. You may find it more convenient to 
                <button class="text-button" on:click={downloadProjectZip}>download the complete project</button> 
                for a better experience.
              </p>
            </div>
          {:else}
            <div class="no-data">
              <p>No project data available for this version.</p>
            </div>
          {/if}
        </div>
      {:else if activeTab === 'modelInfo' && version.modelInfoData}
        <div class="data-viewer">
          {#if version.modelInfoData}
            <div class="json-wrapper">
              <pre>{JSON.stringify(version.modelInfoData, null, 2)}</pre>
            </div>
            <div class="download-prompt">
              <p>
                This model info is included in the project files. You can 
                <button class="text-button" on:click={downloadProjectZip}>download the complete project</button> 
                to access it directly.
              </p>
            </div>
          {:else}
            <div class="no-data">
              <p>No model info data available for this version.</p>
            </div>
          {/if}
        </div>
      {:else if activeTab === 'dotModel' && version.dotModelData}
        <div class="data-viewer">
          {#if version.dotModelData}
            <div class="json-wrapper">
              <pre>{JSON.stringify(version.dotModelData, null, 2)}</pre>
            </div>
            <div class="download-prompt">
              <p>
                It's recommended to 
                <button class="text-button" on:click={downloadDotModel}>download the .MODEL file</button> 
                to view or edit in appropriate software.
              </p>
            </div>
          {:else}
            <div class="no-data">
              <p>No dot model data available for this version.</p>
            </div>
          {/if}
        </div>
      {:else}
        <div class="no-data">
          <p>No data available for this section.</p>
        </div>
      {/if}
    </div>
  </div>
{/if}
</div>

<style>
.version-container {
  padding: 2rem 0;
}

.loading, .error-message {
  padding: 4rem 2rem;
  text-align: center;
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  margin-bottom: 2rem;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.error-message {
  color: var(--danger-color);
}

.error-message .btn {
  margin-top: 1rem;
  margin-right: 0.5rem;
}

.breadcrumbs {
  margin-bottom: 1rem;
  color: var(--text-secondary);
}

.breadcrumbs a {
  color: var(--primary-color);
  text-decoration: none;
}

.breadcrumbs a:hover {
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

h1 {
  font-size: 2.25rem;
  color: var(--secondary-color);
  margin: 0;
  margin-bottom: 0.5rem;
}

.version-date {
  color: var(--text-secondary);
  font-size: 1.125rem;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.version-navigation {
  display: flex;
  gap: 0.5rem;
}

.btn-nav {
  padding: 0.5rem 0.75rem;
}

.version-status {
  margin-bottom: 2rem;
}

.current-version, .older-version {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  font-weight: 500;
}

.current-version {
  background-color: rgba(56, 176, 0, 0.1);
  color: var(--success-color);
}

.older-version {
  background-color: rgba(107, 114, 128, 0.1);
  color: var(--text-secondary);
}

.version-info-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.version-info-card h2 {
  font-size: 1.5rem;
  color: var(--secondary-color);
  margin-top: 0;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.value {
  font-size: 1rem;
  color: var(--text-color);
  font-weight: 600;
}

/* Download Panel Styles */
.download-panel {
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.download-panel h3 {
  font-size: 1.25rem;
  color: var(--secondary-color);
  margin-top: 0;
  margin-bottom: 1rem;
}

.download-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.download-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.download-button:hover {
  background-color: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.download-button svg {
  flex-shrink: 0;
}

/* Data Section Styles */
.data-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--card-shadow);
  margin-bottom: 2rem;
}

.data-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
}

.tab-button {
  padding: 1rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  position: relative;
  white-space: nowrap;
}

.tab-button.active {
  color: var(--primary-color);
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--primary-color);
}

.data-panel {
  padding: 1.5rem;
}

/* Results Table Styles */
.results-table-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.table-wrapper {
  overflow-x: auto;
  max-height: 500px;
  overflow-y: auto;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.results-table th {
  background-color: #f8f9fa;
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--secondary-color);
  border-bottom: 2px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 10;
}

.results-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-color);
}

.results-table tr:hover td {
  background-color: rgba(0, 0, 0, 0.02);
}

/* Pagination Styles */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.875rem;
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
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Summary View Styles */
.summary-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.summary-card {
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 1.5rem;
}

.summary-card h3 {
  font-size: 1.25rem;
  color: var(--secondary-color);
  margin-top: 0;
  margin-bottom: 1rem;
}

.summary-card ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.summary-card li {
  margin-bottom: 0.5rem;
}

/* JSON Viewer Styles */
.data-viewer {
  max-height: 500px;
  overflow: auto;
}

.json-wrapper {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  max-height: 400px;
  overflow: auto;
}

.data-viewer pre {
  margin: 0;
  font-family: monospace;
  font-size: 0.875rem;
}

.download-prompt {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background-color: rgba(58, 134, 255, 0.1);
  border-radius: 4px;
  color: var(--primary-color);
}

.text-button {
  background: none;
  border: none;
  color: var(--primary-color);
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.text-button:hover {
  color: var(--primary-dark);
}

.no-data {
  padding: 3rem;
  text-align: center;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .header-actions {
    width: 100%;
    flex-direction: column;
  }
  
  .version-navigation {
    width: 100%;
  }
  
  .btn-nav {
    flex: 1;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .data-tabs {
    flex-wrap: wrap;
  }
  
  .tab-button {
    padding: 0.75rem 1rem;
  }
  
  .download-buttons {
    flex-direction: column;
    width: 100%;
  }
  
  .download-button {
    width: 100%;
    justify-content: center;
  }
}
</style>