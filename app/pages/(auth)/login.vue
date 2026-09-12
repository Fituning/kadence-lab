<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const loading = ref(false)

function onGoogleClick() {
  loading.value = true
}
</script>

<template>
  <a
    href="/auth/google"
    aria-label="Continuer avec Google"
    :aria-disabled="loading"
    @click="onGoogleClick"
    class="font-body font-semibold text-base h-fit w-fit px-16 py-4 bg-white shadow-xl border border-slate-100 rounded-2xl text-center inline-flex items-center gap-4 active:scale-95 active:bg-slate-50 transition-all duration-200 ease-in-out"
    :class="{ 'pointer-events-none': loading }"
  >
    <span
      v-if="loading"
      class="size-5 rounded-full border-3 border-slate-300 border-t-red-600 border-r-blue-500 border-b-green-600 border-l-yellow-400 animate-spin"
    ></span>
    <UIcon v-else name="logos:google-icon" class="size-5"></UIcon>
    {{ loading ? 'Connexion en cours...' : 'Continuer avec Google' }}
  </a>
</template>
