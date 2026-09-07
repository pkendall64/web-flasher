<script setup>
import {computed, ref, watchEffect} from "vue";
import * as zip from "@zip.js/zip.js";
import FileSaver from "file-saver";
import { gzip } from 'pako';
import {store} from "../js/state.js";
import {t} from '../i18n'
import {generateFirmware} from "../js/firmware.js";
import {getDownloadFilename} from "../js/downloadFilename.js";

watchEffect(buildFirmware)

let zipped = ref(false)

const downloadFilename = computed(() => {
  if (!store.target?.config) return 'firmware.bin.gz'
  if (store.target.config.platform === 'esp8285') return getDownloadFilename('.bin.gz')
  if (zipped.value) return getDownloadFilename('.zip')
  return getDownloadFilename('.bin')
})

const files = {
  firmwareFiles: [],
  config: null,
  firmwareUrl: '',
  options: {}
}

async function buildFirmware() {
  if (store.currentStep === 3) {
    const [binary, {config, firmwareUrl, options}] = await generateFirmware()

    files.firmwareFiles = binary
    files.firmwareUrl = firmwareUrl
    files.config = config
    files.options = options

    if (store.target.config.upload_methods.includes('zip') ||
        (store.targetType === 'vrx' && (store.vendor === 'hdzero-goggle' || store.vendor === 'hdzero-boxpro'))) { // or HDZero Goggles
      zipped.value = true
    }
  }
}

async function downloadFirmware() {
  if (store.target.config.platform === 'esp8285') {
    const bin = gzip(files.firmwareFiles[files.firmwareFiles.length - 1].data)
    const data = new Blob([bin], {type: 'application/octet-stream'})
    FileSaver.saveAs(data, getDownloadFilename('.bin.gz'))
  } else if (zipped.value) {
    // create zip file
    const zipper = new zip.ZipWriter(new zip.BlobWriter("application/zip"), {bufferedWrite: true})
    await zipper.add('bootloader.bin', new Blob([files.firmwareFiles[0].data.buffer], {type: 'application/octet-stream'}).stream())
    await zipper.add('partitions.bin', new Blob([files.firmwareFiles[1].data.buffer], {type: 'application/octet-stream'}).stream())
    await zipper.add('boot_app0.bin', new Blob([files.firmwareFiles[2].data.buffer], {type: 'application/octet-stream'}).stream())
    await zipper.add('firmware.bin', new Blob([files.firmwareFiles[3].data.buffer], {type: 'application/octet-stream'}).stream())
    FileSaver.saveAs(await zipper.close(), getDownloadFilename('.zip'))
  } else {
    const bin = files.firmwareFiles[files.firmwareFiles.length - 1].data.buffer
    const data = new Blob([bin], {type: 'application/octet-stream'})
    FileSaver.saveAs(data, getDownloadFilename('.bin'))
  }
}
</script>

<template>
  <VContainer max-width="600px">
    <VCardTitle>{{ t('WebFlasher.DownloadFirmwareFiles') }}</VCardTitle>
    <VCardText>{{ t('WebFlasher.FirmwareConfigured', {device: store.target?.config?.product_name}) }}</VCardText>
    <VCardText>{{ t('WebFlasher.DownloadInstruction', {filename: downloadFilename}) }}</VCardText>
    <VCardText v-if="store.target.config.platform === 'esp8285'">
      {{ t('WebFlasher.Esp8285DownloadWarning', {filename: downloadFilename}) }}
    </VCardText>
    <VCardText v-else-if="zipped">
      {{ t('WebFlasher.ZipDownloadWarning', {filename: downloadFilename}) }}
    </VCardText>
    <br>
    <VBtn color="primary" @click="downloadFirmware()">{{ t('WebFlasher.Download') }}</VBtn>
  </VContainer>
</template>
