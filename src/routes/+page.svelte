<script lang="ts">
  import { user } from '$lib/stores/auth';
</script>

<svelte:head>
  <title>TPServer - Engineering Project Management Platform</title>
  <meta name="description" content="TPServer - Advanced Engineering Project Management Portal for structural analysis and modeling" />
</svelte:head>


<div class="hero">
  <div class="container hero-container">
    <div class="hero-content">
      <h1>Engineering Project <span class="accent">Management</span> Platform</h1>
      <p class="subtitle">Advanced structural modeling, version control, and collaborative tools for engineering teams</p>
      
      {#if $user}
        <div class="hero-actions">
          <a href="/projects" class="btn-primary">View Your Projects</a>
          <a href="/projects/new" class="btn-secondary">Create New Project</a>
        </div>
      {:else}
        <div class="hero-actions">
          <a href="/login" class="btn-primary">Sign In</a>
          <p class="login-subtext">Sign in to access your engineering projects and collaborate with your team</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<div class="container">
  <section class="features-section">
    <h2>How TPServer Helps Engineers</h2>
    
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
        </div>
        <h3>Project Documentation</h3>
        <p>Centralized storage for all your project documentation, ensuring easy access and collaboration.</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
        <h3>Version Control</h3>
        <p>Track all changes with our built-in versioning system, never lose important model updates.</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <h3>Team Collaboration</h3>
        <p>Securely share projects with team members based on roles and specific permissions.</p>
      </div>
    </div>
  </section>

  <section class="about-section">
    <div class="about-content">
      <h2>About TPServer</h2>
      <p>
        TPServer is a specialized platform designed for engineering teams to manage technical projects efficiently. 
        The system provides robust project data management with secure storage, version control, and advanced 
        visualization capabilities for engineering models.
      </p>
      <p>
        With TPServer, engineers can easily collaborate on projects, track changes, and ensure data consistency 
        across the entire project lifecycle.
      </p>
    </div>
  </section>
</div>

<footer>
  <div class="container">
    <p>&copy; 2025 TPServer. All rights reserved.</p>
  </div>
</footer>

<style>
  .hero {
    background-color: var(--secondary-color);
    color: white;
    padding: 4rem 0;
    margin-bottom: 3rem;
  }
  
  .hero-content {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
  }
  
  h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    font-weight: 700;
  }
  
  .subtitle {
    font-size: 1.5rem;
    margin-bottom: 2rem;
    opacity: 0.9;
  }
  
  .hero-actions {
    margin-top: 2rem;
  }
  
  .btn-primary {
    background-color: var(--primary-color);
    color: white;
    padding: 0.75rem 2rem;
    border-radius: 4px;
    font-weight: 600;
    font-size: 1.125rem;
    transition: all 0.2s;
    display: inline-block;
  }
  
  .btn-primary:hover {
    background-color: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    text-decoration: none;
    color: white;
  }
  
  .login-subtext {
    margin-top: 1rem;
    font-size: 0.9rem;
    opacity: 0.7;
  }
  
  .features-section {
    padding: 3rem 0;
  }
  
  .features-section h2 {
    text-align: center;
    margin-bottom: 3rem;
    font-size: 2.25rem;
    color: var(--text-color);
  }
  
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
  }
  
  .feature-card {
    background-color: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: var(--card-shadow);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
  
  .feature-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 1.5rem;
    color: var(--primary-color);
  }
  
  .feature-card h3 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
    color: var(--secondary-color);
  }
  
  .feature-card p {
    color: var(--text-secondary);
    line-height: 1.6;
  }
  
  .about-section {
    padding: 4rem 0;
    background-color: #f4f7fc;
    margin: 3rem 0;
    border-radius: 8px;
  }
  
  .about-content {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }
  
  .about-section h2 {
    margin-bottom: 1.5rem;
    font-size: 2rem;
    color: var(--secondary-color);
  }
  
  .about-section p {
    margin-bottom: 1rem;
    font-size: 1.125rem;
    line-height: 1.7;
  }
  
  footer {
    background-color: var(--dark-color);
    color: white;
    padding: 2rem 0;
    text-align: center;
    margin-top: 4rem;
  }
  
  @media (max-width: 768px) {
    .hero {
      padding: 3rem 0;
    }
    
    h1 {
      font-size: 2.25rem;
    }
    
    .subtitle {
      font-size: 1.25rem;
    }
    
    .features-section h2 {
      font-size: 1.75rem;
    }
  }
</style>