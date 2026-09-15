<!-- app/app.vue -->
<template>
  <UApp class="">
    <div class="relative isolate min-h-screen bg-surface-200">
      <img src="/background.svg" alt="" class="fixed inset-0 -z-10 w-full h-full max-w-md object-cover"/>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>

  </UApp>
</template>

<script lang="ts" setup>
</script>