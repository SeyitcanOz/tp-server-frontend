<script lang="ts">
  import { user } from '$lib/stores/auth';
</script>

<svelte:head>
  <title>TP Server</title>
  <meta name="description" content="TP Server - Project Management Portal" />
</svelte:head>

<div class="welcome-container">
  <h1>Welcome to TP Server</h1>
  
  <div class="card">
    <h2>Project Management Portal</h2>
    <p>
      TP Server is a powerful application designed for managing engineering projects. 
      Use this portal to create, view, and manage your projects.
    </p>
    
    {#if $user}
      <div class="welcome-user">
        <p>Welcome back, <strong>{$user.username}</strong>!</p>
        <a href="/projects" class="primary-button">View Projects</a>
      </div>
    {:else}
      <div class="login-prompt">
        <p>Please log in to access your projects.</p>
        <a href="/login" class="primary-button">Log In</a>
      </div>
    {/if}
  </div>
  
  <div class="features">
    <div class="feature-item">
      <h3>Secure Project Storage</h3>
      <p>All your project data is securely stored and backed up.</p>
    </div>
    <div class="feature-item">
      <h3>Version Control</h3>
      <p>Track all changes with built-in version history for your projects.</p>
    </div>
    <div class="feature-item">
      <h3>Collaboration</h3>
      <p>Share projects with team members based on roles and permissions.</p>
    </div>
  </div>
</div>

<style>
  .welcome-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }
  
  h1 {
    font-size: 2.5rem;
    color: var(--color-theme-1);
    margin-bottom: 2rem;
    text-align: center;
  }
  
  .card {
    background-color: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }
  
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
  }
  
  .feature-item {
    background-color: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .feature-item h3 {
    color: var(--color-theme-2);
    margin-top: 0;
  }
  
  .primary-button {
    display: inline-block;
    background-color: var(--color-theme-1);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 600;
    margin-top: 1rem;
  }
  
  .primary-button:hover {
    background-color: #cc3200;
    text-decoration: none;
  }
  
  .welcome-user, .login-prompt {
    margin-top: 1.5rem;
  }
</style>