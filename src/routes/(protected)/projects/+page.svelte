<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth';
  import api from '$lib/services/api';
  import type { PagedResponse, ProjectSummary } from '$lib/types/project';
  import Navbar from '$lib/components/Navbar.svelte';
  
  let projects: ProjectSummary[] = [];
  let isLoading = true;
  let error: string | null = null;
  let currentPage = 1;
  let pageSize = 10;
  let totalPages = 1;
  let totalCount = 0;
  let searchQuery = '';
  let userMap: Record<string, string> = {}; // Maps user IDs to usernames
  
  // Function to load projects
  async function loadProjects() {
    isLoading = true;
    error = null;
    
    try {
      // Fetch projects with pagination and search params
      const response = await api.get<PagedResponse<ProjectSummary>>('/api/projects', {
        params: {
          pageNumber: currentPage,
          pageSize: pageSize,
          search: searchQuery || undefined
        }
      });
      
      projects = response.data.items;
      totalPages = response.data.totalPages;
      totalCount = response.data.totalCount;
      
      // Collect all unique creator IDs
      const creatorIds = [...new Set(projects.map(p => p.createdBy))];
      
      // Load user details for all creators if not already in userMap
      await loadUserDetails(creatorIds);
    } catch (err) {
      console.error('Error fetching projects:', err);
      error = 'Failed to load projects. Please try again.';
    } finally {
      isLoading = false;
    }
  }
  
  // Function to load user details for project creators
  async function loadUserDetails(userIds: string[]) {
    try {
      // Filter out IDs we already have info for
      const missingIds = userIds.filter(id => !userMap[id]);
      
      if (missingIds.length === 0) return;
      
      // In a real application, you'd have an endpoint to fetch user details by IDs
      // For demonstration, we'll assume we have the endpoint /api/users/batch
      const response = await api.post('/api/users/batch', { userIds: missingIds });
      
      const users = response.data;
      
      // Update the userMap with new user data
      users.forEach((userData: {id: string, username: string}) => {
        userMap[userData.id] = userData.username;
      });
    } catch (error) {
      console.error('Error loading user details:', error);
      // If we can't load user details, use placeholder
      userIds.forEach(id => {
        if (!userMap[id]) userMap[id] = 'Unknown User';
      });
    }
  }
  
  function handleSearch() {
    currentPage = 1; // Reset to first page when searching
    loadProjects();
  }
  
  function changePage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      loadProjects();
    }
  }
  
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Check if current user is admin - can be used in the template with isAdmin
  $: isAdmin = $user?.roles.includes('Admin');
  
  onMount(() => {
    loadProjects();
  });
</script>

<svelte:head>
  <title>Projects - TPServer</title>
  <meta name="description" content="Manage your engineering projects on TPServer" />
</svelte:head>

<Navbar />

<div class="container projects-container">
  <div class="page-header">
    <h1>Projects</h1>
    <a href="/projects/new" class="btn btn-primary">Create New Project</a>
  </div>
  
  <div class="filters">
    <div class="search-box">
      <input 
        type="text" 
        bind:value={searchQuery} 
        placeholder="Search projects..." 
        on:keyup={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button class="search-button" on:click={handleSearch} aria-label="Search">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>
    </div>
  </div>
  
  {#if isLoading}
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>Loading projects...</p>
    </div>
  {:else if error}
    <div class="error-message">
      <p>{error}</p>
      <button class="btn" on:click={loadProjects}>Try Again</button>
    </div>
  {:else if projects.length === 0}
    <div class="empty-state">
      <h2>No Projects Found</h2>
      {#if searchQuery}
        <p>No projects matched your search. Try a different query or clear the search.</p>
        <button class="btn" on:click={() => { searchQuery = ''; loadProjects(); }}>Clear Search</button>
      {:else}
        <p>You don't have any projects yet. Create your first project to get started.</p>
        <a href="/projects/new" class="btn btn-primary">Create Project</a>
      {/if}
    </div>
  {:else}
    <div class="projects-list">
      {#each projects as project}
        <div class="project-card">
          <div class="project-header">
            <h2 class="project-name">{project.projectName}</h2>
            <span class="project-type">{project.modellingType}</span>
          </div>
          
          <div class="project-details">
            <div class="detail-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
              </svg>
              <span>Created by: <strong>{userMap[project.createdBy] || 'Unknown User'}</strong></span>
            </div>
            
            <div class="detail-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Last updated: <strong>{formatDate(project.updatedAt)}</strong></span>
            </div>
            
            <div class="detail-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              <span>Version: <strong>{project.currentVersion}</strong></span>
            </div>
          </div>
          
          <div class="project-actions">
            <a href={`/projects/${project.id}`} class="btn btn-outline">
              View Details
            </a>
            <a href={`/projects/${project.id}/versions`} class="btn btn-outline">
              View Versions
            </a>
          </div>
        </div>
      {/each}
    </div>
    
    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="pagination">
        <button 
          class="pagination-btn" 
          disabled={currentPage === 1} 
          on:click={() => changePage(currentPage - 1)}
        >
          Previous
        </button>
        
        <div class="pagination-pages">
          {#each Array(totalPages) as _, index}
            {#if index + 1 === currentPage}
              <button class="pagination-btn active">{index + 1}</button>
            {:else if index + 1 === 1 || index + 1 === totalPages || (index + 1 >= currentPage - 1 && index + 1 <= currentPage + 1)}
              <button class="pagination-btn" on:click={() => changePage(index + 1)}>{index + 1}</button>
            {:else if index + 1 === 2 || index + 1 === totalPages - 1}
              <span class="pagination-ellipsis">...</span>
            {/if}
          {/each}
        </div>
        
        <button 
          class="pagination-btn" 
          disabled={currentPage === totalPages} 
          on:click={() => changePage(currentPage + 1)}
        >
          Next
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .projects-container {
    padding: 2rem 0;
  }
  
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  h1 {
    font-size: 2.25rem;
    color: var(--secondary-color);
    margin: 0;
  }
  
  .filters {
    margin-bottom: 2rem;
  }
  
  .search-box {
    position: relative;
    max-width: 400px;
  }
  
  .search-box input {
    width: 100%;
    padding: 0.75rem 1rem;
    padding-right: 3rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 1rem;
  }
  
  .search-button {
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    width: 3rem;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
  }
  
  .search-button svg {
    width: 20px;
    height: 20px;
  }
  
  .loading, .empty-state, .error-message {
    padding: 4rem 2rem;
    text-align: center;
    background-color: white;
    border-radius: 8px;
    box-shadow: var(--card-shadow);
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
  
  .empty-state h2 {
    margin-bottom: 1rem;
    color: var(--secondary-color);
  }
  
  .projects-list {
    display: grid;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .project-card {
    background-color: white;
    border-radius: 8px;
    box-shadow: var(--card-shadow);
    padding: 1.5rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .project-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
  
  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }
  
  .project-name {
    font-size: 1.5rem;
    margin: 0;
    color: var(--primary-color);
  }
  
  .project-type {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background-color: var(--primary-light);
    color: white;
    border-radius: 50rem;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .project-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .detail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
  }
  
  .detail-item svg {
    color: var(--primary-color);
  }
  
  .detail-item strong {
    color: var(--text-color);
  }
  
  .project-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 2rem;
    gap: 0.5rem;
  }
  
  .pagination-pages {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .pagination-btn {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color);
    background-color: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .pagination-btn:hover:not(:disabled) {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
  
  .pagination-btn.active {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }
  
  .pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .pagination-ellipsis {
    color: var(--text-secondary);
  }
  
  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .project-header {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .project-details {
      grid-template-columns: 1fr;
    }
    
    .project-actions {
      flex-direction: column;
    }
  }
</style>