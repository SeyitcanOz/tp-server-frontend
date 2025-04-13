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
  
  // Track if the user is hovering over the dropdown menu
  let isHoveringDropdown = false;
  
  function toggleDropdown() {
    showDropdown = !showDropdown;
  }
  
  function handleDropdownHoverStart() {
    isHoveringDropdown = true;
    showDropdown = true;
  }
  
  function handleDropdownHoverEnd() {
    isHoveringDropdown = false;
    // Use a timeout to allow time to move to the dropdown items before closing
    setTimeout(() => {
      if (!isHoveringDropdown) {
        showDropdown = false;
      }
    }, 200);
  }
  
  function handleDropdownMenuHoverStart() {
    isHoveringDropdown = true;
  }
  
  function handleDropdownMenuHoverEnd() {
    isHoveringDropdown = false;
    // Use a timeout to prevent closing when moving between menu items
    setTimeout(() => {
      if (!isHoveringDropdown) {
        showDropdown = false;
      }
    }, 200);
  }
  
  onMount(() => {
    const unsubscribe = user.subscribe((userData: User | null) => {
      isLoggedIn = !!userData;
      username = userData?.username || '';
      userRoles = userData?.roles || [];
    });
    
    return () => {
      unsubscribe();
    };
  });
  
  function handleLogout() {
    authService.logout();
    goto('/login');
  }

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</svelte:head>

<header class="navbar">
  <div class="container">
    <div class="navbar-brand">
      <a href="/" class="brand-link">
        <span class="brand-text">TPServer</span>
      </a>
      
      <button class="menu-toggle" 
              class:active={isMenuOpen} 
              on:click={toggleMenu} 
              aria-label="Toggle menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
    
    <nav class="navbar-menu" class:active={isMenuOpen}>
      <div class="nav-links">
        <a href="/" class="nav-link">Home</a>
        {#if isLoggedIn}
          <a href="/projects" class="nav-link">Projects</a>
          <a href="/api-docs" class="nav-link">API Docs</a>
        {/if}
      </div>
      
      <div class="nav-auth">
        {#if isLoggedIn}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="user-dropdown" 
               on:mouseenter={handleDropdownHoverStart} 
               on:mouseleave={handleDropdownHoverEnd}>
            <button class="user-button" on:click={toggleDropdown}>
              <div class="avatar">
                {username.charAt(0).toUpperCase()}
              </div>
              <span class="username">{username}</span>
              <i class="material-icons dropdown-icon" class:open={showDropdown}>expand_more</i>
            </button>
            
            {#if showDropdown}
              <div class="dropdown-menu"
                   on:mouseenter={handleDropdownMenuHoverStart}
                   on:mouseleave={handleDropdownMenuHoverEnd}>
                <div class="dropdown-header">
                  <div class="user-info">
                    <span class="user-name">{username}</span>
                    <div class="user-roles">
                      {#each userRoles as role}
                        <span class="role-badge">{role}</span>
                      {/each}
                    </div>
                  </div>
                </div>
                <div class="dropdown-items">
                  <a href="/profile" class="dropdown-item">
                    <i class="material-icons">person</i>
                    <span>Profile</span>
                  </a>
                  <button class="dropdown-item logout" on:click={handleLogout}>
                    <i class="material-icons">logout</i>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {:else}
          <a href="/login" class="btn-primary">Sign In</a>
        {/if}
      </div>
    </nav>
  </div>
</header>

<style>
  /* Navbar Base - Fixed position instead of sticky */
  .navbar {
    background-color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: fixed; /* Changed from sticky to fixed */
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    height: 64px; /* Slightly increased height */
    display: flex;
    align-items: center;
  }
  
  .container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
  }
  
  /* Brand Section - Modernized */
  .navbar-brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .brand-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: #1e3a8a;
    font-weight: 600;
    transition: color 0.2s;
  }
  
  .brand-link:hover {
    color: #5c9fff;
  }
  
  .brand-text {
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  /* Navbar Menu - Redesigned */
  .navbar-menu {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 1;
    margin-left: 2rem;
  }
  
  .nav-links {
    display: flex;
    align-items: center;
    gap: 1rem; /* Increased spacing between links */
  }
  
  .nav-link {
    padding: 0.5rem 0.75rem;
    color: #334155;
    text-decoration: none;
    font-size: 0.9rem; /* Slightly larger font */
    font-weight: 500;
    border-radius: 4px;
    transition: all 0.2s;
    position: relative; /* For underline effect */
  }
  
  /* Added underline effect on hover */
  .nav-link:after {
    content: '';
    position: absolute;
    width: 0;
    height: 2px;
    bottom: 0;
    left: 50%;
    background-color: #5c9fff;
    transition: all 0.2s ease-out;
  }
  
  .nav-link:hover {
    color: #5c9fff;
  }
  
  .nav-link:hover:after {
    width: 80%;
    left: 10%;
  }
  
  /* Auth Section - Modernized */
  .nav-auth {
    display: flex;
    align-items: center;
  }
  
  .btn-primary {
    background-color: #5c9fff;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(92, 159, 255, 0.25);
  }
  
  .btn-primary:hover {
    background-color: #4a89e8;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(92, 159, 255, 0.3);
  }
  
  /* User Dropdown - Redesigned */
  .user-dropdown {
    position: relative;
  }
  
  .user-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.4rem 0.6rem;
    border-radius: 6px; /* Rounded corners */
    transition: all 0.2s;
  }
  
  .user-button:hover {
    background-color: #f1f5f9;
  }
  
  .avatar {
    width: 32px; /* Slightly larger */
    height: 32px; /* Slightly larger */
    border-radius: 50%;
    background-color: #5c9fff;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .username {
    font-size: 0.9rem;
    color: #334155;
    font-weight: 500;
  }
  
  .dropdown-icon {
    font-size: 1.1rem;
    color: #64748b;
    transition: transform 0.2s;
  }
  
  .dropdown-icon.open {
    transform: rotate(180deg);
  }
  
  /* Dropdown Menu - Improved design */
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    width: 240px; /* Slightly wider */
    background-color: white;
    border-radius: 8px; /* More rounded corners */
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1); /* Deeper shadow */
    overflow: hidden;
    z-index: 100;
    border: 1px solid #e2e8f0;
    animation: fadeIn 0.2s ease-out; /* Subtle animation */
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .dropdown-header {
    padding: 0.85rem 1.25rem; /* More padding */
    background-color: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .user-info {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  
  .user-name {
    font-weight: 600;
    color: #1e3a8a;
    font-size: 0.95rem;
  }
  
  .user-roles {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  
  .role-badge {
    font-size: 0.7rem;
    background-color: #f0f4ff;
    color: #5c9fff;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-weight: 500;
  }
  
  .dropdown-items {
    padding: 0.5rem 0;
  }
  
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1.25rem;
    font-size: 0.9rem;
    color: #334155;
    text-decoration: none;
    width: 100%;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .dropdown-item:hover {
    background-color: #f1f5f9;
    color: #5c9fff;
  }
  
  .dropdown-item .material-icons {
    font-size: 1.1rem;
    color: #64748b;
  }
  
  .dropdown-item:hover .material-icons {
    color: #5c9fff;
  }
  
  .dropdown-item.logout {
    color: #dc2626;
    border-top: 1px solid #f1f5f9;
    margin-top: 0.25rem;
  }
  
  .dropdown-item.logout .material-icons {
    color: #dc2626;
  }
  
  /* Mobile Menu Toggle - Improved */
  .menu-toggle {
    display: none;
    flex-direction: column;
    justify-content: space-between;
    width: 26px; /* Slightly larger */
    height: 20px; /* Slightly larger */
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }
  
  .menu-toggle span {
    display: block;
    height: 2px;
    width: 100%;
    background-color: #334155;
    border-radius: 2px;
    transition: all 0.3s; /* Smoother animation */
  }
  
  .menu-toggle.active span:nth-child(1) {
    transform: translateY(9px) rotate(45deg);
  }
  
  .menu-toggle.active span:nth-child(2) {
    opacity: 0;
  }
  
  .menu-toggle.active span:nth-child(3) {
    transform: translateY(-9px) rotate(-45deg);
  }
  
  /* Responsive Styles - Improved */
  @media (max-width: 768px) {
    .navbar {
      height: auto;
      min-height: 64px;
    }
    
    .container {
      flex-wrap: wrap;
      padding: 0.85rem 1rem;
    }
    
    .navbar-brand {
      width: 100%;
    }
    
    .menu-toggle {
      display: flex;
    }
    
    .navbar-menu {
      display: none;
      width: 100%;
      flex-direction: column;
      align-items: flex-start;
      margin-left: 0;
      margin-top: 1rem;
      gap: 1rem;
    }
    
    .navbar-menu.active {
      display: flex;
    }
    
    .nav-links {
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      gap: 0.25rem;
    }
    
    .nav-link {
      width: 100%;
      padding: 0.75rem;
      border-radius: 6px;
    }
    
    .nav-link:after {
      display: none; /* Remove underline effect on mobile */
    }
    
    .nav-link:hover {
      background-color: #f1f5f9;
    }
    
    .nav-auth {
      width: 100%;
    }
    
    .user-dropdown {
      width: 100%;
    }
    
    .user-button {
      width: 100%;
      justify-content: space-between;
      padding: 0.75rem;
      border-radius: 6px;
    }
    
    .btn-primary {
      width: 100%;
      text-align: center;
      padding: 0.75rem;
    }
    
    .dropdown-menu {
      position: static;
      width: 100%;
      margin-top: 0.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      animation: none;
    }
  }
  
  /* Add spacing below navbar for the fixed positioning */
  :global(body) {
    padding-top: 64px; /* Same as navbar height */
  }
</style>