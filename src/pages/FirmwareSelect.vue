<script setup>
import {store} from '../js/state';
import {t} from '../i18n'
import HoverCard from '../components/HoverCard.vue';

const emit = defineEmits(['onClick']);

// Set firmware and targetType in state store, then update page to pages selection page
function setFirmware(firmware, targetType) {
  store.firmware = firmware;
  store.targetType = targetType;
  emit('onClick');
}
</script>

<template>
  <div class="containerMain">
    <div class="containerHeader">
      <VCardTitle>{{ t('WebFlasher.MainFirmware') }}</VCardTitle>
      <VCardSubtitle>{{ t('WebFlasher.MainFirmwareDescription') }}</VCardSubtitle>
    </div>
    <VRow class="tile-row">
      <VCol md="6">
        <HoverCard min-height="100%" @click="setFirmware('firmware', 'tx')"
                    image="transmitter_6275858.png" hover-image="transmitter_6276574.png"
                    :title="t('WebFlasher.Transmitter')"
                    :text="t('WebFlasher.TransmitterDescription')"/>
      </VCol>
      <VCol md="6">
        <HoverCard min-height="100%" @click="setFirmware('firmware', 'rx')"
                    image="reciever_6276002.png" hover-image="reciever_6276814.png"
                    :title="t('WebFlasher.Receiver')"
                    :text="t('WebFlasher.ReceiverDescription')"/>
      </VCol>
    </VRow>
  </div>
  <div class="containerMain">
    <div class="containerHeader">
      <VCardTitle>{{ t('WebFlasher.BackpackFirmware') }}</VCardTitle>
      <VCardSubtitle>{{ t('WebFlasher.BackpackFirmwareDescription') }}</VCardSubtitle>
    </div>
    <VRow class="tile-row">
      <VCol md="3">
        <HoverCard min-height="100%" @click="setFirmware('backpack', 'txbp')"
                    image="backpack_723137.png" hover-image="backpack_723278.png"
                    :title="t('WebFlasher.TransmitterModule')"
                    :text="t('WebFlasher.TransmitterModuleDescription')"/>
      </VCol>
      <VCol md="3">
        <HoverCard min-height="100%" @click="setFirmware('backpack', 'vrx')"
                    image="vr-glasses_8736938.png" hover-image="vr-glasses_8737003.png"
                    :title="t('WebFlasher.VideoReceiver')"
                    :text="t('WebFlasher.VideoReceiverDescription')"/>
      </VCol>
      <VCol md="3">
        <HoverCard min-height="100%" @click="setFirmware('backpack', 'aat')"
                    image="satellite_2637312.png" hover-image="satellite_2637314.png"
                    :title="t('WebFlasher.AntennaTracker')"
                    :text="t('WebFlasher.AntennaTrackerDescription')"/>
      </VCol>
      <VCol md="3">
        <HoverCard min-height="100%" @click="setFirmware('backpack', 'timer')"
                    image="stopwatch_4354897.png" hover-image="stopwatch_4355918.png"
                    :title="t('WebFlasher.RaceTimer')"
                    :text="t('WebFlasher.RaceTimerDescription')"/>
      </VCol>
    </VRow>
  </div>
</template>

<style scoped>
.tile-row {
  margin: -12px;
}

.tile-row :deep(.v-col) {
  padding: 12px;
}

.v-card-title {
  padding: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #242527;
}

.v-card-subtitle {
  padding: 0;
  font-size: 1rem;
  color: #242527;
}
</style>