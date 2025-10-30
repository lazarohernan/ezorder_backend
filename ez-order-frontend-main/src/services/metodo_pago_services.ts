import apiClient from '@/plugins/axios';
import type {
  CreateMetodoPagoDTO,
  UpdateMetodoPagoDTO,
  MetodosPagoListResponse,
  MetodoPagoSingleResponse,
  MetodoPagoMutationResponse,
  MetodoPagoDeleteResponse,
} from '@/interfaces/MetodoPago';

class MetodoPagoService {
  private baseURL = '/metodos-pago';

  /**
   * Obtener todos los métodos de pago
   */
  async getAll(): Promise<{ data: MetodosPagoListResponse }> {
    try {
      const response = await apiClient.get<MetodosPagoListResponse>(this.baseURL);
      return { data: response.data };
    } catch (error) {
      console.error('Error al obtener métodos de pago:', error);
      throw error;
    }
  }

  /**
   * Obtener un método de pago por ID
   */
  async getById(id: number): Promise<{ data: MetodoPagoSingleResponse }> {
    try {
      const response = await apiClient.get<MetodoPagoSingleResponse>(`${this.baseURL}/${id}`);
      return { data: response.data };
    } catch (error) {
      console.error(`Error al obtener método de pago con ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Crear un nuevo método de pago
   */
  async create(metodoPagoData: CreateMetodoPagoDTO): Promise<{ data: MetodoPagoMutationResponse }> {
    try {
      const response = await apiClient.post<MetodoPagoMutationResponse>(
        this.baseURL,
        metodoPagoData,
      );
      return { data: response.data };
    } catch (error) {
      console.error('Error al crear método de pago:', error);
      throw error;
    }
  }

  /**
   * Actualizar un método de pago existente
   */
  async update(
    id: number,
    metodoPagoData: UpdateMetodoPagoDTO,
  ): Promise<{ data: MetodoPagoMutationResponse }> {
    try {
      const response = await apiClient.put<MetodoPagoMutationResponse>(
        `${this.baseURL}/${id}`,
        metodoPagoData,
      );
      return { data: response.data };
    } catch (error) {
      console.error(`Error al actualizar método de pago con ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Eliminar un método de pago
   */
  async delete(id: number): Promise<{ data: MetodoPagoDeleteResponse }> {
    try {
      const response = await apiClient.delete<MetodoPagoDeleteResponse>(`${this.baseURL}/${id}`);
      return { data: response.data };
    } catch (error) {
      console.error(`Error al eliminar método de pago con ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Verificar si un método de pago está siendo usado en pedidos
   * (Esta función puede ser útil antes de eliminar)
   */
  async checkUsage(id: number): Promise<boolean> {
    try {
      // Intentamos eliminar y si retorna error por uso, sabemos que está en uso
      await this.delete(id);
      return false;
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status: number } };
        if (axiosError.response?.status === 400) {
          // Error 400 significa que está siendo usado
          return true;
        }
      }
      // Otros errores los propagamos
      throw error;
    }
  }

  /**
   * Obtener métodos de pago activos (todos, ya que no hay campo activo en la tabla)
   * Esta función es útil para llenar dropdowns/selects
   */
  async getForDropdown(): Promise<{ data: MetodosPagoListResponse }> {
    return this.getAll();
  }

  /**
   * Buscar métodos de pago por nombre (filtrado en el frontend)
   */
  async searchByName(searchTerm: string): Promise<{ data: MetodosPagoListResponse }> {
    try {
      const allMethods = await this.getAll();
      const filteredMethods = allMethods.data.data.filter(
        (metodo) =>
          metodo.metodo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          metodo.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()),
      );

      return {
        data: {
          success: true,
          data: filteredMethods,
        },
      };
    } catch (error) {
      console.error('Error al buscar métodos de pago:', error);
      throw error;
    }
  }
}

// Exportar una instancia única del servicio
export default new MetodoPagoService();
