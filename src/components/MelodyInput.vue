<script setup>
import {computed} from 'vue'
import {VSelect, VTextField} from "vuetify/components";
import {t} from '../i18n'

let melodyType = defineModel('melodyType')
let melodyTune = defineModel('melodyTune')

const melodyTypes = computed(() => [
  {value: 0, title: t('WebFlasher.QuietNoBeeps')},
  {value: 1, title: t('WebFlasher.JustOneBeep')},
  {value: 2, title: t('WebFlasher.NoTuneJustBeeps')},
  {value: 3, title: t('WebFlasher.DefaultTune')},
  {value: 4, title: t('WebFlasher.CustomTune')}
])
</script>

<template>
  <VSelect v-model="melodyType" :label="t('WebFlasher.Beeper')" :items="melodyTypes"/>
  <VTextField v-model="melodyTune" :label="t('WebFlasher.Melody')" v-if="melodyType===4"/>
</template>
