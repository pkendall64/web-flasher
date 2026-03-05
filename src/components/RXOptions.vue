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
</script>

<template>
  <VTextField v-model="store.options.rx.uartBaud" label='UART baud rate'/>
  <VCheckbox v-model="store.options.rx.lockOnFirstConnect" label='Lock on first connection'/>
  <VCheckbox v-model="store.options.rx.r9mmMiniSBUS" label='Use SBUS Pins as UART' v-if="hasFeature('sbus-uart')"/>
  <FanRuntime v-model="store.options.rx.fanMinRuntime"/>
</template>
