<script lang="ts">
  import { user } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  
  // Animation control
  let isVisible = false;
  
  onMount(() => {
    // Trigger animations after component mounts
    setTimeout(() => {
      isVisible = true;
    }, 100);
  });
</script>

<svelte:head>
  <title>TPServer - Project Management Platform</title>
  <meta name="description" content="TPServer - Project Management Portal for engineering teams" />
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</svelte:head>

<div class="welcome-section">
  <div class="container">
    <div class="welcome-content" class:animated={isVisible}>
      <!-- Animated Title with Neon Effect -->
      <h1 class="animated-title">
        <span>Welcome to </span>
        <span class="tpserver">TPServer</span>
      </h1>
      
      <p class="subtitle">Your centralized platform for project management and version control</p>
      
      {#if $user}
        <a href="/projects" class="cta-button">
          <span class="material-icons">dashboard</span>
          <span>Go to Projects</span>
        </a>
      {:else}
        <a href="/login" class="cta-button">
          <span class="material-icons">login</span>
          <span>Sign In</span>
        </a>
      {/if}
    </div>
  </div>
</div>

<footer class="main-footer">
  <div class="container">
    <p>&copy; 2025 TPServer. All rights reserved.</p>
  </div>
</footer>

<style>
  /* Welcome Section */
  .welcome-section {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #f8fafc;
    margin-bottom: 2rem;
  }
  
  .welcome-content {
    text-align: center;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.8s ease-out;
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 0;
  }
  
  .welcome-content.animated {
    opacity: 1;
    transform: translateY(0);
  }
  
  /* Animated Title with Neon Effect */
  .animated-title {
    font-size: 4.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    line-height: 1.2;
    color: #1e293b;
  }
  
  .animated-title .tpserver {
    color: #5c9fff;
    position: relative;
    text-shadow: 0 0 10px rgba(92, 159, 255, 0.5), 
                 0 0 20px rgba(92, 159, 255, 0.3), 
                 0 0 30px rgba(92, 159, 255, 0.1);
    animation: neonPulse 3s ease-in-out infinite, 
               colorShift 8s ease-in-out infinite;
  }
  
  @keyframes neonPulse {
    0%, 100% { 
      text-shadow: 0 0 10px rgba(92, 159, 255, 0.5), 
                  0 0 20px rgba(92, 159, 255, 0.3), 
                  0 0 30px rgba(92, 159, 255, 0.1);
    }
    50% { 
      text-shadow: 0 0 15px rgba(92, 159, 255, 0.8), 
                  0 0 25px rgba(92, 159, 255, 0.6), 
                  0 0 35px rgba(92, 159, 255, 0.4),
                  0 0 45px rgba(92, 159, 255, 0.2);
    }
  }
  
  @keyframes colorShift {
    0%, 100% { color: #5c9fff; }
    33% { color: #3a86ff; }
    66% { color: #2667cc; }
  }
  
  .subtitle {
    font-size: 1.5rem;
    margin-bottom: 3rem;
    line-height: 1.4;
    opacity: 0.8;
    white-space: nowrap;
    color: #475569;
  }
  
  .cta-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background-color: #5c9fff;
    color: white;
    padding: 1rem 2.5rem;
    border-radius: 50px;
    font-size: 1.2rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s ease;
    box-shadow: 0 8px 20px rgba(92, 159, 255, 0.25);
  }
  
  .cta-button:hover {
    background-color: #3a86ff;
    transform: translateY(-3px);
    box-shadow: 0 12px 25px rgba(92, 159, 255, 0.3);
    color: white;
    text-decoration: none;
  }
  
  .cta-button .material-icons {
    font-size: 1.4rem;
  }
  
  /* Footer */
  .main-footer {
    background-color: #f8fafc;
    color: #64748b;
    padding: 1.5rem 0;
    text-align: center;
    border-top: 1px solid #e2e8f0;
  }
  
  .main-footer p {
    margin: 0;
    font-size: 0.9rem;
  }
  
  /* Responsive Styles */
  @media (max-width: 768px) {
    .welcome-section {
      min-height: auto;
      padding: 6rem 0;
    }
    
    .animated-title {
      font-size: 3.5rem;
    }
    
    .subtitle {
      font-size: 1.2rem;
      white-space: normal;
    }
  }
  
  @media (max-width: 576px) {
    .animated-title {
      font-size: 2.8rem;
    }
    
    .subtitle {
      font-size: 1.1rem;
      margin-bottom: 2.5rem;
    }
    
    .cta-button {
      width: 100%;
      justify-content: center;
      padding: 0.9rem 2rem;
    }
  }
</style>