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
  let showDropdown = false;
  let isScrolled = false;
  
  onMount(() => {
    const unsubscribe = user.subscribe((userData: User | null) => {
      isLoggedIn = !!userData;
      username = userData?.username || '';
      userRoles = userData?.roles || [];
    });
    
    // Add scroll event listener to change navbar style on scroll
    const handleScroll = () => {
      isScrolled = window.scrollY > 20;
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  });
  
  function handleLogout() {
    authService.logout();
    goto('/login');
  }

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }
  
  function toggleDropdown() {
    showDropdown = !showDropdown;
  }
  
  function closeDropdown() {
    showDropdown = false;
  }
</script>

<nav class="navbar" class:scrolled={isScrolled}>
  <div class="container navbar-container">
    <div class="navbar-brand">
      <a href="/" class="navbar-logo">
        <div class="logo-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <circle cx="12" cy="12" r="4"></circle>
          </svg>
        </div>
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
          <a href="/documentation" class="navbar-item">Documentation</a>
          {#if userRoles.includes('Admin')}
            <a href="/admin" class="navbar-item">Admin</a>
          {/if}
        {/if}
        <a href="/about" class="navbar-item">About</a>
      </div>
      
      <div class="navbar-end">
        {#if isLoggedIn}
          <div class="user-profile" on:mouseenter={toggleDropdown} on:mouseleave={closeDropdown}>
            <button class="profile-button">
              <div class="avatar">
                <span>{username.charAt(0).toUpperCase()}</span>
              </div>
              <span class="username">{username}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron" class:open={showDropdown}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            
            {#if showDropdown}
              <div class="dropdown-menu">
                <div class="dropdown-header">
                  <div class="avatar large">
                    <span>{username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div class="user-info">
                    <span class="dropdown-username">{username}</span>
                    <div class="user-roles">
                      {#each userRoles as role}
                        <span class="role-badge">{role}</span>
                      {/each}
                    </div>
                  </div>
                </div>
                <div class="dropdown-items">
                  <a href="/profile" class="dropdown-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Profile</span>
                  </a>
                  <a href="/settings" class="dropdown-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    <span>Settings</span>
                  </a>
                  <button class="dropdown-item logout" on:click={handleLogout}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            {/if}
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
    background-color: rgba(255, 255, 255, 0.95);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    position: sticky;
    top: 0;
    z-index: 1000;
    transition: all 0.3s ease;
    height: 70px;
    display: flex;
    align-items: center;
  }
  
  .navbar.scrolled {
    height: 60px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    background-color: white;
  }
  
  .navbar-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  
  .navbar-brand {
    display: flex;
    align-items: center;
  }
  
  .navbar-logo {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: #2b3a67;
    transition: all 0.2s ease;
  }
  
  .navbar-logo:hover {
    color: #3a86ff;
  }
  
  .logo-icon {
    width: 36px;
    height: 36px;
    color: #3a86ff;
    margin-right: 0.5rem;
  }
  
  .logo-text {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  
  .navbar-menu {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding-left: 2rem;
  }
  
  .navbar-start, .navbar-end {
    display: flex;
    align-items: center;
  }
  
  .navbar-item {
    padding: 0.5rem 1rem;
    color: #2b3a67;
    text-decoration: none;
    font-weight: 500;
    position: relative;
    transition: all 0.2s ease;
  }
  
  .navbar-item::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 0;
    height: 2px;
    background-color: #3a86ff;
    transform: translateX(-50%);
    transition: width 0.3s ease;
  }
  
  .navbar-item:hover {
    color: #3a86ff;
  }
  
  .navbar-item:hover::after {
    width: 60%;
  }
  
  /* User Profile & Dropdown */
  .user-profile {
    position: relative;
  }
  
  .profile-button {
    display: flex;
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }
  
  .profile-button:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: #3a86ff;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    margin-right: 0.75rem;
  }
  
  .avatar.large {
    width: 50px;
    height: 50px;
    font-size: 1.25rem;
  }
  
  .username {
    font-weight: 600;
    color: #2b3a67;
    margin-right: 0.5rem;
  }
  
  .chevron {
    transition: transform 0.2s ease;
  }
  
  .chevron.open {
    transform: rotate(180deg);
  }
  
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    width: 280px;
    overflow: hidden;
    z-index: 1000;
    animation: dropdownFadeIn 0.2s ease;
  }
  
  @keyframes dropdownFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .dropdown-header {
    padding: 1.25rem;
    background-color: #f8f9fa;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #e9ecef;
  }
  
  .user-info {
    display: flex;
    flex-direction: column;
  }
  
  .dropdown-username {
    font-weight: 600;
    color: #2b3a67;
    font-size: 1.1rem;
    margin-bottom: 0.25rem;
  }
  
  .user-roles {
    display: flex;
    gap: 0.5rem;
  }
  
  .role-badge {
    padding: 0.2rem 0.5rem;
    background-color: rgba(58, 134, 255, 0.1);
    color: #3a86ff;
    border-radius: 50rem;
    font-size: 0.7rem;
    font-weight: 600;
  }
  
  .dropdown-items {
    padding: 0.75rem 0;
  }
  
  .dropdown-item {
    display: flex;
    align-items: center;
    padding: 0.75rem 1.25rem;
    color: #2b3a67;
    text-decoration: none;
    transition: background-color 0.2s ease;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
  }
  
  .dropdown-item:hover {
    background-color: #f8f9fa;
  }
  
  .dropdown-item svg {
    margin-right: 0.75rem;
    color: #6c757d;
  }
  
  .dropdown-item.logout {
    color: #e5383b;
  }
  
  .dropdown-item.logout svg {
    color: #e5383b;
  }
  
  /* Login Button */
  .login-btn {
    background-color: #3a86ff;
    color: white;
    padding: 0.5rem 1.25rem;
    border-radius: 4px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
  }
  
  .login-btn:hover {
    background-color: #2667cc;
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  /* Mobile Menu Toggle */
  .menu-toggle {
    display: none;
    flex-direction: column;
    justify-content: space-between;
    width: 24px;
    height: 18px;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  
  .menu-toggle span {
    height: 2px;
    width: 100%;
    background-color: #2b3a67;
    border-radius: 10px;
    transition: all 0.3s ease;
  }
  
  /* Responsive Styles */
  @media (max-width: 992px) {
    .navbar-menu {
      position: fixed;
      top: 70px;
      left: 0;
      right: 0;
      bottom: 0;
      flex-direction: column;
      align-items: flex-start;
      background-color: white;
      padding: 1.5rem;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      z-index: 100;
      overflow-y: auto;
    }
    
    .navbar.scrolled .navbar-menu {
      top: 60px;
    }
    
    .navbar-menu.active {
      transform: translateX(0);
    }
    
    .navbar-start, .navbar-end {
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
    }
    
    .navbar-start {
      margin-bottom: 2rem;
    }
    
    .navbar-item {
      width: 100%;
      padding: 1rem 0;
      border-bottom: 1px solid #e9ecef;
    }
    
    .navbar-item::after {
      display: none;
    }
    
    .menu-toggle {
      display: flex;
    }
    
    .dropdown-menu {
      position: static;
      width: 100%;
      margin-top: 1rem;
      box-shadow: none;
      border: 1px solid #e9ecef;
    }
    
    .user-profile {
      width: 100%;
    }
    
    .login-btn {
      width: 100%;
      justify-content: center;
      margin-top: 1rem;
    }
  }
</style>