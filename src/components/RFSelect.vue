<script setup>
import {computed} from 'vue'
import {VSelect} from "vuetify/components";
import {t} from '../i18n'

let region = defineModel('region')
let domain = defineModel('domain')
const props = defineProps({radio: String})

const regions = [
  {value: 'FCC', title: 'FCC'},
  {value: 'LBT', title: 'LBT'}
]
const domains = computed(() => [
  {value: 0, title: t('UserDefineKey.REGULATORY_DOMAIN_AU_915')},
  {value: 1, title: t('UserDefineKey.REGULATORY_DOMAIN_FCC_915')},
  {value: 2, title: t('UserDefineKey.REGULATORY_DOMAIN_EU_868')},
  {value: 3, title: t('UserDefineKey.REGULATORY_DOMAIN_IN_866')},
  {value: 4, title: t('UserDefineKey.REGULATORY_DOMAIN_AU_433')},
  {value: 5, title: t('UserDefineKey.REGULATORY_DOMAIN_EU_433')},
  {value: 6, title: 'US433'},
  {value: 7, title: 'US433-Wide'}
])

function hasHighFrequency() {
  return props.radio && (props.radio.endsWith('2400') || props.radio.endsWith('dual'))
}

function hasLowFrequency() {
  return props.radio && (props.radio.endsWith('900') || props.radio.endsWith('dual'))
}
</script>

<template>
  <VSelect v-model="region" :label="t('WebFlasher.Region')" :items="regions" v-if="hasHighFrequency()"/>
  <VSelect v-model="domain" :label="t('WebFlasher.RegulatoryDomain')" :items="domains" v-if="hasLowFrequency()"/>
</template>
