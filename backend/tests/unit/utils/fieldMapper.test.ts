/**
 * Testes unitários para mapeamento de campos
 * 
 * Testa a funcionalidade de mapeamento de campos entre arquivos de importação e campos da entidade
 */

import { validateMapping, generateMappingPreview } from '../../../src/utils/fieldMapper';

describe('Mapeamento de Campos - Testes Unitários', () => {
  const mockTenantId = 'test-tenant';
  const mockUserId = 'test-user';

  it('deve validar mapeamento válido para entidade Contact', async () => {
    const mappings = [
      { columnIndex: 0, fieldName: 'firstName', required: true },
      { columnIndex: 1, fieldName: 'lastName', required: false },
      { columnIndex: 2, fieldName: 'email', required: false }
    ];
    
    const entityType = 'Contact';
    
    const { isValid, errors } = await validateMapping(mappings, entityType, mockTenantId, mockUserId);
    
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('deve rejeitar mapeamento com campos inexistentes', async () => {
    const mappings = [
      { columnIndex: 0, fieldName: 'campoInexistente', required: true },
      { columnIndex: 1, fieldName: 'outroCampoInvalido', required: false }
    ];
    
    const entityType = 'Contact';
    
    const { isValid, errors } = await validateMapping(mappings, entityType, mockTenantId, mockUserId);
    
    expect(isValid).toBe(false);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('campoInexistente');
    expect(errors[1]).toContain('outroCampoInvalido');
  });

  it('deve rejeitar mapeamento duplicado de campos obrigatórios', async () => {
    const mappings = [
      { columnIndex: 0, fieldName: 'firstName', required: true },
      { columnIndex: 1, fieldName: 'firstName', required: true } // Duplicado
    ];
    
    const entityType = 'Contact';
    
    const { isValid, errors } = await validateMapping(mappings, entityType, mockTenantId, mockUserId);
    
    expect(isValid).toBe(false);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('firstName');
  });

  it('deve gerar preview de mapeamento corretamente', async () => {
    const rows = [
      ['João', 'Silva', 'joao@email.com'],
      ['Maria', 'Souza', 'maria@email.com']
    ];
    
    const mappings = [
      { columnIndex: 0, fieldName: 'firstName', required: true },
      { columnIndex: 1, fieldName: 'lastName', required: false },
      { columnIndex: 2, fieldName: 'email', required: false }
    ];
    
    const entityType = 'Contact';
    const previewRowCount = 2;
    
    const preview = await generateMappingPreview(
      rows,
      mappings,
      entityType,
      mockTenantId,
      mockUserId,
      previewRowCount
    );
    
    expect(preview).toHaveLength(2);
    expect(preview[0]).toEqual({
      firstName: 'João',
      lastName: 'Silva',
      email: 'joao@email.com'
    });
    expect(preview[1]).toEqual({
      firstName: 'Maria',
      lastName: 'Souza',
      email: 'maria@email.com'
    });
  });

  it('deve gerar preview com campos opcionais ausentes', async () => {
    const rows = [
      ['João', '', 'joao@email.com'], // Sobrenome ausente
      ['Maria', 'Souza', '']          // Email ausente
    ];
    
    const mappings = [
      { columnIndex: 0, fieldName: 'firstName', required: true },
      { columnIndex: 1, fieldName: 'lastName', required: false },
      { columnIndex: 2, fieldName: 'email', required: false }
    ];
    
    const entityType = 'Contact';
    const previewRowCount = 2;
    
    const preview = await generateMappingPreview(
      rows,
      mappings,
      entityType,
      mockTenantId,
      mockUserId,
      previewRowCount
    );
    
    expect(preview).toHaveLength(2);
    expect(preview[0]).toEqual({
      firstName: 'João',
      lastName: '',
      email: 'joao@email.com'
    });
    expect(preview[1]).toEqual({
      firstName: 'Maria',
      lastName: 'Souza',
      email: ''
    });
  });

  it('deve lidar com mapeamento de campos personalizados', async () => {
    const rows = [
      ['João', 'Silva', 'VIP']
    ];
    
    const mappings = [
      { columnIndex: 0, fieldName: 'firstName', required: true },
      { columnIndex: 1, fieldName: 'lastName', required: false },
      { columnIndex: 2, fieldName: 'categoria_cliente', required: false } // Campo personalizado
    ];
    
    const entityType = 'Contact';
    const previewRowCount = 1;
    
    // Este teste verificará se o sistema lida com campos personalizados
    // O comportamento real dependerá da implementação do fieldMapper
    const preview = await generateMappingPreview(
      rows,
      mappings,
      entityType,
      mockTenantId,
      mockUserId,
      previewRowCount
    );
    
    expect(preview).toHaveLength(1);
    expect(preview[0]).toEqual({
      firstName: 'João',
      lastName: 'Silva',
      categoria_cliente: 'VIP'
    });
  });

  it('deve validar mapeamento para diferentes entidades', async () => {
    const mappings = [
      { columnIndex: 0, fieldName: 'name', required: true },
      { columnIndex: 1, fieldName: 'industry', required: false }
    ];
    
    // Testar com entidade Company
    const { isValid: isValidCompany } = await validateMapping(mappings, 'Company', mockTenantId, mockUserId);
    expect(isValidCompany).toBe(true);
    
    // Testar com entidade Lead
    const { isValid: isValidLead } = await validateMapping(mappings, 'Lead', mockTenantId, mockUserId);
    expect(isValidLead).toBe(true);
  });
});