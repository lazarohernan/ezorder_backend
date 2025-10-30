import { api } from '@/plugins/axios';
import type { CreateClienteDTO, UpdateClienteDTO } from '@/interfaces/Cliente';

/**
 * Servicio para gestionar clientes
 */
class ClientesService {
  /**
   * Obtiene todos los clientes
   * @returns Promise con la respuesta de la API
   */
  async getAll() {
    return api.get('/clientes');
  }

  /**
   * Obtiene un cliente por su ID
   * @param id ID del cliente
   * @returns Promise con la respuesta de la API
   */
  async getById(id: number) {
    return api.get(`/clientes/${id}`);
  }

  /**
   * Obtiene los clientes de un restaurante específico
   * @param restauranteId ID del restaurante
   * @returns Promise con la respuesta de la API
   */
  async getByRestauranteId(restauranteId: string) {
    return api.get(`/clientes/restaurante/${restauranteId}`);
  }

  /**
   * Crea un nuevo cliente
   * @param cliente Datos del cliente a crear
   * @returns Promise con la respuesta de la API
   */
  async create(cliente: CreateClienteDTO) {
    return api.post('/clientes', cliente);
  }

  /**
   * Actualiza un cliente existente
   * @param id ID del cliente a actualizar
   * @param cliente Datos actualizados del cliente
   * @returns Promise con la respuesta de la API
   */
  async update(id: number, cliente: UpdateClienteDTO) {
    return api.put(`/clientes/${id}`, cliente);
  }

  /**
   * Elimina un cliente
   * @param id ID del cliente a eliminar
   * @returns Promise con la respuesta de la API
   */
  async delete(id: number) {
    return api.delete(`/clientes/${id}`);
  }
}

export default new ClientesService();
