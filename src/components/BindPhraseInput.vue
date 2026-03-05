<!--
  ExpressLRS Web Flasher
  Copyright (C) 2025 ExpressLRS LLC and contributors

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, version 3 of the License.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see https://www.gnu.org/licenses/.
-->
<script setup>
import {ref, watch, onMounted} from "vue";
import {VTextField} from "vuetify/components";
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
let uid = ref('Bind Phrase')

function generateUID() {
  if (bindPhrase.value === '' || bindPhrase.value === null) {
    uid.value = 'Bind Phrase'
    model.value = null
    emit('update:bindPhraseText', null)
  } else {
    let val = Array.from(uidBytesFromText(bindPhrase.value))
    model.value = val
    uid.value = 'UID: ' + val
    emit('update:bindPhraseText', bindPhrase.value)
  }
}

watch(() => model.value, (newVal) => {
  if (newVal && Array.isArray(newVal) && newVal.length > 0) {
    uid.value = 'UID: ' + newVal
  } else if (!newVal) {
    uid.value = 'Bind Phrase'
  }
}, { immediate: true })

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
  } else if (model.value && Array.isArray(model.value) && model.value.length > 0) {
    uid.value = 'UID: ' + model.value
  }
})
</script>

<template>
  <VTextField v-model="bindPhrase" name="bind-phrase" :label="uid" :oninput="generateUID"/>
</template>
