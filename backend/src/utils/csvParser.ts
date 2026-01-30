/**
 * Utilitário para parsing de arquivos CSV
 * 
 * Responsável por:
 * - Detectar encoding automaticamente
 * - Detectar delimitador automaticamente
 * - Parsear conteúdo CSV em array de objetos
 * - Sanitizar dados básicos
 */

import { parse } from 'papaparse';
import * as iconv from 'iconv-lite';
import { sanitizeCsvData } from './csvSanitizer';
import { CorruptedFileError, InvalidEncodingError } from '../errors/ImportExportError';

export interface CsvParseOptions {
  delimiter?: string;
  header?: boolean;
  skipEmptyLines?: boolean | 'greedy';
  encoding?: string;
  transform?: (value: any, field: string) => any;
}

export interface CsvParseResult {
  data: any[];
  meta: {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    fields: string[];
    truncated: boolean;
  };
  errors: any[];
}

/**
 * Detecta o encoding de um buffer
 * Tenta detectar automaticamente entre UTF-8 e ISO-8859-1
 */
export function detectEncoding(buffer: Buffer): string {
  // Primeiro tenta detectar se é UTF-8 válido
  const utf8String = buffer.toString('utf8');
  const isValidUtf8 = Buffer.from(utf8String, 'utf8').equals(buffer);
  
  if (isValidUtf8) {
    // Verifica se parece ser UTF-8 com caracteres especiais
    if (utf8String.match(/[\u0080-\u00FF]/)) {
      // Pode ser ISO-8859-1 codificado como binário
      // Vamos tentar decodificar como ISO-8859-1
      try {
        const latin1String = iconv.decode(buffer, 'latin1');
        // Se tiver caracteres acentuados legíveis, provavelmente é ISO-8859-1
        if (latin1String.match(/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i)) {
          return 'latin1';
        }
      } catch (e) {
        // Se der erro, volta para UTF-8
        return 'utf8';
      }
    }
    return 'utf8';
  }
  
  // Se não for UTF-8 válido, tenta como ISO-8859-1
  try {
    const latin1String = iconv.decode(buffer, 'latin1');
    if (latin1String.match(/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i)) {
      return 'latin1';
    }
  } catch (e) {
    // Se der erro, assume UTF-8
  }
  
  return 'utf8';
}

/**
 * Detecta automaticamente o delimitador do CSV
 * Tenta vírgula, ponto e vírgula e tab
 */
export function detectDelimiter(text: string): string {
  // Pegar as primeiras linhas para análise
  const lines = text.split('\n').slice(0, 5);
  
  // Contar ocorrências de possíveis delimitadores
  const commaCount = lines.reduce((count, line) => count + (line.match(/,/g) || []).length, 0);
  const semicolonCount = lines.reduce((count, line) => count + (line.match(/;/g) || []).length, 0);
  const tabCount = lines.reduce((count, line) => count + (line.match(/\t/g) || []).length, 0);
  
  // Determinar qual delimitador é mais provável
  if (commaCount > semicolonCount && commaCount > tabCount) {
    return ',';
  } else if (semicolonCount > tabCount) {
    return ';';
  } else {
    return '\t';
  }
}

/**
 * Parseia um arquivo CSV a partir de um Buffer
 * Detecta encoding e delimitador automaticamente
 */
export async function parseCSV(
  fileBuffer: Buffer,
  options: CsvParseOptions = {},
  tenantId?: string,
  jobId?: string
): Promise<CsvParseResult> {
  return new Promise((resolve, reject) => {
    try {
      // Validar integridade do arquivo
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new CorruptedFileError('Arquivo CSV vazio ou corrompido', undefined, tenantId, jobId);
      }

      // Detectar encoding automaticamente se não for especificado
      let encoding = options.encoding || detectEncoding(fileBuffer);

      // Decodificar o buffer para string
      let textContent: string;
      try {
        if (encoding === 'utf8') {
          textContent = fileBuffer.toString('utf8');
        } else {
          textContent = iconv.decode(fileBuffer, encoding);
        }
      } catch (decodeError) {
        throw new InvalidEncodingError(
          `Falha ao decodificar arquivo com encoding ${encoding}`,
          { originalError: decodeError as Error, attemptedEncoding: encoding },
          tenantId,
          jobId
        );
      }

      // Verificar se o conteúdo parece ser um CSV válido
      if (!textContent.trim()) {
        throw new CorruptedFileError('Arquivo CSV não contém conteúdo válido', undefined, tenantId, jobId);
      }

      // Detectar delimitador automaticamente se não for especificado
      const delimiter = options.delimiter || detectDelimiter(textContent);

      // Configurar opções para o PapaParse
      const parseOptions = {
        delimiter,
        header: options.header !== undefined ? options.header : true,
        skipEmptyLines: options.skipEmptyLines !== undefined ? options.skipEmptyLines : true,
        transform: options.transform,
        // Detectar erros de parsing
        error: (error: any) => {
          reject(new CorruptedFileError(
            `Erro de parsing no arquivo CSV: ${error.message}`,
            { papaparseError: error },
            tenantId,
            jobId
          ));
        }
      };

      // Parsear o CSV
      let parsed;
      try {
        parsed = parse(textContent, parseOptions);
      } catch (parseError) {
        throw new CorruptedFileError(
          `Falha ao parsear conteúdo CSV: ${(parseError as Error).message}`,
          { originalError: parseError as Error },
          tenantId,
          jobId
        );
      }

      // Verificar se houve erros de parsing
      if (parsed.errors && parsed.errors.length > 0) {
        // Converter erros do PapaParse para nosso formato
        const hasCriticalErrors = parsed.errors.some((error: any) => error.type === 'Quotes' || error.type === 'Delimiter');
        if (hasCriticalErrors) {
          throw new CorruptedFileError(
            `Erros críticos de parsing detectados no CSV: ${parsed.errors.map((e: any) => e.message).join(', ')}`,
            { papaparseErrors: parsed.errors },
            tenantId,
            jobId
          );
        }
      }

      // Sanitizar os dados
      const sanitizedData = parsed.data.map(row => sanitizeCsvData(row));

      resolve({
        data: sanitizedData,
        meta: {
          ...parsed.meta,
          delimiter: delimiter,
          fields: parsed.meta.fields || []
        },
        errors: parsed.errors
      });
    } catch (error) {
      // Se já for um dos nossos erros personalizados, apenas rejeitar
      if (error instanceof CorruptedFileError || error instanceof InvalidEncodingError) {
        reject(error);
      } else {
        // Converter outros erros para nosso formato
        reject(new CorruptedFileError(
          `Erro inesperado ao parsear arquivo CSV: ${(error as Error).message}`,
          { originalError: error as Error },
          tenantId,
          jobId
        ));
      }
    }
  });
}

/**
 * Valida se um buffer é um arquivo CSV válido
 */
export function isValidCsvBuffer(buffer: Buffer): boolean {
  try {
    // Detectar encoding
    const encoding = detectEncoding(buffer);
    
    // Decodificar para string
    let textContent: string;
    if (encoding === 'utf8') {
      textContent = buffer.toString('utf8');
    } else {
      textContent = iconv.decode(buffer, encoding);
    }
    
    // Verificar se tem pelo menos uma quebra de linha (mínimo para CSV)
    if (!textContent.includes('\n')) {
      return false;
    }
    
    // Detectar delimitador
    const delimiter = detectDelimiter(textContent);
    
    // Verificar se parece ter formato CSV (múltiplas colunas em pelo menos uma linha)
    const lines = textContent.split('\n');
    if (lines.length < 2) {
      return false; // Precisa de pelo menos cabeçalho e uma linha de dados
    }
    
    // Verificar se a primeira linha tem múltiplas colunas
    const firstLine = lines[0];
    if (firstLine.split(delimiter).length < 2) {
      return false; // Cabeçalho deve ter pelo menos 2 colunas
    }
    
    return true;
  } catch (error) {
    return false;
  }
}