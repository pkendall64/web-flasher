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
import { FirmwareConfig } from 'elrs-firmware-config';
import type { FirmwareTarget } from 'elrs-firmware-config';

const baseUrl = './assets';
const firmwareConfig = computed(() =>
  store.firmware ? new FirmwareConfig(baseUrl, store.firmware) : null
);

let flashBranch = ref(false);
let versions = ref<{ title: string; value: string }[]>([]);
let vendors = ref<{ id: string; name: string }[]>([]);
let radios = ref<{ id: string; label: string }[]>([]);
let targets = ref<{ title: string; value: FirmwareTarget }[]>([]);
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

watchPostEffect(async () => {
  const config = firmwareConfig.value;
  if (!config) return;
  try {
    const opts = await config.getVersionOptions({ includeBranches: flashBranch.value });
    versions.value = opts;
    if (opts.length && !store.version) store.version = opts[0].value;
  } catch {
    versions.value = [];
  }
});

watch([() => store.version, versions], () => {
  const item = versions.value.find(x => x.value === store.version);
  store.versionLabel = item ? item.title : null;
}, { immediate: true });

watchPostEffect(async () => {
  const config = firmwareConfig.value;
  if (!config || !store.version) {
    vendors.value = [];
    return;
  }
  try {
    const list = await config.getVendors(store.targetType ?? '');
    vendors.value = list;
    store.vendor = null;
    store.radio = null;
  } catch {
    vendors.value = [];
  }
});

watchPostEffect(async () => {
  const config = firmwareConfig.value;
  const vendor = store.vendor;
  if (!config || !vendor) {
    radios.value = [];
    return;
  }
  try {
    const list = await config.getRadios(vendor, store.targetType ?? '');
    radios.value = list;
    if (list.length === 1) store.radio = list[0].id;
    else store.radio = null;
  } catch {
    radios.value = [];
  }
});

watchPostEffect(async () => {
  const config = firmwareConfig.value;
  if (!config || !store.version) {
    targets.value = [];
    return;
  }
  setTargetFromParams();
  const versionItem = versions.value.find(x => x.value === store.version);
  const versionLabel = versionItem?.title ?? null;
  try {
    const list = await config.getTargets({
      targetType: store.targetType ?? '',
      vendor: store.vendor,
      radio: store.radio,
      version: store.version,
      versionLabel,
      includeBranchVersions: flashBranch.value,
    });
    targets.value = list;
    let keepTarget = false;
    for (const item of list) {
      if (store.target && store.target.vendor === item.value.vendor && store.target.radio === item.value.radio && store.target.target === item.value.target) {
        store.target.config = item.value.config;
        keepTarget = true;
        break;
      }
    }
    if (!keepTarget) store.target = null;
  } catch {
    targets.value = [];
    store.target = null;
  }
});

watch([() => store.version, firmwareConfig], () => {
  const config = firmwareConfig.value;
  if (!config || !store.version) {
    luaUrl.value = null;
    return;
  }
  luaUrl.value = config.getLuaScriptUrl(store.version, store.versionLabel ?? undefined);
});

watch(() => store.target, (v) => {
  if (v) {
    store.vendor = v.vendor ?? null;
    store.radio = v.radio ?? null;
  }
});

function flashType() {
  return flashBranch.value ? 'Branches' : 'Releases';
}

const vendorItems = computed(() =>
  vendors.value.map((v) => ({ title: v.name, value: v.id }))
);
const radioItems = computed(() =>
  radios.value.map((r) => ({ title: r.label, value: r.id }))
);

const targetModel = computed({
  get: () => store.target ?? undefined,
  set: (v) => { store.target = v ?? null },
});
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
    <VSelect :items="vendorItems" v-model="store.vendor" density="compact" label="Hardware Vendor"
             :disabled="!store.version || hasUrlParams"/>
    <VSelect :items="radioItems" v-model="store.radio" density="compact" label="Radio Frequency"
             :disabled="!store.vendor || hasUrlParams"/>
    <VAutocomplete :items="targets" v-model="targetModel" density="compact" label="Hardware Target"
             :disabled="!store.version || hasUrlParams"/>
    <a :href="luaUrl ?? undefined" download>
      <VBtn :disabled="!luaUrl">Download ELRS Lua Script</VBtn>
    </a>
  </VContainer>
</template>
