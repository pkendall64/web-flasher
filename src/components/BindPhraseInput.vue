<script setup>
import {ref, watch, onMounted} from "vue";
import {VTextField} from "vuetify/components";
import {t} from '../i18n'
import {uidBytesFromText} from "../js/phrase.js";

const props = defineProps({
  bindPhraseText: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:bindPhraseText'])

let model = defineModel()

let bindPhrase = ref(null)

function generateUID() {
  if (bindPhrase.value === '' || bindPhrase.value === null) {
    model.value = null
    emit('update:bindPhraseText', null)
  } else {
    let val = Array.from(uidBytesFromText(bindPhrase.value))
    model.value = val
    emit('update:bindPhraseText', bindPhrase.value)
  }
}


watch(() => props.bindPhraseText, (newVal) => {
  if (newVal) {
    if (!bindPhrase.value) {
      bindPhrase.value = newVal
      generateUID()
    }
  } else {
    // Parent cleared bind phrase (e.g. "Clear Stored Settings")
    bindPhrase.value = null
    generateUID()
  }
}, { immediate: true })

onMounted(() => {
  if (props.bindPhraseText) {
    bindPhrase.value = props.bindPhraseText
    generateUID()
  }
})
</script>

<template>
  <VTextField v-model="bindPhrase" name="bind-phrase" :label="model && Array.isArray(model) && model.length ? t('WebFlasher.Uid', {uid: model}) : t('WebFlasher.BindPhrase')" :oninput="generateUID"/>
</template>
