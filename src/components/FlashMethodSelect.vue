<script setup>
import {VSelect} from "vuetify/components";
import {t} from '../i18n'

let model = defineModel()
const props = defineProps({methods: Array})

function getFlashMethods() {
  const flashMethods = [
    {value: 'download', title: t('WebFlasher.LocalDownload')},
    {value: 'uart', title: t('FlashingMethod.UART')},
    {value: 'betaflight', title: t('FlashingMethod.BetaflightPassthrough')},
    {value: 'etx', title: t('FlashingMethod.EdgeTxPassthrough')},
    {value: 'passthru', title: t('FlashingMethod.Passthrough')},
    {value: 'wifi', title: t('FlashingMethod.WIFI')},
    {value: 'stlink', title: t('FlashingMethod.STLink')},
  ]
  return flashMethods.filter(v => v.value === 'download' || (props.methods && props.methods.includes(v.value)))
}
</script>

<template>
  <VSelect v-model="model" :label="t('FlashingMethodOptions.FlashingMethod')" :items="getFlashMethods()"/>
</template>
