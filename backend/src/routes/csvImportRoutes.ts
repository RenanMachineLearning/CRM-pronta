/**
 * Rotas de importação de arquivos (CSV e Excel)
 *
 * Implementa endpoints para:
 * - Upload e validação de arquivos CSV e Excel
 * - Mapeamento de campos
 * - Processamento de importação
 * - Consulta de status de importação
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { CsvImportService } from '../services/csvImportService';
import { validateCsvFormat } from '../utils/csvValidator';
import { validateExcelFile } from '../utils/excelValidator';
import { getExcelSheetsMetadata } from '../utils/excelParser';
import { uploadImportFile, validateUploadedFile, checkImportPermission } from '../middleware/upload.middleware';
import { temporaryFileStorage, validateFileContent, isPotentiallyMalicious } from '../services/uploadService';
import { getImportReport, getImportTemplate } from '../controllers/importController';
import { importExportErrorHandler } from '../middleware/importExportErrorHandler';

// Configuração do multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(), // Armazenar em memória para processamento
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1 // Apenas um arquivo por vez
  },
  fileFilter: (_req, file, cb) => {
    // Permitir apenas arquivos CSV
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/csv' || 
        file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos'));
    }
  }
});

const router = Router();

/**
 * Endpoint para upload e validação inicial de arquivo (CSV ou Excel)
 */
router.post('/validate', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // Verificar se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({
        error: 'Nenhum arquivo enviado',
        message: 'Por favor, envie um arquivo CSV ou Excel'
      });
    }

    // Verificar tipo de arquivo
    const file = req.file;
    if (!file.buffer) {
      return res.status(400).json({
        error: 'Arquivo inválido',
        message: 'O arquivo não contém dados válidos'
      });
    }

    // Determinar tipo de arquivo com base na extensão
    const fileName = file.originalname.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isXlsx = fileName.endsWith('.xlsx');
    const isXls = fileName.endsWith('.xls');

    if (!isCsv && !isXlsx && !isXls) {
      return res.status(400).json({
        error: 'Tipo de arquivo não suportado',
        message: 'Apenas arquivos CSV, XLSX e XLS são permitidos'
      });
    }

    if (isCsv) {
      // Validar formato do CSV
      const content = file.buffer.toString('utf8');
      const formatValidation = validateCsvFormat(content);

      if (!formatValidation.valid) {
        return res.status(400).json({
          error: 'Formato de CSV inválido',
          message: 'O arquivo CSV não está no formato correto',
          details: formatValidation.errors
        });
      }

      // Parsear o CSV para obter informações básicas
      const lines = content.split('\n');
      const headers = lines[0].split(',');

      res.status(200).json({
        message: 'Arquivo CSV válido',
        fileType: 'csv',
        rows: lines.length - 1, // Menos 1 para desconsiderar o cabeçalho
        columns: headers.length,
        headers: headers.map(h => h.trim())
      });
    } else {
      // Validar arquivo Excel
      const validation = await validateExcelFile(file.buffer, file.originalname);

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Formato de Excel inválido',
          message: 'O arquivo Excel não está no formato correto ou está corrompido',
          details: validation.errors
        });
      }

      // Obter metadados das planilhas
      const sheetsMetadata = await getExcelSheetsMetadata(file.buffer);

      res.status(200).json({
        message: 'Arquivo Excel válido',
        fileType: isXlsx ? 'xlsx' : 'xls',
        sheets: sheetsMetadata.map(sheet => ({
          name: sheet.name,
          rowCount: sheet.rowCount,
          colCount: sheet.colCount,
          range: sheet.range
        }))
      });
    }
  } catch (error) {
    // Passar o erro para o middleware de tratamento de erros
    importExportErrorHandler(error as Error, req, res, () => {});
    return;
  }
  return; // Explicit return to satisfy TS7030
});

/**
 * Endpoint para mapeamento de campos
 * Retorna sugestões de mapeamento com base nos headers do CSV ou colunas do Excel
 */
router.post('/map-fields', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Nenhum arquivo enviado',
        message: 'Por favor, envie um arquivo CSV ou Excel'
      });
    }

    const file = req.file;
    if (!file.buffer) {
      return res.status(400).json({
        error: 'Arquivo inválido',
        message: 'O arquivo não contém dados válidos'
      });
    }

    // Determinar tipo de arquivo com base na extensão
    const fileName = file.originalname.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isXlsx = fileName.endsWith('.xlsx');
    const isXls = fileName.endsWith('.xls');

    if (!isCsv && !isXlsx && !isXls) {
      return res.status(400).json({
        error: 'Tipo de arquivo não suportado',
        message: 'Apenas arquivos CSV, XLSX e XLS são permitidos'
      });
    }

    let headers: string[] = [];

    if (isCsv) {
      // Parsear o CSV para obter os headers
      const content = file.buffer.toString('utf8');
      const lines = content.split('\n');
      headers = lines[0].split(',').map(h => h.trim());
    } else {
      // Para Excel, pegamos os headers da primeira linha da primeira planilha
      // Parseamos o Excel para obter os dados da primeira planilha
      const { parseExcel } = await import('../utils/excelParser');
      const result = await parseExcel(file.buffer, {
        sheetIndex: req.body.sheetIndex || 0,
        header: true
      });

      // Os headers são as chaves do primeiro objeto retornado
      if (result.data.length > 0) {
        headers = Object.keys(result.data[0]);
      }
    }

    // Mapeamento sugerido com base nos nomes dos campos
    const suggestedMapping: { [originalField: string]: string } = {};

    headers.forEach(header => {
      // Normalizar o nome do campo para comparação
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Tentar encontrar correspondência com campos comuns
      if (normalizedHeader.includes('nome') || normalizedHeader.includes('firstname') || normalizedHeader.includes('first')) {
        suggestedMapping[header] = 'firstName';
      } else if (normalizedHeader.includes('sobrenome') || normalizedHeader.includes('lastname') || normalizedHeader.includes('last')) {
        suggestedMapping[header] = 'lastName';
      } else if (normalizedHeader.includes('email') || normalizedHeader.includes('e-mail')) {
        suggestedMapping[header] = 'email';
      } else if (normalizedHeader.includes('telefone') || normalizedHeader.includes('phone') || normalizedHeader.includes('tel')) {
        suggestedMapping[header] = 'phone';
      } else if (normalizedHeader.includes('empresa') || normalizedHeader.includes('company') || normalizedHeader.includes('organization')) {
        suggestedMapping[header] = 'company';
      } else if (normalizedHeader.includes('titulo') || normalizedHeader.includes('title') || normalizedHeader.includes('cargo') || normalizedHeader.includes('position')) {
        suggestedMapping[header] = 'title';
      } else if (normalizedHeader.includes('endereco') || normalizedHeader.includes('address') || normalizedHeader.includes('logradouro')) {
        suggestedMapping[header] = 'street';
      } else if (normalizedHeader.includes('cidade') || normalizedHeader.includes('city')) {
        suggestedMapping[header] = 'city';
      } else if (normalizedHeader.includes('estado') || normalizedHeader.includes('state') || normalizedHeader.includes('uf')) {
        suggestedMapping[header] = 'state';
      } else if (normalizedHeader.includes('cep') || normalizedHeader.includes('zipcode') || normalizedHeader.includes('postalcode')) {
        suggestedMapping[header] = 'zipCode';
      } else if (normalizedHeader.includes('pais') || normalizedHeader.includes('country')) {
        suggestedMapping[header] = 'country';
      } else if (normalizedHeader.includes('site') || normalizedHeader.includes('website') || normalizedHeader.includes('url')) {
        suggestedMapping[header] = 'website';
      } else if (normalizedHeader.includes('industria') || normalizedHeader.includes('industry') || normalizedHeader.includes('setor')) {
        suggestedMapping[header] = 'industry';
      } else if (normalizedHeader.includes('porte') || normalizedHeader.includes('size')) {
        suggestedMapping[header] = 'size';
      } else {
        // Campo não reconhecido, manter o mesmo nome
        suggestedMapping[header] = header;
      }
    });

    let sheetName = undefined;
    if (!isCsv) {
      const { getExcelSheetsMetadata } = await import('../utils/excelParser');
      const sheetsMetadata = await getExcelSheetsMetadata(file.buffer);
      const sheetIndex = req.body.sheetIndex || 0;
      sheetName = sheetsMetadata[sheetIndex]?.name;
    }

    res.status(200).json({
      headers,
      suggestedMapping,
      entityType: 'contact', // Tipo padrão, pode ser alterado pelo usuário
      fileType: isCsv ? 'csv' : isXlsx ? 'xlsx' : 'xls',
      sheetName: sheetName
    });
  } catch (error) {
    console.error('Erro ao mapear campos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao mapear campos do arquivo',
      details: (error as Error).message
    });
  }
  return; // Explicit return to satisfy TS7030
});

/**
 * Endpoint para mapeamento de campos baseado em arquivo temporário
 *
 * Requer autenticação
 * Recebe: entityType (Contact, Company, etc.), mappings (array de mapeamentos)
 * Mapeamento: { columnIndex, fieldName, required }
 * Valida que campos existem na entidade
 * Retorna preview de mapeamento (primeiras 5 linhas)
 */
router.post('/:fileId/map', async (req: Request, res: Response) => {
  try {
    // tenantId e userId já devem estar disponíveis via middleware
    const tenantId = req.tenantId;
    const userId = req.userId;

    if (!tenantId || !userId) {
      return res.status(401).json({
        error: 'Não autorizado',
        message: 'Tenant ou usuário não identificado'
      });
    }

    const { fileId } = req.params;
    const { entityType, mappings, previewRowCount = 5 } = req.body;

    // Validar parâmetros
    if (!fileId) {
      return res.status(400).json({
        error: 'fileId é obrigatório',
        message: 'O ID do arquivo é necessário para o mapeamento'
      });
    }

    if (!entityType) {
      return res.status(400).json({
        error: 'entityType é obrigatório',
        message: 'O tipo da entidade é necessário para o mapeamento'
      });
    }

    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({
        error: 'mappings é obrigatório',
        message: 'É necessário fornecer pelo menos um mapeamento de campo'
      });
    }

    // Validar formato dos mapeamentos
    for (const [index, mapping] of mappings.entries()) {
      if (typeof mapping.columnIndex !== 'number' || mapping.columnIndex < 0) {
        return res.status(400).json({
          error: `Mapeamento inválido no índice ${index}`,
          message: 'columnIndex deve ser um número inteiro não negativo'
        });
      }

      if (!mapping.fieldName || typeof mapping.fieldName !== 'string') {
        return res.status(400).json({
          error: `Mapeamento inválido no índice ${index}`,
          message: 'fieldName é obrigatório e deve ser uma string'
        });
      }

      if (typeof mapping.required !== 'boolean') {
        return res.status(400).json({
          error: `Mapeamento inválido no índice ${index}`,
          message: 'required deve ser um valor booleano'
        });
      }
    }

    // Obter arquivo temporário
    const fileData = temporaryFileStorage.getFile(fileId);
    if (!fileData) {
      return res.status(404).json({
        error: 'Arquivo não encontrado',
        message: 'O arquivo especificado não existe ou expirou'
      });
    }

    // Verificar se o usuário tem acesso ao arquivo
    if (!temporaryFileStorage.validateAccess(fileId, userId, tenantId)) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Você não tem permissão para acessar este arquivo'
      });
    }

    // Determinar tipo de arquivo
    const fileName = fileData.metadata.originalName.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isXlsx = fileName.endsWith('.xlsx');
    const isXls = fileName.endsWith('.xls');

    if (!isCsv && !isXlsx && !isXls) {
      return res.status(400).json({
        error: 'Tipo de arquivo não suportado',
        message: 'Apenas arquivos CSV, XLSX e XLS são permitidos'
      });
    }

    // Parsear o arquivo para obter as linhas
    let rows: any[][] = [];
    if (isCsv) {
      // Parsear CSV
      const content = fileData.buffer.toString('utf8');
      const Papa = await import('papaparse');
      const result = Papa.default.parse(content, {
        header: false, // Não usar cabeçalhos para obter todas as linhas como arrays
        skipEmptyLines: true
      });
      rows = result.data as any[][];
    } else {
      // Parsear Excel
      const { parseExcel } = await import('../utils/excelParser');
      const result = await parseExcel(fileData.buffer, {
        sheetIndex: 0, // Usar primeira planilha por padrão
        header: false // Obter dados como arrays
      });
      rows = result.data as any[][];
    }

    // Validar mapeamento
    const { isValid: mappingValid, errors: mappingErrors } = await import('../utils/fieldMapper').then(fm =>
      fm.validateMapping(mappings, entityType, tenantId)
    );

    if (!mappingValid) {
      return res.status(400).json({
        error: 'Mapeamento inválido',
        message: 'Os mapeamentos fornecidos contêm erros',
        details: mappingErrors
      });
    }

    // Gerar preview de mapeamento
    const { generateMappingPreview } = await import('../utils/fieldMapper');
    const preview = await generateMappingPreview(
      rows,
      mappings,
      entityType,
      tenantId,
      previewRowCount
    );

    res.status(200).json({
      success: true,
      fileId,
      entityType,
      mappings,
      preview,
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      },
      timestamp: new Date()
    });
  } catch (error) {
    // Passar o erro para o middleware de tratamento de erros
    importExportErrorHandler(error as Error, req, res, () => {});
    return;
  }
  return; // Explicit return to satisfy TS7030
});

/**
 * Endpoint para processamento de importação (CSV ou Excel)
 */
router.post('/process', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // tenantId e userId já devem estar disponíveis via middleware
    const tenantId = req.tenantId;
    const userId = req.userId;

    if (!tenantId || !userId) {
      return res.status(401).json({
        error: 'Não autorizado',
        message: 'Tenant ou usuário não identificado'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Nenhum arquivo enviado',
        message: 'Por favor, envie um arquivo CSV ou Excel'
      });
    }

    // Obter opções de importação do body (fieldMapping pode vir como JSON string no multipart)
    let {
      entityType = 'contact',
      batchSize = 100,
      validateBeforeImport = true,
      continueOnError = true,
      fieldMapping = {},
      sheetName,
      sheetIndex = 0
    } = req.body;
    if (typeof fieldMapping === 'string') {
      try {
        fieldMapping = JSON.parse(fieldMapping);
      } catch {
        fieldMapping = {};
      }
    }

    // Validar tipo de entidade
    const validEntityTypes = ['contact', 'company', 'lead', 'opportunity'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        error: 'Tipo de entidade inválido',
        message: `Tipo de entidade deve ser um dos seguintes: ${validEntityTypes.join(', ')}`
      });
    }

    const file = req.file;
    if (!file.buffer) {
      return res.status(400).json({
        error: 'Arquivo inválido',
        message: 'O arquivo não contém dados válidos'
      });
    }

    // Determinar tipo de arquivo com base na extensão
    const fileName = file.originalname.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isXlsx = fileName.endsWith('.xlsx');
    const isXls = fileName.endsWith('.xls');

    if (!isCsv && !isXlsx && !isXls) {
      return res.status(400).json({
        error: 'Tipo de arquivo não suportado',
        message: 'Apenas arquivos CSV, XLSX e XLS são permitidos'
      });
    }

    const fileType: 'csv' | 'xlsx' | 'xls' = isCsv ? 'csv' : isXlsx ? 'xlsx' : 'xls';

    // Executar importação
    const importResult = await CsvImportService.importFromFile(file.buffer, {
      batchSize: parseInt(batchSize, 10) || 100,
      validateBeforeImport: validateBeforeImport === true,
      continueOnError: continueOnError !== false, // Valor padrão é true
      fieldMapping: fieldMapping || {},
      tenantId,
      userId,
      entityType,
      fileType,
      sheetName,
      sheetIndex: parseInt(sheetIndex, 10) || 0
    });

    res.status(200).json(importResult);
  } catch (error) {
    // Passar o erro para o middleware de tratamento de erros
    importExportErrorHandler(error as Error, req, res, () => {});
    return;
  }
  return; // Explicit return to satisfy TS7030
});

/**
 * Endpoint para consulta de status de importação
 * (Implementação futura para importações assíncronas)
 */
router.get('/status/:jobId', async (_req: Request, res: Response) => {
  try {
    // Por enquanto, retornamos um erro indicando que a funcionalidade
    // de importação assíncrona ainda não está implementada
    // Em uma implementação completa, isso consultaria um banco de dados
    // ou sistema de filas para obter o status do job

    res.status(501).json({
      error: 'Funcionalidade não implementada',
      message: 'Consulta de status de importação assíncrona não está disponível na versão atual'
    });
  } catch (error) {
    console.error('Erro ao consultar status de importação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao consultar status de importação'
    });
  }
  return; // Explicit return to satisfy TS7030
});

/**
 * Template de importação (Etapa 9 - Parte 9).
 * GET /api/import/templates/:entityType?format=csv|excel — retorna CSV/Excel com headers e linha de exemplo.
 * Requer autenticação (sem permissão especial).
 */
router.get('/templates/:entityType', getImportTemplate);

/**
 * Relatório completo de importação (spec itens 154-171).
 * GET /api/import/:importId/report — importId = jobId; requer autenticação.
 */
router.get('/:importId/report', getImportReport);

/**
 * Endpoint para upload de arquivos para importação
 *
 * Requer autenticação e permissão "Import.create"
 * Valida tipo de arquivo (CSV, XLSX, XLS)
 * Valida tamanho máximo (ex: 10MB)
 * Salva arquivo temporariamente
 * Retorna fileId para processamento
 */
router.post('/upload',
  checkImportPermission,  // Verificar permissão de importação
  uploadImportFile,       // Fazer upload do arquivo
  validateUploadedFile,   // Validar o arquivo após upload
  async (req: Request, res: Response) => {
    try {
      // tenantId e userId já devem estar disponíveis via middleware
      const tenantId = req.tenantId;
      const userId = req.userId;

      if (!tenantId || !userId) {
        return res.status(401).json({
          error: 'Não autorizado',
          message: 'Tenant ou usuário não identificado'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'Nenhum arquivo enviado',
          message: 'Por favor, envie um arquivo para importação'
        });
      }

      // Verificar se o buffer do arquivo existe
      if (!req.file.buffer) {
        return res.status(400).json({
          error: 'Arquivo inválido',
          message: 'O arquivo não contém dados válidos'
        });
      }

      // Verificar se o arquivo é potencialmente malicioso
      if (isPotentiallyMalicious(req.file.buffer, req.file.originalname)) {
        return res.status(400).json({
          error: 'Arquivo suspeito',
          message: 'O arquivo enviado parece conter conteúdo malicioso e foi rejeitado'
        });
      }

      // Validar conteúdo do arquivo
      const contentValidation = await validateFileContent(req.file.buffer, req.file.originalname);
      if (!contentValidation.valid) {
        return res.status(400).json({
          error: 'Conteúdo do arquivo inválido',
          message: 'O arquivo enviado não está no formato esperado',
          details: contentValidation.errors
        });
      }

      // Armazenar arquivo temporariamente
      const metadata = await temporaryFileStorage.storeFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        tenantId,
        userId,
        60 // TTL de 1 hora
      );

      // Retornar fileId e metadados
      res.status(200).json({
        message: 'Arquivo enviado com sucesso',
        fileId: metadata.fileId,
        originalName: metadata.originalName,
        size: metadata.size,
        mimeType: metadata.mimeType,
        expiresAt: metadata.expiresAt
      });
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Falha ao processar o upload do arquivo',
        details: (error as Error).message
      });
    }
    return; // Explicit return to satisfy TS7030
  }
);

export default router;