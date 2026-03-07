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
import type { TargetSelectOption } from 'elrs-firmware-config';

defineProps<{ vendorLabel?: string }>()

const baseUrl = './assets';
const firmwareConfig = computed(() =>
  store.flavor ? new FirmwareConfig(baseUrl, store.flavor) : null
);

let flashBranch = ref(false);
let versions = ref<{ title: string; value: string }[]>([]);
let vendors = ref<{ id: string; name: string }[]>([]);
let targets = ref<TargetSelectOption[]>([]);

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
    const list = await config.getVendors();
    vendors.value = list;
    store.vendor = null;
  } catch {
    vendors.value = [];
  }
});

watchPostEffect(async () => {
  const config = firmwareConfig.value;
  if (!config || !store.version) {
    targets.value = [];
    return;
  }
  const versionItem = versions.value.find(x => x.value === store.version);
  const versionLabel = versionItem?.title ?? null;
  try {
    const list = await config.getTargets({
      vendor: store.vendor,
      version: store.version,
      versionLabel,
      includeBranchVersions: flashBranch.value,
    });
    targets.value = list;
    let keepTarget = false;
    for (const item of list) {
      if (store.target?.value === item.value) {
        store.target = item;
        keepTarget = true;
        break;
      }
    }
    if (list.length === 1) {
      store.target = list[0];
      keepTarget = true;
    }
    if (!keepTarget) store.target = null;
  } catch {
    targets.value = [];
    store.target = null;
  }
});

watch(() => store.target, (v) => {
  if (v?.vendor) {
    store.vendor = v.vendor;
    const ven = vendors.value.find((x) => x.id === v.vendor);
    store.vendor_name = ven?.name ?? '';
  }
});

function flashType() {
  return flashBranch.value ? 'Branches' : 'Releases'
}

const vendorItems = computed(() =>
  vendors.value.map((v) => ({ title: v.name, value: v.id }))
);
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
    <VSelect :items="vendorItems" v-model="store.vendor" :label="vendorLabel" :disabled="!store.version"/>
    <VAutocomplete :items="targets" v-model="store.target" label="Hardware Target"
                  item-title="title" item-value="value" return-object :disabled="!store.vendor"/>
  </VContainer>
</template>
