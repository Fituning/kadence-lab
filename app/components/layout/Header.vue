

<template>
  <div class="h-fit p-2 px-4 inset-0 fixed z-50 top-0 flex bg-surface-200 text-boulder-900 transition-all duration-700 shadow-sm justify-between items-center" :class="{'opacity-25 -translate-y-18': !isNavbarVisible}">
    <div class="font-headline text-surface-900 font-semibold text-2xl tracking-wide">
      Kadence <span class="text-primary" >Lab</span>
    </div>
    <div class="flex gap-2 items-center">

      <UIcon name="tabler:moon-stars" class="size-5"></UIcon>
      <div @click="logout" class="rounded-full h-fit bg-secondary-400 text-secondary-950 aspect-square text-center inline-flex items-center justify-center p-2 active:scale-95 active:bg-secondary-500 transition-all duration-200 ease-in-out">
        <UIcon name="tabler:user-x" class="size-5"></UIcon>
      </div>
    </div>

  </div>

</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const { loggedIn, user, clear } = useUserSession()

const isMobileMenuOpen = ref(false)

// Les nouvelles variables pour gérer le scroll
const isNavbarVisible = ref(true)
const previousScroll = ref(0)
const anchorScroll = ref(0)

async function logout() {
  await sleep(300)
  await clear()
  await navigateTo('/login')
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const handleScroll = () => {
  const currentScrollPosition = window.scrollY

  if (currentScrollPosition < 20) {
    isNavbarVisible.value = true
    anchorScroll.value = currentScrollPosition
    previousScroll.value = currentScrollPosition
    return
  }

  const scrollDirection = currentScrollPosition - previousScroll.value

  previousScroll.value = currentScrollPosition

  if (scrollDirection > 0) {
    isNavbarVisible.value = false
  }else{
    if ((currentScrollPosition-anchorScroll.value ) <= -60){
      isNavbarVisible.value = true
    }else{
      return;
    }
  }

  if (!isNavbarVisible.value) { isMobileMenuOpen.value = false }

  // On sauvegarde la position actuelle pour la prochaine fois qu'on scroll
  anchorScroll.value = currentScrollPosition
}

watch(isMobileMenuOpen, (isOpen) => {
  if (isOpen) {
    document.body.classList.add('overflow-hidden')
  } else {
    document.body.classList.remove('overflow-hidden')
  }
})

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>