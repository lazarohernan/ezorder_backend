<template>
  <RouterView />
  <ToastListener />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import ToastListener from '@/components/ToastListener.vue';
</script>
