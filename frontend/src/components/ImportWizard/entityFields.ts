/**
 * Campos disponíveis por entidade para mapeamento (Etapa 9 - Parte 10).
 * Alinhado ao backend FieldMetadataService / templates.
 */

export const ENTITY_OPTIONS = [
  { value: 'Contact', label: 'Contato' },
  { value: 'Company', label: 'Empresa' },
  { value: 'Lead', label: 'Lead' },
  { value: 'Opportunity', label: 'Oportunidade' },
] as const;

export type EntityType = (typeof ENTITY_OPTIONS)[number]['value'];

export const ENTITY_FIELDS: Record<string, Array<{ value: string; label: string; required?: boolean }>> = {
  Contact: [
    { value: 'firstName', label: 'Primeiro Nome', required: true },
    { value: 'lastName', label: 'Último Nome' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telefone' },
    { value: 'title', label: 'Cargo' },
    { value: 'company', label: 'Empresa' },
    { value: 'notes', label: 'Notas' },
  ],
  Company: [
    { value: 'name', label: 'Nome', required: true },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telefone' },
    { value: 'website', label: 'Website' },
    { value: 'industry', label: 'Indústria' },
    { value: 'size', label: 'Porte' },
    { value: 'notes', label: 'Notas' },
  ],
  Lead: [
    { value: 'firstName', label: 'Primeiro Nome', required: true },
    { value: 'lastName', label: 'Último Nome' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telefone' },
    { value: 'company', label: 'Empresa' },
    { value: 'status', label: 'Status' },
    { value: 'source', label: 'Origem' },
    { value: 'notes', label: 'Notas' },
  ],
  Opportunity: [
    { value: 'name', label: 'Nome', required: true },
    { value: 'value', label: 'Valor' },
    { value: 'probability', label: 'Probabilidade (%)' },
    { value: 'closeDate', label: 'Data de Fechamento' },
    { value: 'stageId', label: 'Estágio' },
    { value: 'status', label: 'Status' },
    { value: 'notes', label: 'Notas' },
  ],
};
