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
import { computed, ref, watchPostEffect } from 'vue'
import { buildContextFromStore, resetState, store } from '../js/state'
import { FirmwareConfig, FirmwareFlavor } from 'elrs-firmware-config'
import type { FirmwareFile, GenerateFirmwareMetadata, TargetConfig } from 'elrs-firmware-config'
import { flashFirmware, getSTLinkUsbFilters, normalizeError } from 'elrs-flasher'

const firmwareConfig = computed(() => new FirmwareConfig('./assets', store.flavor ?? FirmwareFlavor.Tx))

const term = {
  write: (e: string) => {
    if (newline) {
      log.value.push(e)
    } else {
      log.value[log.value.length - 1] = log.value[log.value.length - 1] + e
    }
    newline = false
  },
  writeln: (e: string) => {
    log.value.push(e)
    newline = true
  },
}

watchPostEffect(async (onCleanup) => {
  onCleanup(closeDevice)
  if (store.currentStep === 3) {
    await buildFirmware()
    await connect()
  }
})

const files: {
  firmwareFiles: FirmwareFile[]
  metadata: GenerateFirmwareMetadata | null
  config: TargetConfig | null
} = {
  firmwareFiles: [],
  metadata: null,
  config: null,
}

async function buildFirmware() {
  const [binary, metadata] = await firmwareConfig.value.generateFirmware(buildContextFromStore())
  files.firmwareFiles = binary
  files.metadata = metadata
  files.config = metadata.config ?? null
}

let step = ref(1)
let enableFlash = ref(false)
let flashComplete = ref(false)
let failed = ref(false)
let log = ref<string[]>([])
let newline = false

let noDevice = ref(false)
let device: USBDevice | null = null

let progress = ref(0)
let progressText = ref('')

async function closeDevice() {
  device = null
  enableFlash.value = false
  flashComplete.value = false
  failed.value = false
  step.value = 1
  log.value = []
  progress.value = 0
}

async function connect() {
  const target = store.target
  const config = target?.config
  if (!config || !('stlink' in config)) {
    term.writeln('No STLink target selected')
    return
  }
  try {
    if (device) await closeDevice()
    const filters = await getSTLinkUsbFilters()
    const usbDevice = await navigator.usb.requestDevice({ filters })
    navigator.usb.ondisconnect = (e) => {
      if (e.device === usbDevice) closeDevice()
    }
    device = usbDevice
    step.value++
    enableFlash.value = true
  } catch (e: unknown) {
    console.error(normalizeError(e))
    term.writeln('Failed to connect to device, restart device and try again')
    failed.value = true
    noDevice.value = true
  }
}

function reset() {
  closeDevice()
  resetState()
}

async function flash() {
  const usbDevice = device
  const meta = files.metadata
  if (!usbDevice || !meta) return
  step.value++
  try {
    await flashFirmware({
      transport: { type: 'usb', device: usbDevice },
      firmware: [files.firmwareFiles, meta],
      method: 'stlink',
      term,
      progress: (fileIndex, written, total, msg) => {
        progressText.value = (fileIndex + 1) + ' of ' + (files.firmwareFiles.length) + (msg ? ' (' + msg + ')' : '')
        progress.value = Math.round((written / total) * 100)
      },
    })
    device = null
    flashComplete.value = true
    step.value++
  } catch (e: unknown) {
    console.error(normalizeError(e))
    failed.value = true
  }
}
</script>

<template>
  <VContainer max-width="600px">
    <VCardTitle>Flash Firmware File(s)</VCardTitle>
    <VCardText>The firmware file(s) have been configured for your <b>{{ store.target?.config?.product_name }}</b> with
      the specified options.
    </VCardText>

    <VStepperVertical v-model="step" :hide-actions="true" flat>
      <VStepperVerticalItem title="Connect to serial UART" value="1" :hide-actions="true" :complete="step > 1"
                            :color="step > 1 ? 'green' : 'blue'">
        <VBtn @click="connect" color="primary">Connect</VBtn>
      </VStepperVerticalItem>
      <VStepperVerticalItem title="Enter flashing mode" value="2" :hide-actions="true" :complete="step > 2"
                            :color="step > 2 ? 'green' : (failed ? 'red' : 'blue')">
        <template v-for="line in log">
          <VLabel>{{ line }}</VLabel>
          <br/>
        </template>
        <VBtn v-if="enableFlash && !failed" @click="flash" color="primary">Flash</VBtn>
        <VBtn v-if="enableFlash && failed" @click="flash" color="amber">Flash Anyway</VBtn>
        <VBtn v-if="failed" @click="closeDevice" color="red">Try Again</VBtn>
      </VStepperVerticalItem>
      <VStepperVerticalItem title="Flashing" value="3" :hide-actions="true" :complete="flashComplete"
                            :color="flashComplete ? 'green' : (failed ? 'red' : 'blue')">
        <template v-for="line in log">
          <VLabel>{{ line }}</VLabel>
          <br/>
        </template>
        <VRow>
          <VCol class="d-flex align-center flex-column flex-grow-0 flex-shrink-0">
            <VLabel>Flashing file {{ progressText }}</VLabel>
            <br>
            <VProgressCircular :model-value="progress" :rotate="360" :size="100" :width="15"
                               :color="flashComplete ? 'green' : (failed ? 'red' : 'blue')">
              <template v-slot:default> {{ progress }} %</template>
            </VProgressCircular>
            <div v-if="failed">
              <VLabel>Flash failed</VLabel>
            </div>
            <VBtn v-if="failed" @click="closeDevice" color="red">Try Again</VBtn>
          </VCol>
          <VCol cols="1" class="flex-grow-1 flex-shrink-0"/>
        </VRow>
      </VStepperVerticalItem>
      <VStepperVerticalItem title="Done" value="4" :hide-actions="true" :complete="flashComplete"
                            :color="flashComplete ? 'green' : (failed ? 'red' : 'blue')">
        <VContainer>
          <VRow>
            <VCol>
              <VBtn v-if="flashComplete" @click="closeDevice" color="primary">Flash Another</VBtn>
            </VCol>
            <VCol>
              <VBtn v-if="flashComplete" @click="reset" color="secondary">Back to Start</VBtn>
            </VCol>
          </VRow>
        </VContainer>
      </VStepperVerticalItem>
    </VStepperVertical>

    <VSnackbar v-model="noDevice" vertical>
      <div class="text-subtitle-1 pb-2">No Device Selected</div>

      <p>A serial device must be selected to perform flashing.</p>
    </VSnackbar>
  </VContainer>
</template>
