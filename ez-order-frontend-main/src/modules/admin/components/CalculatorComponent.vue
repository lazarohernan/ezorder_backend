<script setup lang="ts">
import { ref, computed } from 'vue';
import { formatCurrencyHNL } from '@/utils/currency';

interface Props {
  totalPedido: number;
}

const props = defineProps<Props>();

// State
const display = ref('0');
const previousValue = ref(0);
const operation = ref('');
const waitingForOperand = ref(false);

// Computed
const montoRecibido = computed(() => {
  const value = parseFloat(display.value);
  return isNaN(value) ? 0 : value;
});

const cambio = computed(() => {
  const cambioCalculado = montoRecibido.value - props.totalPedido;
  return cambioCalculado >= 0 ? cambioCalculado : 0;
});

const esPagoSuficiente = computed(() => {
  return montoRecibido.value >= props.totalPedido;
});

// Methods
const inputNumber = (num: string) => {
  if (waitingForOperand.value) {
    display.value = num;
    waitingForOperand.value = false;
  } else {
    display.value = display.value === '0' ? num : display.value + num;
  }
};

const inputDecimal = () => {
  if (waitingForOperand.value) {
    display.value = '0.';
    waitingForOperand.value = false;
  } else if (display.value.indexOf('.') === -1) {
    display.value += '.';
  }
};

const clear = () => {
  display.value = '0';
  previousValue.value = 0;
  operation.value = '';
  waitingForOperand.value = false;
};

const performOperation = (nextOperation: string) => {
  const inputValue = parseFloat(display.value);

  if (previousValue.value === 0) {
    previousValue.value = inputValue;
  } else if (operation.value) {
    const currentValue = previousValue.value || 0;
    const newValue = calculate(currentValue, inputValue, operation.value);

    display.value = String(newValue);
    previousValue.value = newValue;
  }

  waitingForOperand.value = true;
  operation.value = nextOperation;
};

const calculate = (firstValue: number, secondValue: number, operation: string): number => {
  switch (operation) {
    case '+':
      return firstValue + secondValue;
    case '-':
      return firstValue - secondValue;
    case '*':
      return firstValue * secondValue;
    case '/':
      return firstValue / secondValue;
    case '=':
      return secondValue;
    default:
      return secondValue;
  }
};

const equals = () => {
  const inputValue = parseFloat(display.value);

  if (previousValue.value !== 0 && operation.value) {
    const newValue = calculate(previousValue.value, inputValue, operation.value);
    display.value = String(newValue);
    previousValue.value = 0;
    operation.value = '';
    waitingForOperand.value = true;
  }
};

const setTotalAmount = () => {
  display.value = props.totalPedido.toFixed(2);
  waitingForOperand.value = false;
};

const addCommonAmount = (amount: number) => {
  display.value = amount.toString();
  waitingForOperand.value = false;
};
</script>

<template>
  <div class="bg-white rounded-lg p-4 max-w-sm mx-auto">
    <h3 class="text-lg font-semibold text-gray-800 mb-4 text-center">Calculadora de Cambio</h3>

    <!-- Información del pedido -->
    <div class="mb-4 p-3 bg-gray-50 rounded-lg">
      <div class="flex justify-between text-sm">
        <span class="text-gray-600">Total del pedido:</span>
        <span class="font-semibold">{{ formatCurrencyHNL(totalPedido) }}</span>
      </div>
      <div class="flex justify-between text-sm mt-1">
        <span class="text-gray-600">Monto recibido:</span>
        <span class="font-semibold" :class="esPagoSuficiente ? 'text-green-600' : 'text-red-600'">
          {{ formatCurrencyHNL(montoRecibido) }}
        </span>
      </div>
      <div class="flex justify-between text-sm mt-1 pt-2 border-t border-gray-200">
        <span class="text-gray-600">Cambio:</span>
        <span
          class="font-bold text-lg"
          :class="esPagoSuficiente ? 'text-green-600' : 'text-gray-400'"
        >
          {{ formatCurrencyHNL(cambio) }}
        </span>
      </div>
    </div>

    <!-- Display de la calculadora -->
    <div class="mb-4">
      <input
        :value="display"
        readonly
        class="w-full text-right text-2xl font-mono bg-gray-100 border border-gray-300 rounded-lg px-3 py-2"
      />
    </div>

    <!-- Botones de montos comunes -->
    <div class="mb-4">
      <p class="text-xs text-gray-600 mb-2">Montos comunes:</p>
      <div class="grid grid-cols-4 gap-2">
        <button
          @click="setTotalAmount"
          class="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded"
        >
          Exacto
        </button>
        <button
          @click="addCommonAmount(100)"
          class="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded"
        >
          L100
        </button>
        <button
          @click="addCommonAmount(200)"
          class="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded"
        >
          L200
        </button>
        <button
          @click="addCommonAmount(500)"
          class="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded"
        >
          L500
        </button>
      </div>
    </div>

    <!-- Teclado de la calculadora -->
    <div class="grid grid-cols-4 gap-2">
      <!-- Fila 1 -->
      <button
        @click="clear"
        class="col-span-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg"
      >
        C
      </button>
      <button
        @click="performOperation('/')"
        class="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg"
      >
        ÷
      </button>
      <button
        @click="performOperation('*')"
        class="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg"
      >
        ×
      </button>

      <!-- Fila 2 -->
      <button
        @click="inputNumber('7')"
        class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
      >
        7
      </button>
      <button
        @click="inputNumber('8')"
        class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
      >
        8
      </button>
      <button
        @click="inputNumber('9')"
        class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
      >
        9
      </button>
      <button
        @click="performOperation('-')"
        class="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg"
      >
        -
      </button>

      <!-- Fila 3 -->
      <button
        @click="inputNumber('4')"
        class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
      >
        4
      </button>
      <button
        @click="inputNumber('5')"
        class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
      >
        5
      </button>
      <button
        @click="inputNumber('6')"
        class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
      >
        6
      </button>
      <button
        @click="performOperation('+')"
        class="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg"
      >
        +
      </button>

      <!-- Fila 4 -->
      <button
        @click="inputNumber('1')"
        class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
      >
        1
      </button>
      <button
        @click="inputNumber('2')"
        class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
      >
        2
      </button>
      <button
        @click="inputNumber('3')"
        class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
      >
        3
      </button>
      <button
        @click="equals"
        class="row-span-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg"
      >
        =
      </button>

      <!-- Fila 5 -->
      <button
        @click="inputNumber('0')"
        class="col-span-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
      >
        0
      </button>
      <button
        @click="inputDecimal"
        class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg"
      >
        .
      </button>
    </div>

    <!-- Indicador de pago suficiente -->
    <div
      class="mt-4 p-2 rounded-lg"
      :class="esPagoSuficiente ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
    >
      <p class="text-sm text-center font-medium">
        <span v-if="esPagoSuficiente">✓ Pago suficiente</span>
        <span v-else>⚠ Monto insuficiente</span>
      </p>
    </div>
  </div>
</template>
