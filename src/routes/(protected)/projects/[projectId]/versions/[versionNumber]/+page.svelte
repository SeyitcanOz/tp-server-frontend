<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { user } from '$lib/stores/auth';
    import api from '$lib/services/api';
    import type { ProjectDetail } from '$lib/types/project';
    import type { ProjectVersion } from '$lib/types/version';
    
    // Project and version data
    let project: ProjectDetail | null = null;
    let version: ProjectVersion | null = null;
    let isLoading = true;
    let error: string | null = null;
    let activeTab: 'projectData' | 'modelInfo' | 'dotModel' | 'results' = 'projectData';
    
    // Extract IDs from URL parameters
    $: projectId = $page.params.projectId;
    $: versionNumber = parseInt($page.params.versionNumber);
    
    // Check if user is admin or project owner
    $: isAdminOrOwner = $user && ($user.roles.includes('Admin') || ($user.id === project?.createdBy));
    
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
    
    // Add the pageTitle reactive declaration
    $: pageTitle = project && version 
      ? `Version #${versionNumber} of ${project.projectName} - TPServer` 
      : 'Version Details - TPServer';
    
    onMount(() => {
      loadData();
    });
</script>
  
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
    
    <div class="data-section">
      <div class="data-tabs">
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
        <button 
          class="tab-button" 
          class:active={activeTab === 'results'}
          on:click={() => activeTab = 'results'}
        >
          Results
        </button>
      </div>
      
      <div class="data-panel">
        <div class="data-viewer">
          {#if activeTab === 'projectData'}
            <pre>{JSON.stringify(version.projectData, null, 2)}</pre>
          {:else if activeTab === 'modelInfo' && version.modelInfoData}
            <pre>{JSON.stringify(version.modelInfoData, null, 2)}</pre>
          {:else if activeTab === 'dotModel' && version.dotModelData}
            <pre>{JSON.stringify(version.dotModelData, null, 2)}</pre>
          {:else if activeTab === 'results' && version.resultsData}
            <pre>{JSON.stringify(version.resultsData, null, 2)}</pre>
          {:else}
            <div class="no-data">
              <p>No data available for this section.</p>
            </div>
          {/if}
        </div>
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
  
  .data-section {
    background-color: white;
    border-radius: 8px;
    box-shadow: var(--card-shadow);
    margin-bottom: 2rem;
  }
  
  .data-tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color);
  }
  
  .tab-button {
    padding: 1rem 1.5rem;
    border: none;
    background: none;
    cursor: pointer;
    font-weight: 500;
    color: var(--text-secondary);
    position: relative;
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
  
  .data-viewer {
    max-height: 500px;
    overflow: auto;
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 4px;
  }
  
  .data-viewer pre {
    margin: 0;
    font-family: monospace;
    font-size: 0.875rem;
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

    .data-viewer pre {
    margin: 0;
    font-family: monospace;
    font-size: 0.875rem;
  }
  
  .no-data {
    padding: 3rem;
    text-align: center;
    color: var(--text-secondary);
  }

  }
</style>