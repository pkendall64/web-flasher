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
<script setup>
import {VSelect} from "vuetify/components";

let model = defineModel()
const props = defineProps({methods: Array})

const flashMethods = [
  {value: 'download', title: 'Local Download'},
  {value: 'uart', title: 'Serial UART'},
  {value: 'betaflight', title: 'Betaflight Passthrough'},
  {value: 'etx', title: 'EdgeTX Passthrough'},
  {value: 'passthru', title: 'Passthrough'},
  {value: 'wifi', title: 'WiFi'},
  {value: 'stlink', title: 'STLink'},
]

function getFlashMethods() {
  return flashMethods.filter(v => v.value === 'download' || (props.methods && props.methods.includes(v.value)))
}
</script>

<template>
  <VSelect v-model="model" label="Flashing Method" :items="getFlashMethods()"/>
</template>
