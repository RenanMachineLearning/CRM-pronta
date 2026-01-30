import { ExportOptions } from "../components/ExportDialog/ExportDialog.types";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

/**
 * Função para exportar dados
 * @param entityType - Tipo da entidade a ser exportada (ex: 'contacts', 'companies')
 * @param options - Opções de exportação
 * @returns Promise<Blob> - O arquivo exportado
 */
export const exportData = async (
  entityType: string, 
  options: ExportOptions,
  token: string
): Promise<Blob> => {
  try {
    const response = await fetch(`${API_BASE_URL}/export/${entityType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Erro na exportação: ${response.status}`);
    }

    // Verifica se a resposta é um blob
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      // Se for JSON, pode ser uma mensagem de erro
      const jsonData = await response.json();
      throw new Error(jsonData.message || 'Erro desconhecido na exportação');
    }

    return await response.blob();
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    throw error;
  }
};

/**
 * Função para obter os campos disponíveis para exportação de uma entidade
 * @param entityType - Tipo da entidade
 * @returns Promise<Field[]> - Lista de campos disponíveis
 */
export const getAvailableFields = async (
  entityType: string,
  token: string
): Promise<any[]> => {
  try {
    // Converter o nome da entidade para o formato correto (primeira letra maiúscula)
    const normalizedEntityType = entityType.charAt(0).toUpperCase() + entityType.slice(1).toLowerCase();

    const response = await fetch(`${API_BASE_URL}/entities/${normalizedEntityType}/fields`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Erro ao obter campos: ${response.status}`);
    }

    const result: ApiResponse<any[]> = await response.json();
    return result.data;
  } catch (error) {
    console.error('Erro ao obter campos disponíveis:', error);
    throw error;
  }
};