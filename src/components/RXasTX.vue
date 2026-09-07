<script setup>
import {computed} from "vue";
import {store} from "../js/state.js";
import {t} from '../i18n'

let enabled = defineModel('enabled')
let type = defineModel('type')
type.value = "0"

const items = computed(() => [
  {title: t('WebFlasher.RxAsInternalTx'), value: "0"},
  {title: t('WebFlasher.RxAsExternalTx'), value: "1"}
])
</script>

<template>
  <VCheckbox v-model="enabled" :label="t('WebFlasher.FlashRxAsTx', {suffix: store.target.config.platform.startsWith('esp32') ? '' : t('WebFlasher.FullDuplexInternalOnly')})"/>
  <VSelect v-model="type" :items="items" v-if="store.target.config.platform.startsWith('esp32') && enabled"/>
</template>
