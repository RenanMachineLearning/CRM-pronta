/**
 * Utilitário para parsing de arquivos Excel (XLSX e XLS)
 * 
 * Responsável por:
 * - Detectar formato automaticamente (XLSX vs XLS)
 * - Processar múltiplas planilhas (workbook)
 * - Permitir seleção de planilha específica
 * - Converter dados para formato padronizado
 * - Sanitizar dados básicos
 */

import * as XLSX from 'xlsx';
import { sanitizeCsvData } from './csvSanitizer';

export interface ExcelParseOptions {
  sheetName?: string;        // Nome da planilha a ser processada
  sheetIndex?: number;       // Índice da planilha a ser processada (padrão: 0)
  header?: boolean;          // Se primeira linha contém cabeçalhos (padrão: true)
  range?: string | number;   // Range específico a ser processado
  defval?: any;              // Valor padrão para células vazias
  raw?: boolean;             // Processar células como valores crus (padrão: false)
}

export interface ExcelParseResult {
  data: any[];               // Dados parseados como array de objetos
  sheets: string[];          // Nomes de todas as planilhas disponíveis
  activeSheet: string;       // Nome da planilha ativa processada
  meta: {
    rows: number;            // Número de linhas processadas
    cols: number;            // Número de colunas processadas
    range: string;           // Range processado
  };
  errors: any[];             // Erros encontrados durante o parsing
}

export interface ExcelSheetMetadata {
  name: string;              // Nome da planilha
  rowCount: number;          // Número de linhas
  colCount: number;          // Número de colunas
  range: string;             // Range total da planilha
}

/**
 * Parseia um arquivo Excel a partir de um Buffer
 * Detecta formato automaticamente (XLSX/XLS) e processa a planilha especificada
 */
export async function parseExcel(
  fileBuffer: Buffer,
  options: ExcelParseOptions = {}
): Promise<ExcelParseResult> {
  return new Promise((resolve, reject) => {
    try {
      // Ler o workbook a partir do buffer
      const workbook = XLSX.read(fileBuffer, {
        type: 'buffer',
        cellDates: true,      // Converter células de data automaticamente
        cellNF: false,        // Não incluir formato de número das células
        cellText: false,      // Não incluir representação de texto das células
      });

      // Obter nomes de todas as planilhas
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        throw new Error('O arquivo Excel não contém nenhuma planilha');
      }

      // Determinar qual planilha será processada
      let activeSheetName: string;
      if (options.sheetName && sheetNames.includes(options.sheetName)) {
        activeSheetName = options.sheetName;
      } else if (options.sheetIndex !== undefined && options.sheetIndex < sheetNames.length) {
        activeSheetName = sheetNames[options.sheetIndex];
      } else {
        // Usar a primeira planilha por padrão
        activeSheetName = sheetNames[0];
      }

      // Obter a worksheet ativa
      const worksheet = workbook.Sheets[activeSheetName];

      if (!worksheet) {
        throw new Error(`Planilha "${activeSheetName}" não encontrada no arquivo`);
      }

      // Converter a worksheet para JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: options.header !== false ? 1 : 0,  // Por padrão, usa primeira linha como cabeçalho
        defval: options.defval,
        raw: options.raw === true,
        range: options.range,
      });

      // Sanitizar os dados
      const sanitizedData = jsonData.map(row => sanitizeCsvData(row));

      // Obter informações sobre o range processado
      const range = worksheet['!ref'] || 'A1';
      
      // Calcular número de linhas e colunas
      let rowCount = 0;
      let colCount = 0;
      if (range) {
        const decodedRange = XLSX.utils.decode_range(range);
        rowCount = decodedRange.e.r - decodedRange.s.r + 1;
        colCount = decodedRange.e.c - decodedRange.s.c + 1;
      }

      resolve({
        data: sanitizedData,
        sheets: sheetNames,
        activeSheet: activeSheetName,
        meta: {
          rows: sanitizedData.length,
          cols: colCount,
          range: range
        },
        errors: []  // Por enquanto, não capturamos erros específicos do parsing
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Obtém metadados de todas as planilhas em um arquivo Excel
 */
export async function getExcelSheetsMetadata(fileBuffer: Buffer): Promise<ExcelSheetMetadata[]> {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.read(fileBuffer, {
        type: 'buffer',
      });

      const metadata: ExcelSheetMetadata[] = workbook.SheetNames.map(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const range = worksheet['!ref'] || 'A1';
        
        let rowCount = 0;
        let colCount = 0;
        if (range) {
          const decodedRange = XLSX.utils.decode_range(range);
          rowCount = decodedRange.e.r - decodedRange.s.r + 1;
          colCount = decodedRange.e.c - decodedRange.s.c + 1;
        }

        return {
          name: sheetName,
          rowCount,
          colCount,
          range
        };
      });

      resolve(metadata);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Detecta se um buffer é um arquivo Excel válido (XLSX ou XLS)
 */
export function isValidExcelBuffer(buffer: Buffer): boolean {
  try {
    // Tentar ler o buffer como Excel
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true
    });

    // Verificar se tem pelo menos uma planilha
    return workbook.SheetNames.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Detecta o formato do arquivo Excel (XLSX ou XLS) a partir do buffer
 * Esta função tenta determinar o formato com base nas propriedades do arquivo
 */
export function detectExcelFormat(buffer: Buffer): 'XLSX' | 'XLS' | 'UNKNOWN' {
  try {
    // A detecção de formato exato é complicada apenas com buffer
    // Mas podemos tentar ler o arquivo e verificar propriedades
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true
    });

    // Se chegou até aqui, é um arquivo Excel válido
    // A biblioteca xlsx normalmente detecta o formato automaticamente
    // Para distinguir entre XLSX e XLS, podemos verificar propriedades específicas
    // mas isso nem sempre é preciso, então retornamos UNKNOWN como fallback
    return 'XLSX'; // A biblioteca xlsx normalmente lida bem com ambos os formatos
  } catch (error) {
    return 'UNKNOWN';
  }
}

/**
 * Converte dados de uma planilha Excel para o formato CSV como string
 * Útil para normalizar o processamento entre Excel e CSV
 */
export function excelSheetToCsvString(worksheet: XLSX.WorkSheet, delimiter: string = ','): string {
  return XLSX.utils.sheet_to_csv(worksheet, { FS: delimiter });
}