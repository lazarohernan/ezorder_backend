<script setup lang="ts">
import { ref, computed } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { XMarkIcon, PhoneIcon } from '@heroicons/vue/24/outline';

interface Props {
  isOpen: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'confirm', phoneNumber: string): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

// State
const selectedCountry = ref('HN');
const phoneNumber = ref('');

// Countries with their codes
const countries = [
  { code: 'HN', name: 'Honduras', dialCode: '+504', flag: '🇭🇳' },
  { code: 'GT', name: 'Guatemala', dialCode: '+502', flag: '🇬🇹' },
  { code: 'SV', name: 'El Salvador', dialCode: '+503', flag: '🇸🇻' },
  { code: 'NI', name: 'Nicaragua', dialCode: '+505', flag: '🇳🇮' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷' },
  { code: 'PA', name: 'Panamá', dialCode: '+507', flag: '🇵🇦' },
  { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
];

// Computed
const selectedCountryInfo = computed(() => {
  return countries.find((c) => c.code === selectedCountry.value) || countries[0];
});

const fullPhoneNumber = computed(() => {
  if (!phoneNumber.value) return '';
  return `${selectedCountryInfo.value.dialCode}${phoneNumber.value}`;
});

const isValidPhone = computed(() => {
  // Basic validation - at least 8 digits
  return phoneNumber.value.length >= 8 && /^\d+$/.test(phoneNumber.value);
});

// Methods
const closeModal = () => {
  phoneNumber.value = '';
  selectedCountry.value = 'HN';
  emit('close');
};

const confirmPhone = () => {
  if (!isValidPhone.value) return;
  emit('confirm', fullPhoneNumber.value);
  closeModal();
};

const formatPhoneInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  // Remove non-digits
  let value = input.value.replace(/\D/g, '');

  // Limit length based on country
  if (selectedCountry.value === 'HN') {
    value = value.substring(0, 8); // Honduras: 8 digits
  } else if (selectedCountry.value === 'US') {
    value = value.substring(0, 10); // US: 10 digits
  } else {
    value = value.substring(0, 8); // Default: 8 digits
  }

  phoneNumber.value = value;
};
</script>

<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-50">
      <TransitionChild
        as="div"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
        class="fixed inset-0 bg-black bg-opacity-25"
      />

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="div"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all"
            >
              <!-- Header -->
              <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <DialogTitle as="h3" class="text-lg font-semibold leading-6 text-gray-900">
                  Enviar por WhatsApp
                </DialogTitle>
                <button
                  @click="closeModal"
                  class="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <XMarkIcon class="h-6 w-6" />
                </button>
              </div>

              <div class="p-6">
                <!-- Información -->
                <div class="mb-6">
                  <div class="flex items-center mb-4">
                    <PhoneIcon class="h-5 w-5 text-green-600 mr-2" />
                    <p class="text-sm text-gray-600">
                      Ingresa el número de WhatsApp donde se enviará la factura
                    </p>
                  </div>
                </div>

                <!-- Selección de país -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">País</label>
                  <select
                    v-model="selectedCountry"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                  >
                    <option v-for="country in countries" :key="country.code" :value="country.code">
                      {{ country.flag }} {{ country.name }} ({{ country.dialCode }})
                    </option>
                  </select>
                </div>

                <!-- Número de teléfono -->
                <div class="mb-6">
                  <label class="block text-sm font-medium text-gray-700 mb-2"
                    >Número de teléfono</label
                  >
                  <div class="flex">
                    <div
                      class="flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 rounded-l-md"
                    >
                      <span class="text-sm text-gray-600">{{ selectedCountryInfo.dialCode }}</span>
                    </div>
                    <input
                      :value="phoneNumber"
                      @input="formatPhoneInput"
                      type="tel"
                      placeholder="12345678"
                      class="flex-1 rounded-r-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                      :class="{
                        'border-red-300 focus:border-red-500 focus:ring-red-500':
                          phoneNumber && !isValidPhone,
                      }"
                    />
                  </div>

                  <!-- Número completo preview -->
                  <div v-if="phoneNumber" class="mt-2">
                    <p class="text-sm text-gray-600">
                      Número completo:
                      <span
                        class="font-medium"
                        :class="isValidPhone ? 'text-green-600' : 'text-red-600'"
                      >
                        {{ fullPhoneNumber }}
                      </span>
                    </p>
                  </div>

                  <!-- Validation message -->
                  <div v-if="phoneNumber && !isValidPhone" class="mt-2">
                    <p class="text-sm text-red-600">El número debe tener al menos 8 dígitos</p>
                  </div>
                </div>

                <!-- Información adicional -->
                <div class="bg-green-50 border border-green-200 rounded-md p-3 mb-6">
                  <div class="flex">
                    <svg
                      class="flex-shrink-0 h-5 w-5 text-green-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <div class="ml-3">
                      <p class="text-sm text-green-800">
                        <strong>Nota:</strong> Se generará un PDF de la factura y se abrirá WhatsApp
                        automáticamente para enviarlo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
                <button
                  @click="closeModal"
                  class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Cancelar
                </button>
                <button
                  @click="confirmPhone"
                  :disabled="!isValidPhone"
                  class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Confirmar y Enviar
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
