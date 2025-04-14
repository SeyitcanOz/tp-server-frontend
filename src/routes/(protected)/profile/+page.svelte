<script lang="ts">
  import { onMount } from 'svelte';
  import { userService } from '$lib/services/user';
  import { user as userStore } from '$lib/stores/auth';
  import api from '$lib/services/api';
  import type { User } from '$lib/types/auth';
  import type { PagedResponse, ProjectSummary } from '$lib/types/project';
  import type { VersionSummary } from '$lib/types/version';
  
  let profile: User | null = null;
  let isLoading = true;
  let error: string | null = null;
  
  // Stats
  let totalProjects = 0;
  let totalVersions = 0;
  let loadingStats = true;
  
  async function loadUserProfile() {
    isLoading = true;
    error = null;
    
    try {
      const userData = await userService.getCurrentUser();
      profile = userData;
      
      // Update the store
      userStore.set(userData);
      
      // Load project stats
      await loadUserStats();
    } catch (err) {
      console.error('Error loading user profile:', err);
      error = 'Failed to load your profile. Please try again.';
    } finally {
      isLoading = false;
    }
  }
  
  async function loadUserStats() {
    loadingStats = true;
    
    try {
      // Get total projects for the current user
      const projectsResponse = await api.get<PagedResponse<ProjectSummary>>('/api/projects', {
        params: { pageSize: 1, pageNumber: 1 }
      });
      
      totalProjects = projectsResponse.data.totalCount;
      
      // Get total versions across all projects for the current user
      const versionsResponse = await api.get<PagedResponse<VersionSummary>>('/api/versions', {
        params: { pageSize: 1, pageNumber: 1 }
      });
      
      totalVersions = versionsResponse.data.totalCount;
    } catch (err) {
      console.error('Error loading user stats:', err);
      // Don't set error here to keep profile visible even if stats fail
    } finally {
      loadingStats = false;
    }
  }
  
  onMount(() => {
    loadUserProfile();
  });
</script>

<svelte:head>
  <title>My Profile - TPServer</title>
  <meta name="description" content="Your TPServer profile information" />
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</svelte:head>

<div class="container">
  <header class="page-header">
    <div class="breadcrumbs">
      <a href="/">Home</a> <span class="separator">/</span> Profile
    </div>
    
    <div class="header-content">
      <div class="header-left">
        <h1>My Profile</h1>
      </div>
    </div>
  </header>

  {#if isLoading}
    <div class="loading-container">
      <div class="loader"></div>
      <p>Loading your profile information...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <span class="material-icons error-icon">error_outline</span>
      <p>{error}</p>
      <button class="btn-primary" on:click={loadUserProfile}>Try Again</button>
    </div>
  {:else if profile}
    <div class="profile-grid">
      <!-- Main Profile Card -->
      <div class="card profile-card">
        <div class="card-header">
          <h2>Profile Information</h2>
        </div>
        
        <div class="profile-content">
          <div class="profile-header">
            <div class="avatar">
              <span>{profile.username.charAt(0).toUpperCase()}</span>
            </div>
            <div class="user-info">
              <h3>{profile.username}</h3>
              <div class="roles">
                {#each profile.roles as role}
                  <span class="role-badge">{role}</span>
                {/each}
              </div>
            </div>
          </div>
          
          <div class="profile-details">
            <div class="detail-item">
              <span class="label">User ID</span>
              <span class="value">{profile.id}</span>
            </div>
            <div class="detail-item">
              <span class="label">Account Type</span>
              <span class="value">{profile.roles.includes('Admin') ? 'Administrator' : 'Standard User'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Usage Statistics Card -->
      <div class="card stats-card">
        <div class="card-header">
          <h2>Usage Statistics</h2>
        </div>
        
        {#if loadingStats}
          <div class="loading-stats">
            <div class="loader small"></div>
            <span>Loading statistics...</span>
          </div>
        {:else}
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-icon">
                <span class="material-icons">folder</span>
              </div>
              <div class="stat-content">
                <div class="stat-value">{totalProjects}</div>
                <div class="stat-label">Total Projects</div>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon">
                <span class="material-icons">history</span>
              </div>
              <div class="stat-content">
                <div class="stat-value">{totalVersions}</div>
                <div class="stat-label">Total Versions</div>
              </div>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Recent Activity Card - Coming Soon -->
      <div class="card activity-card">
        <div class="card-header">
          <h2>Recent Activity</h2>
        </div>
        
        <div class="empty-content">
          <span class="material-icons empty-icon">history</span>
          <p>Activity tracking coming soon</p>
        </div>
        
        <div class="coming-soon-overlay">
          <span>Coming Soon</span>
        </div>
      </div>
      
      <!-- Security Card - Coming Soon -->
      <div class="card security-card">
        <div class="card-header">
          <h2>Security Settings</h2>
        </div>
        
        <div class="empty-content">
          <span class="material-icons empty-icon">lock</span>
          <p>Password management coming soon</p>
        </div>
        
        <div class="coming-soon-overlay">
          <span>Coming Soon</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Base Container */
  .container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0.8rem;
  }
  
  /* Page Header */
  .page-header {
    margin-bottom: 1rem;
  }
  
  .breadcrumbs {
    font-size: 0.8rem;
    color: #64748b;
    margin-bottom: 0.5rem;
  }
  
  .breadcrumbs a {
    color: #5c9fff;
    text-decoration: none;
  }
  
  .breadcrumbs a:hover {
    text-decoration: underline;
  }
  
  .separator {
    padding: 0 0.3rem;
    color: #94a3b8;
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  h1 {
    font-size: 1.5rem;
    margin: 0;
    color: #1e3a8a;
    font-weight: 500;
  }
  
  /* Loading & Error States */
  .loading-container, .error-container {
    padding: 2.5rem 1.5rem;
    text-align: center;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
  
  .loader {
    border: 3px solid rgba(92, 159, 255, 0.2);
    border-left-color: #5c9fff;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    animation: spin 1s linear infinite;
  }
  
  .loader.small {
    width: 20px;
    height: 20px;
    border-width: 2px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-icon {
    font-size: 2.5rem;
    color: #dc2626;
  }
  
  .error-container p {
    color: #dc2626;
    font-weight: 500;
    font-size: 0.9rem;
  }
  
  /* Profile Grid Layout - More compact and minimalistic */
  .profile-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  /* Common Card Styles - More minimalistic */
  .card {
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    margin-bottom: 1rem;
    position: relative;
    border: 1px solid #f1f5f9;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.8rem;
    background-color: #f8fafc;
    border-bottom: 1px solid #f1f5f9;
  }
  
  .card-header h2 {
    margin: 0;
    font-size: 0.9rem;
    color: #1e3a8a;
    font-weight: 500;
  }
  
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.75rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    border: none;
    background-color: #5c9fff;
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background-color: #4a89e8;
  }
  
  /* Coming Soon Overlay - Simplified */
  .coming-soon-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  
  .coming-soon-overlay span {
    background-color: #5c9fff;
    color: white;
    padding: 0.3rem 0.6rem;
    border-radius: 3px;
    font-size: 0.8rem;
    font-weight: 500;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  /* Empty Content - Simplified */
  .empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 0;
    color: #94a3b8;
    text-align: center;
  }
  
  .empty-icon {
    font-size: 2rem;
    margin-bottom: 0.75rem;
    opacity: 0.5;
  }
  
  .empty-content p {
    margin: 0;
    font-size: 0.8rem;
    color: #64748b;
  }
  
  /* Loading Stats - More compact */
  .loading-stats {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1.5rem;
    color: #64748b;
    font-size: 0.8rem;
  }
  
  /* Profile Card Specific - More compact */
  .profile-card {
    grid-column: 1 / 2;
    grid-row: 1 / 2;
  }
  
  .profile-content {
    padding: 0.8rem;
  }
  
  .profile-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: #5c9fff;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.25rem;
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(92, 159, 255, 0.3);
  }
  
  .user-info h3 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    color: #1e3a8a;
  }
  
  .roles {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  
  .role-badge {
    padding: 0.15rem 0.3rem;
    background-color: #f0f4ff;
    color: #5c9fff;
    border-radius: 3px;
    font-size: 0.65rem;
    font-weight: 500;
  }
  
  .profile-details {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.8rem;
  }
  
  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  
  .label {
    font-size: 0.65rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .value {
    font-size: 0.8rem;
    color: #334155;
    font-weight: 500;
    word-break: break-all;
  }
  
  /* Usage Statistics Card - More compact */
  .stats-card {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    background-color: transparent;
  }
  
  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.8rem;
    background-color: white;
  }
  
  .stat-icon {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background-color: #f0f4ff;
    color: #5c9fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .stat-icon .material-icons {
    font-size: 1rem;
  }
  
  .stat-content {
    display: flex;
    flex-direction: column;
  }
  
  .stat-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1e3a8a;
  }
  
  .stat-label {
    font-size: 0.65rem;
    color: #64748b;
  }
  
  /* Recent Activity Card - More compact */
  .activity-card {
    grid-column: 1 / 2;
    grid-row: 2 / 3;
    min-height: 150px;
  }
  
  /* Security Card - More compact */
  .security-card {
    grid-column: 2 / 3;
    grid-row: 2 / 3;
    min-height: 150px;
  }
  
  /* Responsive Styles */
  @media (max-width: 768px) {
    .profile-grid {
      grid-template-columns: 1fr;
    }
    
    .profile-card,
    .stats-card,
    .activity-card,
    .security-card {
      grid-column: 1;
    }
    
    .profile-card {
      grid-row: 1;
    }
    
    .stats-card {
      grid-row: 2;
    }
    
    .activity-card {
      grid-row: 3;
    }
    
    .security-card {
      grid-row: 4;
    }
    
    .profile-header {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    
    .profile-details {
      grid-template-columns: 1fr;
    }
    
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
  
  @media (max-width: 576px) {
    .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.4rem;
    }
  }
</style>