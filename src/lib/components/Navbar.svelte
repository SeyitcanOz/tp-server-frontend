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
  
  // Track if the user is hovering over the dropdown menu
  let isHoveringDropdown = false;
  
  function toggleDropdown() {
    showDropdown = !showDropdown;
  }
  
  function handleDropdownHoverStart() {
    showDropdown = true;
    isHoveringDropdown = true;
  }
  
  function handleDropdownHoverEnd() {
    isHoveringDropdown = false;
    // Use a timeout to allow time to move to the dropdown items before closing
    setTimeout(() => {
      if (!isHoveringDropdown) {
        showDropdown = false;
      }
    }, 300);
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
    }, 300);
  }
  
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
      <button class="menu-toggle" class:active={isMenuOpen} on:click={toggleMenu} aria-label="Toggle menu">
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
        {/if}
      </div>
      
      <div class="navbar-end">
        {#if isLoggedIn}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="user-profile" 
               on:mouseenter={handleDropdownHoverStart} 
               on:mouseleave={handleDropdownHoverEnd}>
            <button class="profile-button" on:click={toggleDropdown}>
              <div class="avatar">
                <span>{username.charAt(0).toUpperCase()}</span>
              </div>
              <span class="username">{username}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron" class:open={showDropdown}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            
            {#if showDropdown}
              <div class="dropdown-menu"
                   on:mouseenter={handleDropdownMenuHoverStart}
                   on:mouseleave={handleDropdownMenuHoverEnd}>
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
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
    position: sticky;
    top: 0;
    z-index: 1000;
    transition: all 0.3s ease;
    height: 70px;
    display: flex;
    align-items: center;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
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
    padding: 0.5rem;
    border-radius: 8px;
  }
  
  .navbar-logo:hover {
    color: #3a86ff;
    background-color: rgba(58, 134, 255, 0.08);
  }
  
  .logo-icon {
    width: 36px;
    height: 36px;
    color: #3a86ff;
    margin-right: 0.75rem;
    filter: drop-shadow(0 2px 4px rgba(58, 134, 255, 0.25));
  }
  
  .logo-text {
    font-size: 1.6rem;
    font-weight: 700;
    letter-spacing: -0.5px;
    background: linear-gradient(45deg, #3a86ff, #2667cc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
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
    padding: 0.6rem 1.2rem;
    color: #2b3a67;
    text-decoration: none;
    font-weight: 600;
    position: relative;
    transition: all 0.2s ease;
    border-radius: 8px;
    margin: 0 0.25rem;
  }
  
  .navbar-item::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 0;
    height: 3px;
    background-color: #3a86ff;
    transform: translateX(-50%);
    transition: width 0.3s ease;
    border-radius: 3px;
  }
  
  .navbar-item:hover {
    color: #3a86ff;
    background-color: rgba(58, 134, 255, 0.08);
  }
  
  .navbar-item:hover::after {
    width: 40%;
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
    padding: 0.6rem 1rem;
    border-radius: 8px;
    transition: all 0.2s ease;
  }
  
  .profile-button:hover {
    background-color: rgba(58, 134, 255, 0.08);
  }
  
  .avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: linear-gradient(45deg, #3a86ff, #2667cc);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    margin-right: 0.75rem;
    box-shadow: 0 2px 8px rgba(58, 134, 255, 0.3);
  }
  
  .avatar.large {
    width: 52px;
    height: 52px;
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
    transition: opacity 0.3s, transform 0.3s;
  }
  
  @keyframes dropdownFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  /* Add mobile menu animation */
  @keyframes slideIn {
    from { transform: translateX(-100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  .dropdown-header {
    padding: 1.5rem;
    background: linear-gradient(135deg, #f8f9fa, #f0f4ff);
    display: flex;
    align-items: center;
    border-bottom: 1px solid #e9ecef;
    position: relative;
    overflow: hidden;
  }
  
  .dropdown-header:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(to right, #3a86ff, #2667cc);
    z-index: 1;
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
    padding: 0.25rem 0.6rem;
    background: linear-gradient(45deg, rgba(58, 134, 255, 0.12), rgba(38, 103, 204, 0.12));
    color: #3a86ff;
    border-radius: 50rem;
    font-size: 0.7rem;
    font-weight: 600;
    border: 1px solid rgba(58, 134, 255, 0.2);
    box-shadow: 0 1px 3px rgba(58, 134, 255, 0.1);
  }
  
  .dropdown-items {
    padding: 0.75rem 0;
  }
  
  .dropdown-item {
    display: flex;
    align-items: center;
    padding: 0.9rem 1.25rem;
    color: #2b3a67;
    text-decoration: none;
    transition: all 0.2s ease;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    border-left: 3px solid transparent;
    font-weight: 500;
  }
  
  .dropdown-item:hover {
    background-color: #f8f9fa;
    border-left-color: #3a86ff;
    transform: translateX(2px);
  }
  
  .dropdown-item svg {
    margin-right: 0.75rem;
    color: #3a86ff;
    transition: transform 0.2s ease;
  }
  
  .dropdown-item:hover svg {
    transform: scale(1.1);
  }
  
  .dropdown-item.logout {
    color: #e5383b;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    margin-top: 0.25rem;
  }
  
  .dropdown-item.logout:hover {
    border-left-color: #e5383b;
    background-color: rgba(229, 56, 59, 0.05);
  }
  
  .dropdown-item.logout svg {
    color: #e5383b;
  }
  
  /* Login Button */
  .login-btn {
    background: linear-gradient(45deg, #3a86ff, #2667cc);
    color: white;
    padding: 0.6rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    box-shadow: 0 2px 6px rgba(58, 134, 255, 0.25);
    position: relative;
    overflow: hidden;
    z-index: 1;
  }
  
  .login-btn:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(45deg, #2667cc, #3a86ff);
    z-index: -1;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .login-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(58, 134, 255, 0.35);
  }
  
  .login-btn:hover:before {
    opacity: 1;
  }
  
  /* Mobile Toggle */
  .menu-toggle {
    display: none;
    flex-direction: column;
    justify-content: space-between;
    width: 28px;
    height: 20px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.75rem;
    border-radius: 8px;
    transition: background-color 0.2s ease;
  }
  
  .menu-toggle:hover {
    background-color: rgba(58, 134, 255, 0.08);
  }
  
  .menu-toggle span {
    height: 2px;
    width: 100%;
    background-color: #3a86ff;
    border-radius: 10px;
    transition: all 0.3s ease;
    box-shadow: 0 1px 2px rgba(58, 134, 255, 0.2);
  }
  
  .menu-toggle.active span:nth-child(1) {
    transform: translateY(8px) rotate(45deg);
  }
  
  .menu-toggle.active span:nth-child(2) {
    opacity: 0;
  }
  
  .menu-toggle.active span:nth-child(3) {
    transform: translateY(-8px) rotate(-45deg);
  }
  
  /* Mobile and Tablet Navigation */
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
      box-shadow: 5px 0 15px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.3s forwards;
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
      padding: 1rem 0.75rem;
      margin: 0.5rem 0;
      border-radius: 8px;
      border-left: 3px solid transparent;
      transition: all 0.3s ease;
    }
    
    .navbar-item:hover {
      background-color: rgba(58, 134, 255, 0.08);
      border-left-color: #3a86ff;
      padding-left: 1.25rem;
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
      border-radius: 12px;
      overflow: hidden;
      animation: dropdownFadeIn 0.3s ease;
    }
    
    .user-profile {
      width: 100%;
    }
    
    .login-btn {
      width: 100%;
      justify-content: center;
      margin-top: 1rem;
      padding: 0.9rem;
    }
  }
</style>