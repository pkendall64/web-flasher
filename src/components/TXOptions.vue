<script setup>
import {hasFeature, store} from "../js/state.js";
import {t} from '../i18n'
import FanRuntime from "./FanRuntime.vue";
import MelodyInput from "./MelodyInput.vue";
</script>

<template>
  <VNumberInput v-model="store.options.tx.telemetryInterval" :label="t('UserDefineKey.TLM_REPORT_INTERVAL_MS')" :suffix="t('WebFlasher.Milliseconds')"
                :step="10" :min="100" :max="1000"/>
  <VCheckbox v-model="store.options.tx.uartInverted" :label="t('UserDefineKey.UART_INVERTED')"
             v-if="store.target?.config?.platform==='stm32'"/>
  <FanRuntime v-model="store.options.tx.fanMinRuntime"/>
  <VCheckbox v-model="store.options.tx.higherPower" :label="t('UserDefineKey.UNLOCK_HIGHER_POWER')"
             v-if="hasFeature('unlock-higher-power')"/>
  <MelodyInput v-model:melody-type="store.options.tx.melodyType"
               v-model:melody-tune="store.options.tx.melodyTune"
               v-if="hasFeature('buzzer')"/>
</template>
