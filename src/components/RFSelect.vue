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
import {VSelect} from "vuetify/components";

let region = defineModel('region')
let domain = defineModel('domain')
const props = defineProps<{ radio?: string | null }>()

const regions = [
  {value: 'FCC', title: 'FCC'},
  {value: 'LBT', title: 'LBT'}
]
const domains = [
  {value: 0, title: 'AU915'},
  {value: 1, title: 'FCC915'},
  {value: 2, title: 'EU868'},
  {value: 3, title: 'IN866'},
  {value: 4, title: 'AU433'},
  {value: 5, title: 'EU433'},
  {value: 6, title: 'US433'},
  {value: 7, title: 'US433-Wide'}
]

function hasHighFrequency() {
  return props.radio && (props.radio.endsWith('2400') || props.radio.endsWith('dual'))
}

function hasLowFrequency() {
  return props.radio && (props.radio.endsWith('900') || props.radio.endsWith('dual'))
}
</script>

<template>
  <VSelect v-model="region" label="Region" :items="regions" v-if="hasHighFrequency()"/>
  <VSelect v-model="domain" label="Regulatory Domain" :items="domains" v-if="hasLowFrequency()"/>
</template>
