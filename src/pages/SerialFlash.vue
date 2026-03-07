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
import { flashFirmware, normalizeError } from 'elrs-flasher'
import type { FlashMethod } from 'elrs-flasher'

const firmwareConfig = computed(() => new FirmwareConfig('./assets', store.flavor ?? FirmwareFlavor.Tx))

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
  fullErase.value = false
  const platform = store.target?.config?.platform
  allowErase.value = !(platform?.startsWith('esp32') && store.options.flashMethod === 'betaflight')
}

let step = ref(1)
let enableFlash = ref(false)
let allowErase = ref(true)
let fullErase = ref(false)
let flashComplete = ref(false)
let failed = ref(false)
let log = ref<string[]>([])
let newline = false
let selectingSerial = ref(false)

let noDevice = ref(false)
let device: SerialPort | null = null

let progress = ref(0)
let progressText = ref('')

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

async function closeDevice() {
  if (device != null) {
    try {
      await device.close()
    } catch (_error: unknown) {
      // ignore on cleanup
    }
  }
  device = null
  enableFlash.value = false
  flashComplete.value = false
  failed.value = false
  step.value = 1
  log.value = []
  progress.value = 0
}

async function connect() {
  selectingSerial.value = true
  try {
    device = await navigator.serial.requestPort()
    device.ondisconnect = async () => {
      await closeDevice()
    }
  } catch {
    await closeDevice()
    noDevice.value = true
  } finally {
    selectingSerial.value = false
  }
  if (device) {
    step.value++
    enableFlash.value = true
  }
}

async function another() {
  await closeDevice()
  await connect()
}

async function reset() {
  await closeDevice()
  resetState()
}

async function flash() {
  const port = device
  const meta = files.metadata
  if (!port || !meta) return
  failed.value = false
  step.value++
  try {
    progressText.value = ''
    await flashFirmware({
      transport: { type: 'serial', port },
      firmware: [files.firmwareFiles, meta],
      method: (store.options.flashMethod ?? 'uart') as FlashMethod,
      term,
      progress: (fileIndex, written, total) => {
        progressText.value = (fileIndex + 1) + ' of ' + (files.firmwareFiles.length)
        progress.value = Math.round((written / total) * 100)
      },
      erase: fullErase.value,
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
        <VBtn @click="connect" color="primary" :disabled="selectingSerial">Connect</VBtn>
      </VStepperVerticalItem>
      <VStepperVerticalItem title="Enter flashing mode" value="2" :hide-actions="true" :complete="step > 2"
                            :color="step > 2 ? 'green' : (failed ? 'red' : 'blue')">
        <template v-for="line in log">
          <VLabel>{{ line }}</VLabel>
          <br/>
        </template>
        <VContainer v-if="failed || enableFlash">
          <br/>
          <VRow v-if="enableFlash && allowErase">
            <VCheckbox v-model="fullErase" label="Full chip erase"/>
          </VRow>
          <VRow>
            <VCol v-if="enableFlash && !failed">
              <VBtn @click="flash" color="primary">Flash</VBtn>
            </VCol>
            <VCol v-if="enableFlash && failed">
              <VBtn @click="flash" color="amber">Flash Anyway</VBtn>
            </VCol>
            <VCol v-if="failed">
              <VBtn @click="closeDevice" color="red">Try Again</VBtn>
            </VCol>
          </VRow>
        </VContainer>
      </VStepperVerticalItem>
      <VStepperVerticalItem title="Flashing" value="3" :hide-actions="true" :complete="flashComplete"
                            :color="flashComplete ? 'green' : (failed ? 'red' : 'blue')">
        <template v-for="line in log">
          <VLabel>{{ line }}</VLabel>
          <br/>
        </template>
        <VRow>
          <VCol class="d-flex align-center flex-column flex-grow-0 flex-shrink-0">
            <VLabel v-if="progressText===''">Erasing flash, please wait...</VLabel>
            <VLabel v-else>Flashing file {{ progressText }}</VLabel>
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
              <VBtn v-if="flashComplete" @click="another" color="primary">Flash Another</VBtn>
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
