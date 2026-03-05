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
import { ref, computed, watch, watchPostEffect } from 'vue';
import { store } from '../js/state';
import { compareSemanticVersions } from 'elrs-firmware-config';
import type { FirmwareIndex, HardwareVendor, HardwareTargetConfig } from '../js/hardware-types';

let firmware = ref<FirmwareIndex | null>(null);
let flashBranch = ref(false);
let hardware = ref<Record<string, Record<string, Record<string, HardwareTargetConfig>>> | null>(null);
let versions = ref<{ title: string; value: string }[]>([]);
let vendors = ref<{ title: string; value: string }[]>([]);
let radios = ref<{ title: string; value: string }[]>([]);
let targets = ref<{ title: string; value: { vendor?: string; radio?: string; target?: string; config: HardwareTargetConfig } }[]>([]);
let luaUrl = ref<string | null>(null);
let hasUrlParams = ref(false);

function setTargetFromParams() {
  let urlParams = new URLSearchParams(window.location.search);
  let target = urlParams.get('target');
  if (target) {
    hasUrlParams.value = true;
    store.target = {
      vendor: target.split('.')[0],
      radio: target.split('.')[1],
      target: target.split('.')[2],
      config: {}
    }
  }
}

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
      let first = true
      Object.keys(tags).sort(compareSemanticVersions).reverse().forEach((key) => {
        if (key.indexOf('-') === -1 || first) {
          versions.value.push({ title: key, value: tags[key] })
          if (!store.version && key.indexOf('-') === -1) store.version = tags[key]
          first = false
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
    store.folder = `./assets/${store.firmware}`

    fetch(`./assets/${store.firmware}/hardware/targets.json`).then(r => r.json()).then((r: Record<string, Record<string, Record<string, HardwareTargetConfig>>>) => {
      hardware.value = r
      store.vendor = null
      vendors.value = []
      for (const [k, v] of Object.entries(r)) {
        let hasTargets = false
        Object.keys(v).forEach(type => { hasTargets = hasTargets || type.startsWith(store.targetType ?? '') })
        if (hasTargets && (v as HardwareVendor).name) vendors.value.push({ title: (v as HardwareVendor).name as string, value: k })
      }
      vendors.value.sort((a, b) => a.title.localeCompare(b.title))
    }).catch(() => {})
  }
})

const radioTitles: Record<string, string> = {
  tx_2400: '2.4GHz Transmitter',
  tx_900: '900MHz Transmitter',
  tx_dual: 'Dual 2.4GHz/900MHz Transmitter',
  rx_2400: '2.4GHz Receiver',
  rx_900: '900MHz Receiver',
  rx_dual: 'Dual 2.4GHz/900MHz Receiver',
}

watchPostEffect(() => {
  radios.value = []
  let keepTarget = false
  const vendor = store.vendor
  const hw = hardware.value
  if (vendor && hw && hw[vendor]) {
    Object.keys(hw[vendor]).forEach(k => {
      if (k.startsWith(store.targetType ?? '')) radios.value.push({ title: radioTitles[k] ?? k, value: k })
      if (store.target && store.target.vendor === store.vendor && store.target.radio === k) keepTarget = true
    })
    if (radios.value.length === 1) {
      store.radio = radios.value[0].value
      keepTarget = true
    }
  }
  if (!keepTarget) store.radio = null
})

watchPostEffect(() => {
  targets.value = []
  let keepTarget = false
  const hw = hardware.value
  if (store.version && hw) {
    setTargetFromParams()
    const versionItem = versions.value.find(x => x.value === store.version)
    const version = versionItem?.title ?? ''
    for (const [vk, v] of Object.entries(hw)) {
      if (vk === store.vendor || store.vendor === null) {
        for (const [rk, r] of Object.entries(v)) {
          if (rk.startsWith(store.targetType ?? '') && (rk === store.radio || store.radio === null)) {
            for (const [ck, c] of Object.entries(r)) {
              const cfg = c as HardwareTargetConfig
              if (flashBranch.value || compareSemanticVersions(version, cfg.min_version ?? '0') >= 0) {
                targets.value.push({ title: cfg.product_name ?? '', value: { vendor: vk, radio: rk, target: ck, config: cfg } })
                if (store.target && store.target.vendor === vk && store.target.radio === rk && store.target.target === ck) {
                  store.target.config = cfg
                  keepTarget = true
                }
              }
            }
          }
        }
      }
    }
  }
  targets.value.sort((a, b) => a.title.localeCompare(b.title))
  if (!keepTarget) store.target = null
})

watch([() => store.version, () => store.firmware], () => {
  let file = 'elrs.lua'
  versions.value.forEach(item => {
    if (item.value === store.version && item.title < '4.0.0') {
      file = 'elrsV3.lua'
    }
  })
  luaUrl.value = store.version ? `./assets/${store.firmware}/${store.version}/lua/${file}` : null
})

watch(() => store.target, (v) => {
  if (v) {
    store.vendor = v.vendor ?? null
    store.radio = v.radio ?? null
  }
})

function flashType() {
  return flashBranch.value ? 'Branches' : 'Releases'
}

const targetModel = computed({
  get: () => store.target ?? undefined,
  set: (v) => { store.target = v ?? null },
})
</script>

<template>
  <VRow justify="end">
    <VSwitch v-model="flashBranch" :label="flashType()" color="secondary"/>
  </VRow>

  <VContainer max-width="600px">
    <VCardTitle>Hardware Selection</VCardTitle>
    <VCardText>Choose the vendor specific hardware that you are flashing, if the hardware is not in the list then the
      hardware is unsupported.
    </VCardText>
    <br>
    <VSelect :items="versions" v-model="store.version" density="compact" label="Firmware Version"/>
    <VSelect :items="vendors" v-model="store.vendor" density="compact" label="Hardware Vendor"
             :disabled="!store.version || hasUrlParams"/>
    <VSelect :items="radios" v-model="store.radio" density="compact" label="Radio Frequency"
             :disabled="!store.vendor || hasUrlParams"/>
    <VAutocomplete :items="targets" v-model="targetModel" density="compact" label="Hardware Target"
             :disabled="!store.version || hasUrlParams"/>
    <a :href="luaUrl ?? undefined" download>
      <VBtn :disabled="!luaUrl">Download ELRS Lua Script</VBtn>
    </a>
  </VContainer>
</template>