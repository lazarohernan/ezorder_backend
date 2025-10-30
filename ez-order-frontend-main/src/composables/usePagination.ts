import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import type { AxiosResponse } from 'axios';
import type { PaginatedResponse } from '@/services/usuarios_service';
import type { ApiResponse } from '@/interfaces/Usuario';

// Update FetchFunction type to work with the ApiResponse from Usuario.ts
type FetchFunction<T> = (params: {
  page: number;
  limit: number;
}) => Promise<AxiosResponse<ApiResponse<PaginatedResponse<T>>>>;

/**
 * Composable para manejar la paginación de datos en tablas
 * @param fetchFunction - Función que obtiene los datos paginados del servidor
 * @param initialPage - Página inicial (default: 1)
 * @param initialLimit - Límite de elementos por página (default: 10)
 */
export function usePagination<T>(
  fetchFunction: FetchFunction<T>,
  initialPage = 1,
  initialLimit = 10,
) {
  // Estado reactivo
  const currentPage = ref(initialPage);
  const itemsPerPage = ref(initialLimit);
  const items = ref<T[]>([]) as Ref<T[]>;
  const totalItems = ref(0);
  const totalPages = ref(0);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Propiedades computadas
  const hasPreviousPage = computed(() => currentPage.value > 1);
  const hasNextPage = computed(() => currentPage.value < totalPages.value);

  // Obtener datos paginados
  const fetchData = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetchFunction({
        page: currentPage.value,
        limit: itemsPerPage.value,
      });

      const paginatedData = response.data.data;

      if (paginatedData) {
        // Actualizar estado con los datos recibidos
        items.value = paginatedData.items;
        totalItems.value = paginatedData.total;
        totalPages.value = paginatedData.totalPages;

        // Asegurar que la página actual esté dentro del rango válido
        if (currentPage.value > totalPages.value && totalPages.value > 0) {
          currentPage.value = totalPages.value;
          return await fetchData();
        }
      } else {
        // Si no hay datos, resetear el estado
        items.value = [];
        totalItems.value = 0;
        totalPages.value = 0;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar los datos';
      error.value = errorMessage;
      items.value = [];
      totalItems.value = 0;
      totalPages.value = 0;
    } finally {
      isLoading.value = false;
    }
  };

  // Navegar a una página específica
  const goToPage = async (page: number) => {
    if (page < 1 || page > totalPages.value || page === currentPage.value) {
      return;
    }

    currentPage.value = page;
    await fetchData();
  };

  // Ir a la primera página
  const goToFirstPage = async () => {
    if (currentPage.value !== 1) {
      currentPage.value = 1;
      await fetchData();
    }
  };

  // Ir a la página anterior
  const goToPreviousPage = async () => {
    if (hasPreviousPage.value) {
      currentPage.value--;
      await fetchData();
    }
  };

  // Ir a la página siguiente
  const goToNextPage = async () => {
    if (hasNextPage.value) {
      currentPage.value++;
      await fetchData();
    }
  };

  // Ir a la última página
  const goToLastPage = async () => {
    if (currentPage.value !== totalPages.value) {
      currentPage.value = totalPages.value;
      await fetchData();
    }
  };

  // Cambiar elementos por página
  const changeItemsPerPage = async (limit: number) => {
    itemsPerPage.value = limit;
    currentPage.value = 1; // Resetear a la primera página
    await fetchData();
  };

  // Refrescar datos actuales
  const refresh = async () => {
    await fetchData();
  };

  // Cargar datos iniciales
  fetchData();

  return {
    // Estado
    currentPage,
    itemsPerPage,
    items,
    totalItems,
    totalPages,
    isLoading,
    error,

    // Propiedades computadas
    hasPreviousPage,
    hasNextPage,

    // Métodos
    fetchData,
    goToPage,
    goToFirstPage,
    goToPreviousPage,
    goToNextPage,
    goToLastPage,
    changeItemsPerPage,
    refresh,
  };
}

export default usePagination;
