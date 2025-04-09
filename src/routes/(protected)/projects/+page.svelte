<script lang="ts">
  import { onMount } from 'svelte';
  import api from '$lib/services/api';
  
  // Define project interface
  interface Project {
    id: string;
    projectName: string;
    modellingType: string;
    updatedAt: string;
    currentVersion: number;
    createdBy: string;
    createdAt: string;
  }
  
  let projects: Project[] = [];
  let isLoading = true;
  let error: string | null = null;
  
  onMount(async () => {
    try {
      const response = await api.get('/api/projects');
      projects = response.data.items;
    } catch (err) {
      console.error('Error fetching projects:', err);
      error = 'Failed to load projects. Please try again later.';
    } finally {
      isLoading = false;
    }
  });
  
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
</script>

<svelte:head>
  <title>Projects - TP Server</title>
  <meta name="description" content="Manage your projects on TP Server" />
</svelte:head>

<div class="projects-container">
  <div class="projects-header">
    <h1>Projects</h1>
    <a href="/projects/new" class="create-button">Create New Project</a>
  </div>
  
  {#if isLoading}
    <div class="loading">
      <p>Loading projects...</p>
    </div>
  {:else if error}
    <div class="error-message">
      <p>{error}</p>
      <button on:click={() => window.location.reload()}>Try Again</button>
    </div>
  {:else if projects.length === 0}
    <div class="empty-state">
      <h2>No Projects Found</h2>
      <p>You don't have any projects yet. Create your first project to get started.</p>
      <a href="/projects/new" class="create-button">Create Project</a>
    </div>
  {:else}
    <div class="projects-list">
      {#each projects as project}
        <div class="project-card">
          <div class="project-info">
            <h2>{project.projectName}</h2>
            <div class="project-meta">
              <span class="project-type">{project.modellingType}</span>
              <span class="project-date">Last updated: {formatDate(project.updatedAt)}</span>
              <span class="project-version">Version: {project.currentVersion}</span>
            </div>
          </div>
          <div class="project-actions">
            <a href={`/projects/${project.id}`} class="view-button">View</a>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .projects-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }
  
  .projects-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  h1 {
    font-size: 2rem;
    color: var(--color-theme-1);
    margin: 0;
  }
  
  .create-button {
    background-color: var(--color-theme-1);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.6rem 1.2rem;
    font-weight: 600;
    text-decoration: none;
    font-size: 0.9rem;
  }
  
  .create-button:hover {
    background-color: #cc3200;
    text-decoration: none;
  }
  
  .loading, .empty-state, .error-message {
    background-color: white;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    margin-top: 2rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .error-message {
    color: #e53e3e;
  }
  
  .error-message button {
    background-color: #e53e3e;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    margin-top: 1rem;
    cursor: pointer;
  }
  
  .empty-state h2 {
    color: var(--color-theme-2);
    margin-top: 0;
  }
  
  .empty-state .create-button {
    display: inline-block;
    margin-top: 1rem;
  }
  
  .projects-list {
    display: grid;
    gap: 1.5rem;
  }
  
  .project-card {
    background-color: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .project-card h2 {
    font-size: 1.25rem;
    margin: 0 0 0.5rem 0;
    color: var(--color-theme-2);
  }
  
  .project-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    font-size: 0.85rem;
  }
  
  .project-type {
    font-weight: 600;
  }
  
  .project-date, .project-version {
    color: #666;
  }
  
  .project-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .view-button {
    background-color: var(--color-theme-2);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    text-decoration: none;
    font-size: 0.9rem;
  }
  
  .view-button:hover {
    opacity: 0.9;
    text-decoration: none;
  }
  
  @media (max-width: 768px) {
    .projects-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .project-card {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .project-actions {
      margin-top: 1rem;
      align-self: flex-end;
    }
  }
</style>