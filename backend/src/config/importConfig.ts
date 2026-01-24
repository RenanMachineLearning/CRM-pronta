/**
 * Configurações de importação para produção
 * 
 * Define limites, timeouts e configurações de segurança para processamento
 * de importação de dados em lote.
 */

export const IMPORT_CONFIG = {
  // Limites para processamento síncrono
  SYNC_THRESHOLD_ROWS: 1000,           // Limite de linhas para processamento síncrono
  SYNC_THRESHOLD_SIZE: 5 * 1024 * 1024, // 5MB em bytes - Limite de tamanho para processamento síncrono
  
  // Configurações de batch
  BATCH_SIZE: 100,                     // Tamanho padrão de batch
  MAX_BATCH_SIZE: 500,                 // Limite máximo de registros por batch
  MIN_BATCH_SIZE: 10,                  // Tamanho mínimo de batch para eficiência
  
  // Timeouts
  TIMEOUT_SYNC: 60000,                 // 60 segundos para processos síncronos
  TIMEOUT_ASYNC: 1800000,              // 30 minutos por job assíncrono
  TIMEOUT_BATCH: 30000,                // 30 segundos por batch
  
  // Configurações de concorrência
  MAX_CONCURRENT_BATCHES: 3,           // Processamento paralelo seguro
  MAX_CONCURRENT_JOBS: 5,              // Número máximo de jobs assíncronos simultâneos
  
  // Limites de segurança
  MAX_FILE_SIZE: 50 * 1024 * 1024,    // 50MB - Limite absoluto de upload
  MAX_ROWS_PER_IMPORT: 100000,         // Limite para prevenir sobrecarga
  MEMORY_LIMIT: 512 * 1024 * 1024,    // 512MB - Limite de memória por processo
  
  // Configurações de retry
  RETRY_ATTEMPTS: 3,                   // Tentativas para jobs assíncronos
  RETRY_DELAY: 5000,                   // Intervalo entre tentativas (5 segundos)
  RETRY_BACKOFF_FACTOR: 2,             // Fator de backoff exponencial
  
  // Limites de validação
  MAX_ERRORS_PER_IMPORT: 1000,         // Limite de erros para evitar overflow
  MAX_WARNINGS_PER_IMPORT: 500,        // Limite de avisos
  
  // Configurações de desempenho
  BATCH_PROCESSING_PARALLELISM: 2,     // Número de batches processados em paralelo
  VALIDATION_CACHE_TTL: 300000,        // 5 minutos - TTL para cache de validações
  RESULT_CACHE_TTL: 3600000,           // 1 hora - TTL para cache de resultados
  
  // Configurações de auditoria
  AUDIT_LOG_RETENTION_DAYS: 90,        // Dias para retenção de logs de auditoria
  JOB_HISTORY_RETENTION_DAYS: 30,      // Dias para retenção de histórico de jobs
  
  // Configurações de prioridade
  DEFAULT_JOB_PRIORITY: 'normal' as const,
  
  // Configurações de segurança
  ENABLE_DUPLICATE_DETECTION: true,    // Habilitar detecção de duplicatas
  ENABLE_UNIQUENESS_VALIDATION: true,  // Habilitar validação de unicidade
  ENABLE_MALICIOUS_CONTENT_CHECK: true, // Habilitar verificação de conteúdo malicioso
};

// Configurações específicas por tipo de entidade
export const ENTITY_IMPORT_CONFIG: Record<string, {
  maxBatchSize: number;
  enableUpsert: boolean;
  validateUniqueness: boolean;
}> = {
  Contact: {
    maxBatchSize: 200,
    enableUpsert: true,
    validateUniqueness: true,
  },
  Company: {
    maxBatchSize: 150,
    enableUpsert: true,
    validateUniqueness: true,
  },
  Lead: {
    maxBatchSize: 100,
    enableUpsert: true,
    validateUniqueness: true,
  },
  Opportunity: {
    maxBatchSize: 80,
    enableUpsert: true,
    validateUniqueness: true,
  },
  Task: {
    maxBatchSize: 300,
    enableUpsert: false,
    validateUniqueness: false,
  },
  Note: {
    maxBatchSize: 300,
    enableUpsert: false,
    validateUniqueness: false,
  },
};

// Função para obter configurações específicas por tipo de entidade
export function getEntityImportConfig(entityType: string) {
  return ENTITY_IMPORT_CONFIG[entityType] || {
    maxBatchSize: IMPORT_CONFIG.BATCH_SIZE,
    enableUpsert: true,
    validateUniqueness: true,
  };
}