<script lang="ts">
    import { onMount } from 'svelte';
    import { userService } from '$lib/services/user';
    import { user as userStore } from '$lib/stores/auth';
    import type { User } from '$lib/types/auth';
    
    let profile: User | null = null;
    let isLoading = true;
    let error: string | null = null;
    
    async function loadUserProfile() {
      isLoading = true;
      error = null;
      
      try {
        const userData = await userService.getCurrentUser();
        profile = userData;
        
        // Update the store
        userStore.set(userData);
      } catch (err) {
        console.error('Error loading user profile:', err);
        error = 'Failed to load your profile. Please try again.';
      } finally {
        isLoading = false;
      }
    }
    
    onMount(() => {
      loadUserProfile();
    });
  </script>
  
  <svelte:head>
    <title>My Profile - TPServer</title>
    <meta name="description" content="Your TPServer profile information" />
  </svelte:head>
  
  <div class="container profile-container">
    <div class="page-header">
      <h1>My Profile</h1>
    </div>
    
    {#if isLoading}
      <div class="loading">
        <div class="loading-spinner"></div>
        <p>Loading your profile information...</p>
      </div>
    {:else if error}
      <div class="error-message">
        <p>{error}</p>
        <button class="btn" on:click={loadUserProfile}>Try Again</button>
      </div>
    {:else if profile}
      <div class="profile-card">
        <div class="profile-header">
          <div class="avatar">
            <span>{profile.username.charAt(0).toUpperCase()}</span>
          </div>
          <div class="user-info">
            <h2>{profile.username}</h2>
            <div class="roles">
              {#each profile.roles as role}
                <span class="role-badge">{role}</span>
              {/each}
            </div>
          </div>
        </div>
        
        <div class="profile-details">
          <div class="detail-section">
            <h3>Account Information</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">User ID</span>
                <span class="value">{profile.id}</span>
              </div>
              <div class="detail-item">
                <span class="label">Username</span>
                <span class="value">{profile.username}</span>
              </div>
              <div class="detail-item">
                <span class="label">Roles</span>
                <span class="value">{profile.roles.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
  
  <style>
    .profile-container {
      padding: 2rem 0;
    }
    
    .page-header {
      margin-bottom: 2rem;
    }
    
    h1 {
      font-size: 2.25rem;
      color: var(--secondary-color);
      margin: 0;
    }
    
    .loading, .error-message {
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
    
    .error-message .btn {
      margin-top: 1rem;
    }
    
    .profile-card {
      background-color: white;
      border-radius: 8px;
      box-shadow: var(--card-shadow);
      padding: 2rem;
    }
    
    .profile-header {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border-color);
    }
    
    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background-color: var(--primary-color);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 2rem;
      font-weight: 700;
    }
    
    .user-info h2 {
      font-size: 1.75rem;
      color: var(--secondary-color);
      margin: 0;
      margin-bottom: 0.5rem;
    }
    
    .roles {
      display: flex;
      gap: 0.5rem;
    }
    
    .role-badge {
      padding: 0.25rem 0.75rem;
      background-color: var(--primary-light);
      color: white;
      border-radius: 50rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .detail-section {
      margin-bottom: 2rem;
    }
    
    .detail-section h3 {
      font-size: 1.25rem;
      color: var(--secondary-color);
      margin-top: 0;
      margin-bottom: 1rem;
    }
    
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
    }
    
    .detail-item {
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
    
    @media (max-width: 768px) {
      .profile-header {
        flex-direction: column;
        align-items: flex-start;
        text-align: center;
      }
      
      .avatar {
        margin: 0 auto;
      }
      
      .user-info {
        text-align: center;
        width: 100%;
      }
      
      .roles {
        justify-content: center;
      }
      
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>