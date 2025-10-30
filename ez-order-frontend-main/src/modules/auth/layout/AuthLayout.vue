<template>
  <div class="min-h-screen flex bg-gray-50">
    <!-- Panel lateral con logo y decoración -->
    <div
      class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FF6424] to-orange-300 p-12 flex-col justify-between"
    >
      <div>
        <h1 class="text-4xl font-bold text-white">EZOrder</h1>
        <p class="mt-2 text-xl text-white opacity-90">
          La solución completa para la gestión de tu restaurante
        </p>
      </div>

      <div class="relative h-64">
        <!-- Aquí podríamos agregar una ilustración o imagen decorativa -->
        <div class="absolute bottom-0 left-0 right-0 h-32 bg-white opacity-10 rounded-lg"></div>
        <div class="absolute bottom-10 left-10 right-10 h-32 bg-white opacity-10 rounded-lg"></div>
        <div class="absolute bottom-20 left-20 right-20 h-32 bg-white opacity-10 rounded-lg"></div>
      </div>

      <div class="text-white opacity-80 text-sm">
        &copy; 2025 EZOrder. Todos los derechos reservados.
      </div>
    </div>

    <!-- Contenido principal - área de autenticación -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8">
      <div class="w-full max-w-md">
        <!-- Logo para móvil -->
        <div class="block lg:hidden mb-8 text-center">
          <h1 class="text-3xl font-bold text-[#FF6424]">EZOrder</h1>
          <p class="mt-1 text-gray-600">La solución completa para tu restaurante</p>
        </div>

        <!-- Slot para el contenido específico de cada vista -->
        <slot></slot>

        <!-- Footer para móvil -->
        <div class="block lg:hidden mt-12 text-center text-sm text-gray-500">
          &copy; 2025 EZOrder. Todos los derechos reservados.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Aquí se puede agregar lógica compartida por todas las vistas de autenticación
</script>
