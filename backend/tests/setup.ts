/**
 * Setup global para testes
 * Configura variáveis de ambiente e prepara o ambiente de teste
 */

import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.test' });

// Configurações padrão para testes
process.env.NODE_ENV = 'test';

