/**
 * Configuração do Multer para upload de arquivos
 * 
 * Define as configurações para upload de arquivos CSV e Excel
 */

import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Configuração de armazenamento em memória
export const uploadMemoryStorage = multer.memoryStorage();

// Configuração de armazenamento em disco (opcional)
export const uploadDiskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Pasta temporária para uploads
    cb(null, 'uploads/temp/');
  },
  filename: function (req, file, cb) {
    // Gerar nome único para o arquivo
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const fileExtension = path.extname(file.originalname);
    cb(null, `${uuidv4()}${fileExtension}`);
  }
});

// Tipos de arquivos permitidos
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream' // Para alguns arquivos XLS
];

// Extensões permitidas
const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

// Tamanho máximo do arquivo (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB em bytes

// Função para validar tipo de arquivo
export const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Verificar tipo MIME
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new Error('Tipo de arquivo não suportado. Apenas CSV e Excel são permitidos.'));
    return;
  }

  // Verificar extensão do arquivo
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    cb(new Error('Extensão de arquivo não suportada. Apenas .csv, .xlsx e .xls são permitidos.'));
    return;
  }

  // Sanitizar nome do arquivo para prevenir path traversal
  const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  file.originalname = sanitizedName;

  // Aceitar o arquivo
  cb(null, true);
};

// Configuração do Multer com validações
export const uploadConfig = multer({
  storage: uploadMemoryStorage, // Usar armazenamento em memória para processamento imediato
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Apenas um arquivo por requisição
  },
  fileFilter: fileFilter
});

// Configuração alternativa para disco (se necessário para arquivos maiores)
export const uploadConfigDisk = multer({
  storage: uploadDiskStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: fileFilter
});