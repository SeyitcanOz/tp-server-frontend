<script lang="ts">
  import { onMount } from 'svelte';
  import { user } from '../stores/auth';
  import { authService } from '../services/auth';
  import { goto } from '$app/navigation';
  import type { User } from '../types/auth';
  
  let isLoggedIn = false;
  let username = '';
  let userRoles: string[] = [];
  let isMenuOpen = false;
  
  onMount(() => {
    const unsubscribe = user.subscribe((userData: User | null) => {
      isLoggedIn = !!userData;
      username = userData?.username || '';
      userRoles = userData?.roles || [];
    });
    
    return unsubscribe;
  });
  
  function handleLogout() {
    authService.logout();
    goto('/login');
  }

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }
</script>

<nav class="navbar">
  <div class="container navbar-container">
    <div class="navbar-brand">
      <a href="/" class="navbar-logo">
        <span class="logo-text">TPServer</span>
      </a>
      <button class="menu-toggle" on:click={toggleMenu} aria-label="Toggle menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
    
    <div class="navbar-menu" class:active={isMenuOpen}>
      <div class="navbar-start">
        <a href="/" class="navbar-item">Home</a>
        {#if isLoggedIn}
          <a href="/projects" class="navbar-item">Projects</a>
          {#if userRoles.includes('Admin')}
            <a href="/admin" class="navbar-item">Admin</a>
          {/if}
        {/if}
      </div>
      
      <div class="navbar-end">
        {#if isLoggedIn}
          <div class="user-profile">
            <span class="username">{username}</span>
            <button class="logout-btn" on:click={handleLogout}>Logout</button>
          </div>
        {:else}
          <a href="/login" class="login-btn">Login</a>
        {/if}
      </div>
    </div>
  </div>
</nav>

<style>
  .navbar {
    background-color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .navbar-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
  }
  
  .navbar-brand {
    display: flex;
    align-items: center;
  }
  
  .navbar-logo {
    display: flex;
    align-items: center;
    text-decoration: none;
  }
  
  .logo-text {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-color);
    margin-left: 0.5rem;
  }
  
  .navbar-menu {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  
  .navbar-start, .navbar-end {
    display: flex;
    align-items: center;
  }
  
  .navbar-start {
    margin-left: 2rem;
  }
  
  .navbar-item {
    padding: 0.5rem 1rem;
    color: var(--text-color);
    text-decoration: none;
    font-weight: 500;
    position: relative;
  }
  
  .navbar-item:hover {
    color: var(--primary-color);
  }
  
  .navbar-item:after {
    content: '';
    position: absolute;
    width: 0;
    height: 2px;
    bottom: 0;
    left: 50%;
    background-color: var(--primary-color);
    transition: all 0.3s ease;
  }
  
  .navbar-item:hover:after {
    width: 70%;
    left: 15%;
  }
  
  .user-profile {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .username {
    font-weight: 600;
    color: var(--secondary-color);
  }
  
  .logout-btn {
    background-color: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-color);
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  
  .logout-btn:hover {
    border-color: var(--danger-color);
    color: var(--danger-color);
  }
  
  .login-btn {
    background-color: var(--primary-color);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 600;
    transition: background-color 0.2s;
  }
  
  .login-btn:hover {
    background-color: var(--primary-dark);
    color: white;
  }
  
  .menu-toggle {
    display: none;
    flex-direction: column;
    justify-content: space-between;
    width: 30px;
    height: 21px;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  
  .menu-toggle span {
    height: 3px;
    width: 100%;
    background-color: var(--text-color);
    border-radius: 10px;
    transition: all 0.3s ease;
  }
  
  @media (max-width: 768px) {
    .navbar-menu {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      flex-direction: column;
      align-items: flex-start;
      background-color: white;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 1rem;
      clip-path: circle(0% at 100% 0);
      transition: clip-path 0.4s ease-out;
      pointer-events: none;
    }
    
    .navbar-menu.active {
      clip-path: circle(150% at 100% 0);
      pointer-events: all;
    }
    
    .navbar-start, .navbar-end {
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
    }
    
    .navbar-start {
      margin-left: 0;
      margin-bottom: 1rem;
    }
    
    .navbar-item {
      width: 100%;
      padding: 0.75rem 0;
    }
    
    .user-profile {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
      width: 100%;
    }
    
    .menu-toggle {
      display: flex;
    }
  }
</style>