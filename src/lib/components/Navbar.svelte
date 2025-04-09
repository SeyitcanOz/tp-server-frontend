<script lang="ts">
    import { onMount } from 'svelte';
    import { user } from '../stores/auth';
    import { authService } from '../services/auth';
    import { goto } from '$app/navigation';
    import type { User } from '../types/auth';
    
    let isLoggedIn = false;
    let username = '';
    
    onMount(() => {
      const unsubscribe = user.subscribe((userData: User | null) => {
        isLoggedIn = !!userData;
        username = userData?.username || '';
      });
      
      return unsubscribe;
    });
    
    function handleLogout() {
      authService.logout();
      goto('/login');
    }
  </script>
  
  <nav class="navbar">
    <div class="navbar-brand">
      <a href="/" class="navbar-logo">TPServer</a>
    </div>
    
    <div class="navbar-menu">
      <div class="navbar-start">
        <a href="/" class="navbar-item">Home</a>
        {#if isLoggedIn}
          <a href="/projects" class="navbar-item">Projects</a>
          {#if authService.hasRole('Admin')}
            <a href="/admin" class="navbar-item">Admin</a>
          {/if}
        {/if}
      </div>
      
      <div class="navbar-end">
        {#if isLoggedIn}
          <span class="navbar-item">Welcome, {username}</span>
          <button class="navbar-item logout-btn" on:click={handleLogout}>Logout</button>
        {:else}
          <a href="/login" class="navbar-item">Login</a>
        {/if}
      </div>
    </div>
  </nav>
  
  <style>
    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #2c3e50;
      padding: 0.5rem 2rem;
      color: white;
    }
    
    .navbar-brand {
      display: flex;
      align-items: center;
    }
    
    .navbar-logo {
      color: white;
      font-size: 1.5rem;
      font-weight: bold;
      text-decoration: none;
    }
    
    .navbar-menu {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-left: 2rem;
    }
    
    .navbar-start, .navbar-end {
      display: flex;
      align-items: center;
    }
    
    .navbar-item {
      color: white;
      margin: 0 1rem;
      text-decoration: none;
    }
    
    .navbar-item:hover {
      color: #3498db;
    }
    
    .logout-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      color: white;
    }
    
    .logout-btn:hover {
      color: #e74c3c;
    }
  </style>