<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
  </script>
  
  <svelte:head>
    <title>Access Forbidden - TPServer</title>
    <meta name="description" content="You don't have permission to access this resource" />
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  </svelte:head>
  
  <div class="forbidden-container">
    <div class="forbidden-card">
      <div class="forbidden-icon">
        <span class="material-icons">block</span>
      </div>
      <h1>Access Forbidden</h1>
      <p>Sorry, you don't have permission to access this resource.</p>
      <p class="forbidden-details">Make sure you are signed in with an account that has the required permissions.</p>
      
      <div class="action-buttons">
        <button class="btn-secondary" on:click={() => window.history.back()}>
          <span class="material-icons">arrow_back</span>
          <span>Go Back</span>
        </button>
        <button class="btn-primary" on:click={() => goto('/')}>
          <span class="material-icons">home</span>
          <span>Go to Home</span>
        </button>
      </div>
    </div>
  </div>
  
  <style>
    .forbidden-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 64px); /* Account for navbar height */
      padding: 2rem 1rem;
      background-color: #f8fafc;
    }
    
    .forbidden-card {
      max-width: 500px;
      padding: 2.5rem;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .forbidden-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background-color: #fee2e2;
      color: #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.5rem;
    }
    
    .forbidden-icon .material-icons {
      font-size: 2rem;
    }
    
    h1 {
      font-size: 1.5rem;
      color: #1e3a8a;
      margin: 0 0 1rem 0;
      font-weight: 600;
    }
    
    p {
      margin: 0 0 0.75rem 0;
      color: #334155;
      font-size: 0.95rem;
    }
    
    .forbidden-details {
      color: #64748b;
      font-size: 0.85rem;
      margin-bottom: 1.5rem;
    }
    
    .action-buttons {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }
    
    .btn-primary, .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: none;
    }
    
    .btn-primary {
      background-color: #5c9fff;
      color: white;
    }
    
    .btn-primary:hover {
      background-color: #4a89e8;
    }
    
    .btn-secondary {
      background-color: #f1f5f9;
      color: #334155;
      border: 1px solid #e2e8f0;
    }
    
    .btn-secondary:hover {
      background-color: #e2e8f0;
    }
    
    @media (max-width: 640px) {
      .action-buttons {
        flex-direction: column;
        width: 100%;
      }
      
      .btn-primary, .btn-secondary {
        width: 100%;
        justify-content: center;
      }
    }
  </style>