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
import { hasFeature, store } from '../js/state';
import FanRuntime from "./FanRuntime.vue";
import MelodyInput from "./MelodyInput.vue";
</script>

<template>
  <VNumberInput v-model="store.options.tx.telemetryInterval" label='TLM report interval' suffix="milliseconds"
                :step="10" :min="100" :max="1000"/>
  <VCheckbox v-model="store.options.tx.uartInverted" label="UART inverted"
             v-if="store.target?.config?.platform==='stm32'"/>
  <FanRuntime v-model="store.options.tx.fanMinRuntime"/>
  <VCheckbox v-model="store.options.tx.higherPower" label='Unlock higher power'
             v-if="hasFeature('unlock-higher-power')"/>
  <MelodyInput v-model:melody-type="store.options.tx.melodyType"
               v-model:melody-tune="store.options.tx.melodyTune"
               v-if="hasFeature('buzzer')"/>
</template>
