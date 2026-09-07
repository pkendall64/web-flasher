<script setup>
import {store} from "../js/state.js";
import {t} from '../i18n'

let model = defineModel()
</script>

<template>
  <VNumberInput v-model="model" :label="`${t('WebFlasher.AutoWifiOnInterval')}${model === null ? ` (${t('WebFlasher.Disabled')})` : ''}`"
                :suffix="t('WebFlasher.Seconds')"
                :step="10" :min="0" :max="120"
                v-if="store.target?.config?.platform!=='stm32'"/>
</template>
