/**
 * Rotas de importação de CSV
 * 
 * Implementa endpoints para:
 * - Upload e validação de arquivos CSV
 * - Mapeamento de campos
 * - Processamento de importação
 * - Consulta de status de importação
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { CsvImportService } from '../services/csvImportService';
import { validateCsvFormat } from '../utils/csvValidator';

// Configuração do multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(), // Armazenar em memória para processamento
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1 // Apenas um arquivo por vez
  },
  fileFilter: (req, file, cb) => {
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
 * Endpoint para upload e validação inicial de arquivo CSV
 */
router.post('/validate', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // Verificar se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({
        error: 'Nenhum arquivo enviado',
        message: 'Por favor, envie um arquivo CSV'
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
    // (esta implementação assume que temos uma função parseCSV que já foi implementada)
    // Por enquanto, retornaremos apenas uma confirmação básica
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    
    res.status(200).json({
      message: 'Arquivo CSV válido',
      rows: lines.length - 1, // Menos 1 para desconsiderar o cabeçalho
      columns: headers.length,
      headers: headers.map(h => h.trim())
    });
  } catch (error) {
    console.error('Erro ao validar arquivo CSV:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao validar arquivo CSV'
    });
  }
});

/**
 * Endpoint para mapeamento de campos
 * Retorna sugestões de mapeamento com base nos headers do CSV
 */
router.post('/map-fields', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Nenhum arquivo enviado',
        message: 'Por favor, envie um arquivo CSV'
      });
    }

    const file = req.file;
    if (!file.buffer) {
      return res.status(400).json({
        error: 'Arquivo inválido',
        message: 'O arquivo não contém dados válidos'
      });
    }

    // Parsear o CSV para obter os headers
    const content = file.buffer.toString('utf8');
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    // Mapeamento sugerido com base nos nomes dos campos
    const suggestedMapping: { [csvField: string]: string } = {};
    
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
      } else {
        // Campo não reconhecido, manter o mesmo nome
        suggestedMapping[header] = header;
      }
    });

    res.status(200).json({
      headers,
      suggestedMapping,
      entityType: 'contact' // Tipo padrão, pode ser alterado pelo usuário
    });
  } catch (error) {
    console.error('Erro ao mapear campos CSV:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao mapear campos do CSV'
    });
  }
});

/**
 * Endpoint para processamento de importação
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
        message: 'Por favor, envie um arquivo CSV'
      });
    }

    // Obter opções de importação do body
    const {
      entityType = 'contact',
      batchSize = 100,
      validateBeforeImport = true,
      continueOnError = true,
      fieldMapping = {}
    } = req.body;

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

    // Executar importação
    const importResult = await CsvImportService.importFromCsv(file.buffer, {
      batchSize: parseInt(batchSize, 10) || 100,
      validateBeforeImport: validateBeforeImport === true,
      continueOnError: continueOnError !== false, // Valor padrão é true
      fieldMapping: fieldMapping || {},
      tenantId,
      userId,
      entityType
    });

    res.status(200).json(importResult);
  } catch (error) {
    console.error('Erro ao processar importação CSV:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha ao processar importação CSV',
      details: (error as Error).message
    });
  }
});

/**
 * Endpoint para consulta de status de importação
 * (Implementação futura para importações assíncronas)
 */
router.get('/status/:jobId', async (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId;
    
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
});

export default router;