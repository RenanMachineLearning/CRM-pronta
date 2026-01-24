/**
 * Serviço para gerenciamento de uploads temporários
 * 
 * Responsável por:
 * - Armazenar arquivos temporários em memória ou disco
 * - Gerenciar metadados dos uploads
 * - Implementar limpeza automática de arquivos expirados
 * - Garantir isolamento por tenant
 */

import { v4 as uuidv4 } from 'uuid';
// import { promises as fs } from 'fs';  // Unused import commented out
// import path from 'path';  // Unused import commented out
import { isValidExcelBuffer } from '../utils/excelParser';
import { validateCsvFormat } from '../utils/csvValidator';

// Interface para metadados de upload
export interface UploadMetadata {
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  tenantId: string;
  userId: string;
  uploadedAt: Date;
  expiresAt: Date;
  filePath?: string; // Caminho físico se armazenado em disco
  processed: boolean; // Indica se o arquivo já foi processado
}

// Armazenamento temporário em memória (poderia ser substituído por Redis em produção)
class TemporaryFileStorage {
  private files: Map<string, Buffer> = new Map();
  private metadata: Map<string, UploadMetadata> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Iniciar limpeza automática a cada 10 minutos
    this.startCleanup();
  }

  // Armazenar arquivo temporário
  async storeFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    tenantId: string,
    userId: string,
    ttlMinutes: number = 60 // Tempo de vida padrão: 1 hora
  ): Promise<UploadMetadata> {
    const fileId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    // Armazenar o buffer
    this.files.set(fileId, fileBuffer);

    // Criar metadados
    const metadata: UploadMetadata = {
      fileId,
      originalName,
      mimeType,
      size: fileBuffer.length,
      tenantId,
      userId,
      uploadedAt: now,
      expiresAt,
      processed: false
    };

    // Armazenar metadados
    this.metadata.set(fileId, metadata);

    return metadata;
  }

  // Obter arquivo temporário
  getFile(fileId: string): { buffer: Buffer; metadata: UploadMetadata } | null {
    const buffer = this.files.get(fileId);
    const metadata = this.metadata.get(fileId);

    if (!buffer || !metadata) {
      return null;
    }

    // Verificar se o arquivo expirou
    if (new Date() > metadata.expiresAt) {
      this.removeFile(fileId);
      return null;
    }

    return { buffer, metadata };
  }

  // Marcar arquivo como processado
  markAsProcessed(fileId: string): boolean {
    const metadata = this.metadata.get(fileId);
    if (!metadata) {
      return false;
    }

    metadata.processed = true;
    this.metadata.set(fileId, metadata);
    return true;
  }

  // Remover arquivo temporário
  removeFile(fileId: string): boolean {
    const existed = this.files.has(fileId) || this.metadata.has(fileId);
    
    this.files.delete(fileId);
    this.metadata.delete(fileId);
    
    return existed;
  }

  // Limpar arquivos expirados
  cleanupExpired(): void {
    const now = new Date();
    const expiredFiles: string[] = [];

    for (const [fileId, metadata] of this.metadata.entries()) {
      if (now > metadata.expiresAt) {
        expiredFiles.push(fileId);
      }
    }

    for (const fileId of expiredFiles) {
      this.removeFile(fileId);
    }

    console.log(`Limpeza de arquivos expirados: ${expiredFiles.length} arquivos removidos`);
  }

  // Iniciar limpeza automática
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 10 * 60 * 1000); // A cada 10 minutos
  }

  // Parar limpeza automática (para testes ou shutdown)
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Obter metadados de um arquivo
  getMetadata(fileId: string): UploadMetadata | null {
    const metadata = this.metadata.get(fileId);
    
    if (!metadata) {
      return null;
    }

    // Verificar se o arquivo expirou
    if (new Date() > metadata.expiresAt) {
      this.removeFile(fileId);
      return null;
    }

    return metadata;
  }

  // Validar se o usuário tem acesso ao arquivo
  validateAccess(fileId: string, userId: string, tenantId: string): boolean {
    const metadata = this.getMetadata(fileId);
    
    if (!metadata) {
      return false;
    }

    // Verificar se o arquivo pertence ao tenant e usuário corretos
    return metadata.tenantId === tenantId && metadata.userId === userId;
  }
}

// Instância singleton do armazenamento temporário
export const temporaryFileStorage = new TemporaryFileStorage();

// Função para validar conteúdo do arquivo
export async function validateFileContent(
  fileBuffer: Buffer,
  fileName: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  let valid = true;

  try {
    const lowerFileName = fileName.toLowerCase();
    const isCsv = lowerFileName.endsWith('.csv');
    const isXlsx = lowerFileName.endsWith('.xlsx');
    const isXls = lowerFileName.endsWith('.xls');

    if (isCsv) {
      // Validar formato CSV
      const content = fileBuffer.toString('utf8');
      const csvValidation = validateCsvFormat(content);
      
      if (!csvValidation.valid) {
        errors.push(...csvValidation.errors);
        valid = false;
      }
    } else if (isXlsx || isXls) {
      // Validar formato Excel
      if (!isValidExcelBuffer(fileBuffer)) {
        errors.push('O arquivo Excel está corrompido ou não é um arquivo Excel válido');
        valid = false;
      }
    } else {
      errors.push('Tipo de arquivo não suportado');
      valid = false;
    }
  } catch (error) {
    errors.push(`Erro ao validar conteúdo do arquivo: ${(error as Error).message}`);
    valid = false;
  }

  return { valid, errors };
}

// Função para sanitizar nome de arquivo
export function sanitizeFileName(fileName: string): string {
  // Remover caracteres potencialmente perigosos
  // Permitir apenas letras, números, pontos, traços e underscores
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Função para detectar se o arquivo parece malicioso
export function isPotentiallyMalicious(fileBuffer: Buffer, _fileName: string): boolean {
  // Verificar por assinaturas de vírus ou conteúdo malicioso básico
  const suspiciousPatterns = [
    /<script/i,  // Possível XSS
    /<iframe/i,  // Possível XSS
    /javascript:/i,  // Possível XSS
    /vbscript:/i,  // Possível script malicioso
    /\x4D\x5A/,  // Assinatura de arquivo executável (MZ)
    /\x50\x4B/,  // Assinatura de arquivo ZIP (PK) - pode ser legítimo mas verificar
  ];

  const fileString = fileBuffer.toString('utf8', 0, 1024); // Checar apenas os primeiros 1KB

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fileString)) {
      return true;
    }
  }

  return false;
}