<script setup>
import {hasFeature, store} from "../js/state.js";
import {t} from '../i18n'
import FanRuntime from "./FanRuntime.vue";
</script>

<template>
  <VTextField v-model="store.options.rx.uartBaud" :label="t('UserDefineKey.RCVR_UART_BAUD')"/>
  <VCheckbox v-model="store.options.rx.lockOnFirstConnect" :label="t('UserDefineKey.LOCK_ON_FIRST_CONNECTION')"/>
  <VCheckbox v-model="store.options.rx.r9mmMiniSBUS" :label="t('UserDefineKey.USE_R9MM_R9MINI_SBUS')" v-if="hasFeature('sbus-uart')"/>
  <FanRuntime v-model="store.options.rx.fanMinRuntime"/>
</template>
