import apiClient from '@/plugins/axios';

/**
 * Interfaz para la respuesta del servidor al subir un archivo
 */
export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    publicUrl?: string;
  };
  error?: string;
}

/**
 * Servicio para gestionar la subida de archivos
 */
export const UploadService = {
  /**
   * Sube un archivo al servidor
   * @param file - El archivo a subir
   * @param folder - La carpeta donde se guardará el archivo (ej: 'logos', 'productos', etc.)
   * @returns Promise con la respuesta del servidor
   */
  uploadFile: async (file: File, folder: string): Promise<UploadResponse> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await apiClient.post<UploadResponse>('/uploads', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: unknown) {
      console.error('Error al subir archivo:', error);
      const err = error as { response?: { data?: { message?: string } } };
      return {
        success: false,
        message: err.response?.data?.message || 'Error al subir el archivo',
      };
    }
  },

  /**
   * Sube múltiples archivos al servidor
   * @param files - Array de archivos a subir
   * @param folder - La carpeta donde se guardarán los archivos
   * @returns Promise con un array de respuestas del servidor
   */
  uploadMultipleFiles: async (files: File[], folder: string): Promise<UploadResponse[]> => {
    try {
      const uploadPromises = files.map((file) => UploadService.uploadFile(file, folder));
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error al subir múltiples archivos:', error);
      return [
        {
          success: false,
          message: 'Error al subir los archivos',
        },
      ];
    }
  },

  /**
   * Verifica si un archivo es de un tipo permitido
   * @param file - El archivo a verificar
   * @param allowedTypes - Array de tipos MIME permitidos
   * @returns boolean indicando si el archivo es válido
   */
  isValidFileType: (file: File, allowedTypes: string[]): boolean => {
    return allowedTypes.includes(file.type);
  },

  /**
   * Verifica si un archivo no excede un tamaño máximo
   * @param file - El archivo a verificar
   * @param maxSizeInMB - Tamaño máximo en megabytes
   * @returns boolean indicando si el archivo es válido
   */
  isValidFileSize: (file: File, maxSizeInMB: number): boolean => {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
  },
};

export default UploadService;
