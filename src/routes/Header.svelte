<script lang="ts">
  import { page } from '$app/stores';
  import { user } from '$lib/stores/auth';
  import { authService } from '$lib/services/auth';

  function logout() {
    authService.logout();
    window.location.href = '/';
  }
</script>

<header>
  <div class="logo">
    <a href="/">
      <h1>TP Server</h1>
    </a>
  </div>

  <nav>
    <svg viewBox="0 0 2 3" aria-hidden="true">
      <path d="M0,0 L1,2 C1.5,3 1.5,3 2,3 L2,0 Z" />
    </svg>
    <ul>
      <li aria-current={$page.url.pathname === '/' ? 'page' : undefined}>
        <a href="/">Home</a>
      </li>
      
      {#if $user}
        <li aria-current={$page.url.pathname === '/projects' ? 'page' : undefined}>
          <a href="/projects">Projects</a>
        </li>
        
        {#if $user.roles.includes('Admin')}
          <li aria-current={$page.url.pathname === '/admin' ? 'page' : undefined}>
            <a href="/admin">Admin</a>
          </li>
        {/if}
      {/if}

      <li aria-current={$page.url.pathname === '/about' ? 'page' : undefined}>
        <a href="/about">About</a>
      </li>
    </ul>
    <svg viewBox="0 0 2 3" aria-hidden="true">
      <path d="M0,0 L0,3 C0.5,3 0.5,3 1,2 L2,0 Z" />
    </svg>
  </nav>

  <div class="auth-actions">
    {#if $user}
      <span class="username">{$user.username}</span>
      <button class="logout-button" on:click={logout}>Logout</button>
    {:else}
      <a href="/login" class="login-button">Login</a>
    {/if}
  </div>
</header>

<style>
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1rem;
    background-color: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .logo h1 {
    font-size: 1.5rem;
    margin: 0;
    padding: 0.5rem 0;
    color: var(--color-theme-1);
  }
  
  .logo a {
    text-decoration: none;
  }

  nav {
    display: flex;
    justify-content: center;
    --background: rgba(255, 255, 255, 0.7);
  }

  svg {
    width: 2em;
    height: 3em;
    display: block;
  }

  path {
    fill: var(--background);
  }

  ul {
    position: relative;
    padding: 0;
    margin: 0;
    height: 3em;
    display: flex;
    justify-content: center;
    align-items: center;
    list-style: none;
    background: var(--background);
    background-size: contain;
  }

  li {
    position: relative;
    height: 100%;
  }

  li[aria-current='page']::before {
    --size: 6px;
    content: '';
    width: 0;
    height: 0;
    position: absolute;
    top: 0;
    left: calc(50% - var(--size));
    border: var(--size) solid transparent;
    border-top: var(--size) solid var(--color-theme-1);
  }

  nav a {
    display: flex;
    height: 100%;
    align-items: center;
    padding: 0 0.8rem;
    color: var(--color-text);
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none;
    transition: color 0.2s linear;
  }

  a:hover {
    color: var(--color-theme-1);
  }
  
  .auth-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .username {
    font-weight: 600;
    color: var(--color-theme-2);
  }
  
  .login-button, .logout-button {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.9rem;
    font-weight: 600;
  }
  
  .login-button {
    background-color: var(--color-theme-1);
    color: white;
    text-decoration: none;
  }
  
  .logout-button {
    background-color: transparent;
    color: var(--color-text);
    border: 1px solid #ddd;
    cursor: pointer;
  }
  
  .login-button:hover {
    background-color: #cc3200;
    text-decoration: none;
  }
  
  .logout-button:hover {
    background-color: #f8f8f8;
  }
  
  @media (max-width: 640px) {
    header {
      flex-direction: column;
      padding: 1rem;
    }
    
    nav ul {
      margin: 1rem 0;
    }
    
    .auth-actions {
      margin-top: 0.5rem;
      width: 100%;
      justify-content: center;
    }
  }
</style>