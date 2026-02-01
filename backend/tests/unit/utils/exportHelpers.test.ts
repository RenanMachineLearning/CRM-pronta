/**
 * Testes unitários para geração de CSV/Excel
 * 
 * Testa a funcionalidade de geração de arquivos para exportação
 */

import { generateCSV, generateExcel } from '../../../src/utils/exportHelpers';

describe('Geração de CSV - Testes Unitários', () => {
  it('deve gerar CSV com cabeçalhos e dados corretos', () => {
    const data = [
      { firstName: 'João', lastName: 'Silva', email: 'joao@email.com' },
      { firstName: 'Maria', lastName: 'Souza', email: 'maria@email.com' }
    ];
    
    const fields = ['firstName', 'lastName', 'email'];
    
    const csvBuffer = generateCSV(data, fields);
    const csvString = csvBuffer.toString('utf8');
    
    // Verificar se o CSV contém os cabeçalhos
    expect(csvString).toContain('firstName,lastName,email');
    // Verificar se contém os dados
    expect(csvString).toContain('João,Silva,joao@email.com');
    expect(csvString).toContain('Maria,Souza,maria@email.com');
  });

  it('deve gerar CSV com campos em ordem específica', () => {
    const data = [
      { firstName: 'João', lastName: 'Silva', email: 'joao@email.com' }
    ];
    
    // Especificar campos em ordem diferente
    const fields = ['email', 'firstName', 'lastName'];
    
    const csvBuffer = generateCSV(data, fields);
    const csvString = csvBuffer.toString('utf8');
    
    // Verificar se os cabeçalhos estão na ordem correta
    expect(csvString.startsWith('email,firstName,lastName')).toBe(true);
    // Verificar se os dados seguem a mesma ordem
    expect(csvString).toContain('joao@email.com,João,Silva');
  });

  it('deve lidar com campos ausentes', () => {
    const data = [
      { firstName: 'João', lastName: 'Silva' }, // Sem email
      { firstName: 'Maria', email: 'maria@email.com' } // Sem lastName
    ];
    
    const fields = ['firstName', 'lastName', 'email'];
    
    const csvBuffer = generateCSV(data, fields);
    const csvString = csvBuffer.toString('utf8');
    
    // Verificar se o CSV contém os cabeçalhos
    expect(csvString).toContain('firstName,lastName,email');
    // Verificar se os dados ausentes são tratados como vazios
    expect(csvString).toContain('João,Silva,');
    expect(csvString).toContain('Maria,,maria@email.com');
  });

  it('deve escapar valores com vírgulas e aspas', () => {
    const data = [
      { firstName: 'João', description: 'Cliente, VIP, com desconto especial' },
      { firstName: 'Maria', description: 'Cliente "premium"' }
    ];
    
    const fields = ['firstName', 'description'];
    
    const csvBuffer = generateCSV(data, fields);
    const csvString = csvBuffer.toString('utf8');
    
    // Verificar se valores com vírgulas são envoltos em aspas
    expect(csvString).toContain('"Cliente, VIP, com desconto especial"');
    // Verificar se aspas são escapadas
    expect(csvString).toContain('"Cliente ""premium"""');
  });

  it('deve gerar CSV com dados vazios', () => {
    const data: any[] = []; // Array vazio
    const fields = ['firstName', 'lastName', 'email'];
    
    const csvBuffer = generateCSV(data, fields);
    const csvString = csvBuffer.toString('utf8');
    
    // Deve conter apenas os cabeçalhos
    expect(csvString).toBe('firstName,lastName,email\n');
  });

  it('deve gerar CSV com campos vazios', () => {
    const data = [
      { firstName: '', lastName: '', email: '' }
    ];
    
    const fields = ['firstName', 'lastName', 'email'];
    
    const csvBuffer = generateCSV(data, fields);
    const csvString = csvBuffer.toString('utf8');
    
    expect(csvString).toContain(',,\n');
  });
});

describe('Geração de Excel - Testes Unitários', () => {
  it('deve gerar arquivo Excel com dados corretos', () => {
    const data = [
      { firstName: 'João', lastName: 'Silva', email: 'joao@email.com' },
      { firstName: 'Maria', lastName: 'Souza', email: 'maria@email.com' }
    ];
    
    const fields = ['firstName', 'lastName', 'email'];
    
    // O teste verificará se a função não lança exceção e retorna um buffer
    const excelBuffer = generateExcel(data, fields);
    
    // Verificar se o retorno é um Buffer
    expect(Buffer.isBuffer(excelBuffer)).toBe(true);
    // Verificar se o buffer tem algum conteúdo
    expect(excelBuffer.length).toBeGreaterThan(0);
  });

  it('deve gerar Excel com campos em ordem específica', () => {
    const data = [
      { firstName: 'João', lastName: 'Silva', email: 'joao@email.com' }
    ];
    
    // Especificar campos em ordem diferente
    const fields = ['email', 'firstName', 'lastName'];
    
    const excelBuffer = generateExcel(data, fields);
    
    // Verificar se o retorno é um Buffer
    expect(Buffer.isBuffer(excelBuffer)).toBe(true);
    expect(excelBuffer.length).toBeGreaterThan(0);
  });

  it('deve lidar com dados vazios na geração de Excel', () => {
    const data: any[] = []; // Array vazio
    const fields = ['firstName', 'lastName', 'email'];
    
    const excelBuffer = generateExcel(data, fields);
    
    // Verificar se o retorno é um Buffer
    expect(Buffer.isBuffer(excelBuffer)).toBe(true);
    // Mesmo vazio, deve ter estrutura básica de um arquivo Excel
    expect(excelBuffer.length).toBeGreaterThan(0);
  });

  it('deve lidar com campos ausentes na geração de Excel', () => {
    const data = [
      { firstName: 'João', lastName: 'Silva' }, // Sem email
      { firstName: 'Maria', email: 'maria@email.com' } // Sem lastName
    ];
    
    const fields = ['firstName', 'lastName', 'email'];
    
    const excelBuffer = generateExcel(data, fields);
    
    // Verificar se o retorno é um Buffer
    expect(Buffer.isBuffer(excelBuffer)).toBe(true);
    expect(excelBuffer.length).toBeGreaterThan(0);
  });

  it('deve gerar Excel com diferentes tipos de dados', () => {
    const data = [
      {
        firstName: 'João',
        age: 30,
        isActive: true,
        registrationDate: new Date('2023-01-01'),
        balance: 1234.56
      }
    ];
    
    const fields = ['firstName', 'age', 'isActive', 'registrationDate', 'balance'];
    
    const excelBuffer = generateExcel(data, fields);
    
    // Verificar se o retorno é um Buffer
    expect(Buffer.isBuffer(excelBuffer)).toBe(true);
    expect(excelBuffer.length).toBeGreaterThan(0);
  });
});