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
<script setup lang="ts">
import { ref, watch, watchEffect, watchPostEffect } from 'vue';
import { store } from '../js/state';
import { compareSemanticVersions } from 'elrs-firmware-config';
import type { FirmwareIndex, HardwareVendor, HardwareTargetConfig } from '../js/hardware-types';

defineProps<{ vendorLabel?: string }>()

let firmware = ref<FirmwareIndex | null>(null);
let flashBranch = ref(false);
let hardware = ref<Record<string, HardwareVendor> | null>(null);
let versions = ref<{ title: string; value: string }[]>([]);
let vendors = ref<{ title: string; value: string }[]>([]);
let targets = ref<{ title: string; value: { vendor: string; target: string; config: HardwareTargetConfig } }[]>([]);

watchPostEffect(() => {
  fetch(`./assets/${store.firmware}/index.json`).then(r => r.json()).then((r: FirmwareIndex) => {
    firmware.value = r
  })
})

function updateVersions() {
  const fw = firmware.value
  if (fw) {
    hardware.value = null
    store.version = null
    versions.value = []
    const branches = fw.branches ?? {}
    const tags = fw.tags ?? {}
    if (flashBranch.value) {
      Object.entries(branches).forEach(([key, value]) => {
        versions.value.push({ title: key, value })
        if (!store.version) store.version = value
      })
      Object.entries(tags).forEach(([key, value]) => {
        if (key.indexOf('-') !== -1) versions.value.push({ title: key, value })
      })
      versions.value = versions.value.sort((a, b) => a.title.localeCompare(b.title))
    } else {
      Object.keys(tags).sort(compareSemanticVersions).reverse().forEach((key) => {
        if (key.indexOf('-') === -1 || flashBranch.value) {
          versions.value.push({ title: key, value: tags[key] })
          if (!store.version) store.version = tags[key]
        }
      })
    }
  }
}

watch(firmware, updateVersions)
watch(flashBranch, updateVersions)

watch([() => store.version, versions], () => {
  const item = versions.value.find(x => x.value === store.version)
  store.versionLabel = item ? item.title : null
}, { immediate: true })

watchPostEffect(() => {
  if (store.version) {
    store.folder = `./assets/${store.firmware}/${store.version}`
    fetch(`./assets/${store.firmware}/hardware/targets.json`).then(r => r.json()).then((r: Record<string, HardwareVendor>) => {
      hardware.value = r
      store.vendor = null
      vendors.value = []
      const hw = hardware.value
      if (hw) {
        const targetType = store.targetType ?? ''
        for (const [k, v] of Object.entries(hw)) {
          const hasTargets = Object.prototype.hasOwnProperty.call(v, targetType)
          if (hasTargets && v.name) vendors.value.push({ title: v.name, value: k })
        }
        vendors.value.sort((a, b) => a.title.localeCompare(b.title))
      }
    }).catch(() => {})
  }
})

watchEffect(() => {
  targets.value = []
  let keepTarget = false
  const vendor = store.vendor
  const hw = hardware.value
  const targetType = store.targetType
  if (vendor && hw && targetType) {
    for (const [vk, v] of Object.entries(hw)) {
      const typeTargets = v[targetType as keyof HardwareVendor]
      if (typeTargets && typeof typeTargets === 'object' && (vk === vendor)) {
        for (const [ck, c] of Object.entries(typeTargets as Record<string, HardwareTargetConfig>)) {
          const cfg = c as HardwareTargetConfig
          targets.value.push({ title: cfg.product_name ?? '', value: { vendor: vk, target: ck, config: cfg } })
          if (store.target && store.target.vendor === vk && store.target.target === ck) keepTarget = true
        }
      }
    }
    targets.value.sort((a, b) => a.title.localeCompare(b.title))
    if (targets.value.length === 1) {
      store.target = targets.value[0].value
      keepTarget = true
    }
  }
  if (!keepTarget) store.target = null
})

watch(() => store.target, (v) => {
  if (v?.vendor && hardware.value) {
    const hw = hardware.value[v.vendor]
    if (hw) {
      store.vendor = v.vendor
      store.vendor_name = (hw as HardwareVendor).name ?? ''
    }
  }
})

function flashType() {
  return flashBranch.value ? 'Branches' : 'Releases'
}
</script>

<template>
  <VRow justify="end">
    <VSwitch v-model="flashBranch" :label="flashType()" color="secondary"/>
  </VRow>

  <VContainer max-width="600px">
    <template v-if="store.targetType==='txbp'">
      <VCardTitle>Transmitter Hardware Selection</VCardTitle>
      <VCardSubtitle>Choose the transmitter module that is having it's backpack flashed</VCardSubtitle>
    </template>
    <template v-if="store.targetType==='vrx'">
      <VCardTitle>VRx Hardware Selection</VCardTitle>
      <VCardSubtitle>Choose the video receiver type and hardware to be flashed</VCardSubtitle>
    </template>
    <template v-if="store.targetType==='aat'">
      <VCardTitle>Antenna Tracker Hardware Selection</VCardTitle>
      <VCardSubtitle>Choose the antenna tracker type and hardware to be flashed</VCardSubtitle>
    </template>
    <template v-if="store.targetType==='timer'">
      <VCardTitle>Race Timer Hardware Selection</VCardTitle>
      <VCardSubtitle>Choose the race timer and hardware to be flashed</VCardSubtitle>
    </template>
    <br>
    <VSelect :items="versions" v-model="store.version" label="Firmware Version"/>
    <VSelect :items="vendors" v-model="store.vendor" :label="vendorLabel" :disabled="!store.version"/>
    <VAutocomplete :items="targets" v-model="store.target" label="Hardware Target" :disabled="!store.vendor"/>
  </VContainer>
</template>