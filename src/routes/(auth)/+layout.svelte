<script lang="ts">
    // Auth layout without navigation for login/register pages
  </script>
  
  <div class="auth-layout">
    <slot />
  </div>
  
  <style>
    .auth-layout {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f5f7fa;
    }
  </style>