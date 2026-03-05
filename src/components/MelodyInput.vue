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
import {VSelect, VTextField} from "vuetify/components";

let melodyType = defineModel('melodyType')
let melodyTune = defineModel('melodyTune')

const melodyTypes = [
  {value: 0, title: 'Quiet, no beeps'},
  {value: 1, title: 'Just one beep'},
  {value: 2, title: 'No tune, just beeps'},
  {value: 3, title: 'Default tune'},
  {value: 4, title: 'Custom tune'}
]
</script>

<template>
  <VSelect v-model="melodyType" label="Beeper" :items="melodyTypes"/>
  <VTextField v-model="melodyTune" label="Melody" v-if="melodyType===4"/>
</template>
