<script setup>
import {VCard, VCardText, VCardTitle, VHover} from 'vuetify/components'
import {ref} from "vue";

defineProps(['image', 'hoverImage', 'title', 'text'])

let hovered = ref(false)
function imageClass(isHovering) {
  if (isHovering) {
    hovered = true
  }
  return isHovering ? 'fadeInImage' : 'fadeOutImage'
}
</script>

<template>
  <VHover v-slot:default="{ isHovering, props }">
    <VCard v-bind="$attrs, props" class='default-card' :class="{'hover-card' : isHovering}">
      <div class="parent">
        <img :src="image" height="100px" width="100px"/>
        <img :src="hoverImage" height="100px" width="100px" :class="imageClass(isHovering)" :style="hovered ? 'display:block' : 'display:none'"/>
      </div>
      <VCardTitle>{{ title }}</VCardTitle>
      <VCardText>{{ text }}
      </VCardText>
    </VCard>
  </VHover>
</template>

<style scoped>
@keyframes fadeOut {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.fadeOutImage {
  animation: fadeOut 600ms forwards;
  position: absolute;
}

@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

.fadeInImage {
  animation: fadeIn 600ms forwards;
  position: absolute;
}

.default-card {
  border-radius: 0.5rem;
  border: 1px solid #E8E8E8;
  background-color: #F8F8F8;
  transition: all ease-in 300ms;
  box-shadow: none;
  text-align: left;
  padding: 0;
}

.hover-card {
  transform: scale(104%);
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.16);
}

.v-card-title {
  padding: 0 20px 0 20px;
}

.v-card-text {
  padding: 0 20px 20px 20px;
}

.v-card-title {
  margin: 1.5rem 0 0.25rem 0;
  font-weight: 600;
  color: #242527;
}

.v-card-text {
  color: #656669
}

.parent {
  display: flex;
  justify-content: center;
  background-color: #F0F0F0;
  height: 140px;
  align-items: center;
}

</style>