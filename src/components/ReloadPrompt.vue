<!--
  ExpressLRS Web Flasher
  Copyright (C) 2025 ExpressLRS LLC and contributors

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, version 3 of the License.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see https://www.gnu.org/licenses/.
-->
<script setup>
import { useRegisterSW } from 'virtual:pwa-register/vue'

const {
  offlineReady,
  needRefresh,
  updateServiceWorker,
} = useRegisterSW()

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