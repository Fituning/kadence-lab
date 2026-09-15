<script setup lang="ts">
import Navbar from "~/components/layout/Navbar.vue";
</script>
<template>
  <div class="bg-transparent text-surface-900">
    <LayoutHeader />
    <main class="min-h-dvh w-full">
      <slot/>
    </main>
    <LayoutNavbar />
  </div>
</template>