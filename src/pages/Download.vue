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
import { computed, ref, watchEffect } from 'vue';
import * as zip from "@zip.js/zip.js";
import FileSaver from "file-saver";
import pako from 'pako';
import { contextFromStorePartial, store } from '../js/state';
import { FirmwareConfig } from 'elrs-firmware-config';
import type { FirmwareFile, TargetConfig } from 'elrs-firmware-config';

const firmwareConfig = computed(() => new FirmwareConfig('./assets', store.firmware ?? 'firmware'));

watchEffect(buildFirmware)

let zipped = ref(false)

const downloadFilename = computed(() => {
  if (!store.target?.config) return 'firmware.bin.gz'
  const ctx = contextFromStorePartial()
  if (store.target.config.platform === 'esp8285') return firmwareConfig.value.getDownloadFilename('.bin.gz', ctx)
  if (zipped.value) return firmwareConfig.value.getDownloadFilename('.zip', ctx)
  return firmwareConfig.value.getDownloadFilename('.bin', ctx)
})

const files: {
  firmwareFiles: FirmwareFile[]
  config: TargetConfig | null
  firmwareUrl: string
  options: Record<string, unknown>
} = {
  firmwareFiles: [],
  config: null,
  firmwareUrl: '',
  options: {}
}

async function buildFirmware() {
  if (store.currentStep === 3) {
    const [binary, { config, firmwareUrl, options }] = await firmwareConfig.value.generateFirmware(contextFromStorePartial())

    files.firmwareFiles = binary
    files.firmwareUrl = firmwareUrl ?? ''
    files.config = config ?? null
    files.options = options ?? {}

    const uploadMethods = store.target?.config?.upload_methods
    if ((uploadMethods?.includes('zip')) ||
        (store.targetType === 'vrx' && (store.vendor === 'hdzero-goggle' || store.vendor === 'hdzero-boxpro'))) {
      zipped.value = true
    }
  }
}

async function downloadFirmware() {
  if (!store.target?.config) return
  const ctx = contextFromStorePartial()
  if (store.target.config.platform === 'esp8285') {
    const bin = pako.gzip(files.firmwareFiles[files.firmwareFiles.length - 1].data)
    const data = new Blob([bin], {type: 'application/octet-stream'})
    FileSaver.saveAs(data, firmwareConfig.value.getDownloadFilename('.bin.gz', ctx))
  } else if (zipped.value) {
    // create zip file
    const zipper = new zip.ZipWriter(new zip.BlobWriter("application/zip"), {bufferedWrite: true})
    await zipper.add('bootloader.bin', new Blob([files.firmwareFiles[0].data as BlobPart], { type: 'application/octet-stream' }).stream())
    await zipper.add('partitions.bin', new Blob([files.firmwareFiles[1].data as BlobPart], { type: 'application/octet-stream' }).stream())
    await zipper.add('boot_app0.bin', new Blob([files.firmwareFiles[2].data as BlobPart], { type: 'application/octet-stream' }).stream())
    await zipper.add('firmware.bin', new Blob([files.firmwareFiles[3].data as BlobPart], { type: 'application/octet-stream' }).stream())
    FileSaver.saveAs(await zipper.close(), firmwareConfig.value.getDownloadFilename('.zip', ctx))
  } else {
    const last = files.firmwareFiles[files.firmwareFiles.length - 1]
    const bin = last ? last.data : new Uint8Array(0)
    const data = new Blob([bin as BlobPart], { type: 'application/octet-stream' })
    FileSaver.saveAs(data, firmwareConfig.value.getDownloadFilename('.bin', ctx))
  }
}
</script>

<template>
  <VContainer max-width="600px">
    <VCardTitle>Download Firmware File(s)</VCardTitle>
    <VCardText>The firmware file(s) have been configured for your <b>{{ store.target?.config?.product_name }}</b> with
      the specified options.
      <br/>
      To flash the firmware file to your device, put it into WiFi mode and connect to it via the browser
      then upload the <b>{{ downloadFilename }}</b> file on the
      <b>Update</b> tab.
    </VCardText>
    <VCardText v-if="store.target?.config?.platform === 'esp8285'">
      The firmware file <b>{{ downloadFilename }}</b> should be flashed as-is, do NOT decompress or unzip the file or you <i>will</i>
      receive an error.
    </VCardText>
    <VCardText v-else-if="zipped">
      The firmware files are contained in the <b>{{ downloadFilename }}</b> file and should be extracted before being uploaded to
      the device for flashing.
    </VCardText>
    <br>
    <VBtn color="primary" @click="downloadFirmware()">Download</VBtn>
  </VContainer>
</template>
