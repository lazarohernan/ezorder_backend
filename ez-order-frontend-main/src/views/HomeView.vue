<template>
  <div class="min-h-screen flex flex-col">
    <!-- Barra de navegación -->
    <nav class="bg-white shadow-md py-4">
      <div class="container mx-auto px-4 flex justify-between items-center">
        <div class="flex items-center">
          <h1 class="text-2xl font-bold text-[#FF6424]">EZOrder</h1>
        </div>
        <div>
          <RouterLink
            to="/auth/login"
            class="bg-[#FF6424] hover:bg-[#e55b20] text-white font-medium py-2 px-4 rounded-lg transition duration-300"
          >
            Iniciar sesión
          </RouterLink>
        </div>
      </div>
    </nav>

    <!-- Hero section -->
    <section class="bg-gradient-to-br from-white to-orange-50 py-16">
      <div class="container mx-auto px-4 flex flex-col md:flex-row items-center">
        <div class="md:w-1/2 mb-10 md:mb-0">
          <h2 class="text-4xl md:text-5xl font-bold mb-4">
            Gestión de pedidos <span class="text-[#FF6424]">simple y eficiente</span>
          </h2>
          <p class="text-lg text-gray-600 mb-6">
            Sistema completo para restaurantes que facilita la toma de pedidos y la gestión de
            facturas.
          </p>
          <div class="flex flex-col sm:flex-row gap-4">
            <button
              class="bg-[#FF6424] hover:bg-[#e55b20] text-white font-bold py-3 px-6 rounded-lg shadow-lg transition duration-300"
            >
              Solicitar demostración
            </button>
            <button
              class="border-2 border-[#FF6424] text-[#FF6424] hover:bg-orange-50 font-bold py-3 px-6 rounded-lg transition duration-300"
            >
              Conocer más
            </button>
          </div>
        </div>
        <div class="md:w-1/2 flex justify-center">
          <div class="w-full max-w-md h-96 bg-white rounded-xl shadow-xl overflow-hidden relative">
            <div
              class="absolute inset-0 bg-gradient-to-br from-[#FF6424] to-orange-300 opacity-10"
            ></div>
            <div
              class="absolute top-4 left-4 right-4 h-12 bg-[#FF6424] rounded-lg opacity-80"
            ></div>
            <div
              class="absolute top-20 left-4 right-4 h-64 bg-white rounded-lg border border-gray-200"
            ></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Características -->
    <section class="py-16 bg-white">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">Características principales</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300">
            <div class="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 text-[#FF6424]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 class="text-xl font-bold mb-2">Toma de pedidos</h3>
            <p class="text-gray-600">
              Sistema intuitivo para registrar pedidos de manera rápida y precisa, reduciendo
              errores y tiempo de espera.
            </p>
          </div>

          <div class="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300">
            <div class="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 text-[#FF6424]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 class="text-xl font-bold mb-2">Facturación</h3>
            <p class="text-gray-600">
              Genera facturas automáticamente para cada pedido pagado, cumpliendo con todos los
              requisitos legales.
            </p>
          </div>

          <div class="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition duration-300">
            <div class="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 text-[#FF6424]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h3 class="text-xl font-bold mb-2">Gestión de clientes</h3>
            <p class="text-gray-600">
              Registra información de tus clientes para ofrecer un servicio personalizado y
              programas de fidelización.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Call to action -->
    <section class="bg-[#FF6424] py-16">
      <div class="container mx-auto px-4 text-center">
        <h2 class="text-3xl font-bold text-white mb-6">
          ¿Listo para mejorar la gestión de tu restaurante?
        </h2>
        <p class="text-white text-lg mb-8 max-w-2xl mx-auto">
          Únete a cientos de restaurantes que ya optimizaron sus operaciones con EZOrder
        </p>
        <button
          class="bg-white text-[#FF6424] hover:bg-gray-100 font-bold py-3 px-8 rounded-lg shadow-lg transition duration-300"
        >
          Comenzar ahora
        </button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-800 text-white py-8 mt-auto">
      <div class="container mx-auto px-4">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <div class="mb-4 md:mb-0">
            <h3 class="text-xl font-bold text-[#FF6424]">EZOrder</h3>
            <p class="text-gray-400 text-sm">La solución completa para tu restaurante</p>
          </div>
          <div class="flex gap-4">
            <a href="#" class="text-gray-400 hover:text-white transition duration-300"
              >Términos y condiciones</a
            >
            <a href="#" class="text-gray-400 hover:text-white transition duration-300"
              >Privacidad</a
            >
            <a href="#" class="text-gray-400 hover:text-white transition duration-300">Contacto</a>
          </div>
        </div>
        <div class="mt-6 pt-6 border-t border-gray-700 text-center text-gray-500 text-sm">
          &copy; 2025 EZOrder. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
// Aquí podemos agregar la lógica necesaria más adelante
</script>
