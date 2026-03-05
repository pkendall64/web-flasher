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
import {ref} from "vue";
import {store} from "../js/state.js";

let enabled = defineModel('enabled')
let type = defineModel('type')
type.value = "0"

let items = ref([
  {title: "RX as Internal TX module (Full-duplex)", value: "0"},
  {title: "RX as External TX module (Half-duplex)", value: "1"}
])
</script>

<template>
  <VCheckbox v-model="enabled" :label="'Flash RX as TX' + (store.target.config.platform.startsWith('esp32') ? '' : ' (full-duplex internal module only)')"/>
  <VSelect v-model="type" :items="items" v-if="store.target.config.platform.startsWith('esp32') && enabled"/>
</template>
