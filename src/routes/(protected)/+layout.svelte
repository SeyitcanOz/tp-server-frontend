<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authService } from '$lib/services/auth';
  
  // Only perform auth check in browser environment
  onMount(() => {
    if (!authService.isAuthenticated()) {
      goto('/login');
    }
  });
</script>

<div class="container page-container">
  <slot />
</div>