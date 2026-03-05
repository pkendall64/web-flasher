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
import {computed, ref, watchEffect} from "vue";
import * as zip from "@zip.js/zip.js";
import FileSaver from "file-saver";
import pako from 'pako';
import { contextFromStore, store } from '../js/state';
import { generateFirmware, getDownloadFilename } from 'elrs-firmware-config';
import type { FirmwareFile, TargetConfig } from 'elrs-firmware-config';

watchEffect(buildFirmware)

let zipped = ref(false)

const downloadFilename = computed(() => {
  if (!store.target?.config) return 'firmware.bin.gz'
  if (store.target.config.platform === 'esp8285') return getDownloadFilename('.bin.gz', contextFromStore())
  if (zipped.value) return getDownloadFilename('.zip', contextFromStore())
  return getDownloadFilename('.bin', contextFromStore())
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
    const [binary, { config, firmwareUrl, options }] = await generateFirmware(contextFromStore())

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
  if (store.target.config.platform === 'esp8285') {
    const bin = pako.gzip(files.firmwareFiles[files.firmwareFiles.length - 1].data)
    const data = new Blob([bin], {type: 'application/octet-stream'})
    FileSaver.saveAs(data, getDownloadFilename('.bin.gz', contextFromStore()))
  } else if (zipped.value) {
    // create zip file
    const zipper = new zip.ZipWriter(new zip.BlobWriter("application/zip"), {bufferedWrite: true})
    await zipper.add('bootloader.bin', new Blob([files.firmwareFiles[0].data as BlobPart], { type: 'application/octet-stream' }).stream())
    await zipper.add('partitions.bin', new Blob([files.firmwareFiles[1].data as BlobPart], { type: 'application/octet-stream' }).stream())
    await zipper.add('boot_app0.bin', new Blob([files.firmwareFiles[2].data as BlobPart], { type: 'application/octet-stream' }).stream())
    await zipper.add('firmware.bin', new Blob([files.firmwareFiles[3].data as BlobPart], { type: 'application/octet-stream' }).stream())
    FileSaver.saveAs(await zipper.close(), getDownloadFilename('.zip', contextFromStore()))
  } else {
    const last = files.firmwareFiles[files.firmwareFiles.length - 1]
    const bin = last ? last.data : new Uint8Array(0)
    const data = new Blob([bin as BlobPart], { type: 'application/octet-stream' })
    FileSaver.saveAs(data, getDownloadFilename('.bin', contextFromStore()))
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
