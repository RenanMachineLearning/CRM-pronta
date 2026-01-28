/**
 * Middleware de upload de arquivos
 * 
 * Implementa validações de segurança e processamento de uploads
 */

import { Request, Response, NextFunction } from 'express';
import { uploadConfig } from '../config/multerConfig';
import { isValidExcelBuffer } from '../utils/excelParser';
import { validateCsvFormat } from '../utils/csvValidator';

// Middleware para upload de arquivos de importação
export const uploadImportFile = uploadConfig.single('file');

// Middleware de validação adicional de conteúdo
export const validateUploadedFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar se o arquivo foi enviado
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

    // Validar conteúdo do arquivo com base na extensão
    const fileName = req.file.originalname.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isXlsx = fileName.endsWith('.xlsx');
    const isXls = fileName.endsWith('.xls');

    if (!isCsv && !isXlsx && !isXls) {
      return res.status(400).json({
        error: 'Tipo de arquivo não suportado',
        message: 'Apenas arquivos CSV, XLSX e XLS são permitidos'
      });
    }

    // Validar conteúdo do arquivo
    if (isCsv) {
      // Validar formato CSV
      const content = req.file.buffer.toString('utf8');
      const csvValidation = validateCsvFormat(content);

      if (!csvValidation.valid) {
        return res.status(400).json({
          error: 'Formato de CSV inválido',
          message: 'O arquivo CSV não está no formato correto',
          details: csvValidation.errors
        });
      }
    } else {
      // Validar formato Excel
      const excelValidation = isValidExcelBuffer(req.file.buffer);

      if (!excelValidation) {
        return res.status(400).json({
          error: 'Formato de Excel inválido',
          message: 'O arquivo Excel não está no formato correto ou está corrompido'
        });
      }
    }

    // Se tudo estiver válido, continuar
    next();
  } catch (error) {
    console.error('Erro na validação do arquivo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Falha na validação do arquivo enviado'
    });
  }
  return; // Explicit return to satisfy TS7030
};

// Middleware para verificar permissões de importação
export const checkImportPermission = (req: Request, res: Response, next: NextFunction) => {
  // Verificar se o usuário tem permissão para criar importações
  // Esta verificação assume que o middleware de autenticação já foi executado
  // e que req.user e req.tenant estão disponíveis

  // Em uma implementação completa, verificaríamos as permissões do usuário
  // usando o sistema de ACL existente

  // Por enquanto, apenas verificamos se o usuário está autenticado e tem tenant
  if (!req.userId || !req.tenantId) {
    return res.status(401).json({
      error: 'Não autorizado',
      message: 'Usuário não autenticado ou sem contexto de tenant'
    });
  }

  // Prosseguir para o próximo middleware
  next();
  return; // Explicit return to satisfy TS7030
};

/**
 * Middleware para verificar permissão de exportação (Export.create).
 * Mesmo padrão de checkImportPermission: exige autenticação + tenant.
 * Em implementação completa, validar permissão "Export.create" via ACL.
 */
export const checkExportPermission = (req: Request, res: Response, next: NextFunction) => {
  if (!req.userId || !req.tenantId) {
    return res.status(401).json({
      error: 'Não autorizado',
      message: 'Usuário não autenticado ou sem contexto de tenant'
    });
  }
  next();
  return;
};