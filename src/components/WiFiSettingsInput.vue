<script setup>
import {ref} from "vue";
import {t} from '../i18n'

let ssid = defineModel('ssid')
let password = defineModel('password')

let showPassword = ref(false)
</script>

<template>
  <VTextField v-model="ssid" name="wifi-ssid" :label="t('UserDefineKey.HOME_WIFI_SSID')"/>
  <VTextField v-model="password" name="wifi-password" :label="t('UserDefineKey.HOME_WIFI_PASSWORD')"
              :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
              :type="showPassword ? 'text' : 'password'"
              @click:append-inner="showPassword = !showPassword"/>
</template>
