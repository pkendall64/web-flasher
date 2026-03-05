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
import { store } from '../js/state';

let model = defineModel<number>()
</script>

<template>
  <VNumberInput v-model="model" :label="'WiFi &quot;auto on&quot; interval' + (model === null ? ' (Disabled)' : '')"
                suffix="seconds"
                :step="10" :min="0" :max="120"
                v-if="store.target?.config?.platform!=='stm32'"/>
</template>
