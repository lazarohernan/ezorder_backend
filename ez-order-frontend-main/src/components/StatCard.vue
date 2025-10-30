<!-- src/components/common/StatCard.vue -->
<template>
  <div class="overflow-hidden rounded-lg bg-white px-4 py-5 sm:p-6">
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <div :class="['flex h-8 w-8 items-center justify-center rounded-md', iconBgColor]">
          <component :is="icon" :class="['h-5 w-5', iconColor]" aria-hidden="true" />
        </div>
      </div>
      <div class="ml-5 w-0 flex-1">
        <dt class="truncate text-sm font-medium text-gray-500">
          {{ title }}
        </dt>
        <dd class="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
          {{ value }}
        </dd>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Component } from 'vue';

interface Props {
  title: string;
  value: number | string;
  icon: Component;
  color: 'yellow' | 'blue' | 'green' | 'indigo' | 'red' | 'purple' | 'gray';
}

const props = defineProps<Props>();

const colorClasses = {
  yellow: {
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
  },
  blue: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  green: {
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  indigo: {
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
  red: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
  },
  purple: {
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
  gray: {
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
  },
};

const iconBgColor = computed(() => colorClasses[props.color].iconBg);
const iconColor = computed(() => colorClasses[props.color].iconColor);
</script>
