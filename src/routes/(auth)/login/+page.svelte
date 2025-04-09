<script lang="ts">
  import { authService } from '$lib/services/auth';
  import { goto } from '$app/navigation';
  import type { AxiosError } from 'axios';
  
  let username = '';
  let password = '';
  let errorMessage = '';
  let isLoading = false;
  
  async function handleLogin() {
    if (!username || !password) {
      errorMessage = 'Please enter both username and password';
      return;
    }
    
    try {
      isLoading = true;
      errorMessage = '';
      
      await authService.login({ username, password });
      
      // Redirect to projects page on successful login
      goto('/projects');
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      // Type guard to check if error is an AxiosError
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as AxiosError;
        if (axiosError.response && axiosError.response.status === 401) {
          errorMessage = 'Invalid username or password';
        } else {
          errorMessage = 'An error occurred during login. Please try again.';
        }
      } else {
        errorMessage = 'An error occurred during login. Please try again.';
      }
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Login - TP Server</title>
  <meta name="description" content="Log in to TP Server" />
</svelte:head>

<div class="login-page">
  <div class="login-container">
    <div class="login-header">
      <div class="logo">
        <a href="/">
          <span class="logo-text">TPServer</span>
        </a>
      </div>
      <h1>Welcome Back</h1>
      <p>Sign in to access your projects</p>
    </div>
    
    <form on:submit|preventDefault={handleLogin} class="login-form">
      {#if errorMessage}
        <div class="error-message">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          {errorMessage}
        </div>
      {/if}
      
      <div class="form-group">
        <label for="username">Username</label>
        <div class="input-with-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <input 
            id="username"
            type="text" 
            bind:value={username} 
            placeholder="Enter your username" 
            disabled={isLoading}
            required
          />
        </div>
      </div>
      
      <div class="form-group">
        <label for="password">Password</label>
        <div class="input-with-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <input 
            id="password"
            type="password" 
            bind:value={password} 
            placeholder="Enter your password" 
            disabled={isLoading}
            required
          />
        </div>
      </div>
      
      <button type="submit" class="login-button" disabled={isLoading}>
        {#if isLoading}
          <span class="spinner"></span> Logging in...
        {:else}
          Sign In
        {/if}
      </button>
    </form>
    
    <div class="login-footer">
      <p><a href="/">Return to Home</a></p>
    </div>
  </div>
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f4f7fc;
    padding: 2rem 1rem;
  }
  
  .login-container {
    max-width: 450px;
    width: 100%;
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
    padding: 2.5rem;
  }
  
  .login-header {
    margin-bottom: 2rem;
    text-align: center;
  }
  
  .logo {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
  }
  
  .logo a {
    text-decoration: none;
  }
  
  .logo-text {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--primary-color);
  }
  
  h1 {
    font-size: 1.75rem;
    color: var(--secondary-color);
    margin: 0;
    margin-bottom: 0.5rem;
  }
  
  .login-header p {
    color: var(--text-secondary);
    margin: 0;
  }
  
  .login-form {
    margin-bottom: 2rem;
  }
  
  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background-color: #fee2e2;
    color: #ef4444;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
  }
  
  .error-message svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--text-color);
  }
  
  .input-with-icon {
    position: relative;
  }
  
  .input-with-icon svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    color: var(--text-secondary);
  }
  
  .input-with-icon input {
    width: 100%;
    padding: 0.875rem 1rem 0.875rem 3rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 1rem;
    transition: all 0.2s;
  }
  
  .input-with-icon input:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    outline: none;
  }
  
  .login-button {
    width: 100%;
    padding: 0.875rem;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .login-button:hover:not(:disabled) {
    background-color: var(--primary-dark);
  }
  
  .login-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 0.8s linear infinite;
    margin-right: 0.5rem;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .login-footer {
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  
  .login-footer a {
    color: var(--primary-color);
    text-decoration: none;
  }
  
  .login-footer a:hover {
    text-decoration: underline;
  }
  
  @media (max-width: 480px) {
    .login-container {
      padding: 1.5rem;
    }
  }
</style>