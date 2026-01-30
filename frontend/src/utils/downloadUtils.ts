/**
 * Função para fazer download de um arquivo
 * @param blob - O conteúdo do arquivo como Blob
 * @param filename - O nome do arquivo a ser salvo
 */
export const downloadFile = (blob: Blob, filename: string): void => {
  // Cria um objeto URL para o blob
  const url = window.URL.createObjectURL(blob);
  
  // Cria um elemento <a> temporário
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Simula o clique no link para iniciar o download
  document.body.appendChild(link);
  link.click();
  
  // Remove o link temporário e revoga o URL
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Gera um nome de arquivo para exportação com base no tipo de entidade e data
 * @param entityType - Tipo da entidade sendo exportada
 * @param format - Formato do arquivo (csv, excel)
 * @returns Nome do arquivo com timestamp
 */
export const generateExportFilename = (entityType: string, format: 'csv' | 'excel'): string => {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-'); // YYYY-MM-DDTHH-mm-ss
  const extension = format === 'csv' ? '.csv' : '.xlsx';
  
  return `${entityType}_export_${timestamp}${extension}`;
};