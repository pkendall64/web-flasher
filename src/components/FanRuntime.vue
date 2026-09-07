<script setup>
import {hasFeature} from "../js/state.js";
import {t} from '../i18n'
let model = defineModel()
</script>

<template>
  <VNumberInput v-model="model" :label="t('WebFlasher.MinimumFanRuntime')" :suffix="t('WebFlasher.Seconds')"
                :step="10" :min="0" :max="3600"
                v-if="hasFeature('fan')"/>
</template>
