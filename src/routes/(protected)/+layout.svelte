<script lang="ts">
    import { browser } from '$app/environment';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { authService } from '$lib/services/auth';
    import Navbar from '$lib/components/Navbar.svelte';
    
    onMount(() => {
      if (browser && !authService.isAuthenticated()) {
        goto('/login');
      }
    });
  </script>
  
  <Navbar />
  
  <div class="container page-container">
    <slot />
  </div>