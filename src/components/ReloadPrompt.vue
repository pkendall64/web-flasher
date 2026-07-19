<script setup>
import { onBeforeUnmount } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const UPDATE_INTERVAL_MS = 60_000
let updateInterval = null

const {
  offlineReady,
  needRefresh,
  updateServiceWorker,
} = useRegisterSW({
  onRegisteredSW(_swUrl, registration) {
    updateInterval = window.setInterval(() => {
      if (navigator.onLine) registration?.update()
    }, UPDATE_INTERVAL_MS)
  },
})

onBeforeUnmount(() => {
  if (updateInterval !== null) {
    window.clearInterval(updateInterval)
  }
})

function close() {
  offlineReady.value = false
  needRefresh.value = false
}
</script>

<template>
  <VBanner v-if="offlineReady || needRefresh" class="pwa-toast" elevation="1" color="info">
    <VBannerText v-if="offlineReady">
      App ready to work offline
    </VBannerText>
    <VBannerText v-else>
      New content available, reload the page?
    </VBannerText>
    <template #actions>
      <VBtn v-if="needRefresh" @click="updateServiceWorker()">Reload</VBtn>
      <VBtn @click="close()">Dismiss</VBtn>
    </template>
  </VBanner>
</template>

<style>
.pwa-toast {
  position: fixed;
  right: 0;
  bottom: 0;
  margin: 16px;
  width: unset;
  z-index: 99999;
  border-radius: 0.5rem;
}
</style>