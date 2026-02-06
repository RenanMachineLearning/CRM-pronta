/**
 * Configuração de Breadcrumbs
 * Define o mapeamento de rotas para breadcrumbs
 */

export interface BreadcrumbItem {
  label: string;
  path: string;
  dynamic?: boolean;
  entityType?: 'contact' | 'company' | 'lead' | 'opportunity' | 'task' | 'note';
}

export type BreadcrumbConfig = Record<string, BreadcrumbItem[]>;

/**
 * Configuração estática de breadcrumbs
 * Rotas dinâmicas (com :id) são tratadas separadamente no hook
 */
export const breadcrumbConfig: BreadcrumbConfig = {
  // Dashboard
  '/': [{ label: 'Início', path: '/' }],

  // Contatos
  '/contacts': [
    { label: 'Início', path: '/' },
    { label: 'Contatos', path: '/contacts' },
  ],
  '/contacts/new': [
    { label: 'Início', path: '/' },
    { label: 'Contatos', path: '/contacts' },
    { label: 'Novo Contato', path: '/contacts/new' },
  ],

  // Empresas
  '/companies': [
    { label: 'Início', path: '/' },
    { label: 'Empresas', path: '/companies' },
  ],
  '/companies/new': [
    { label: 'Início', path: '/' },
    { label: 'Empresas', path: '/companies' },
    { label: 'Nova Empresa', path: '/companies/new' },
  ],

  // Leads
  '/leads': [
    { label: 'Início', path: '/' },
    { label: 'Leads', path: '/leads' },
  ],
  '/leads/new': [
    { label: 'Início', path: '/' },
    { label: 'Leads', path: '/leads' },
    { label: 'Novo Lead', path: '/leads/new' },
  ],

  // Oportunidades
  '/opportunities': [
    { label: 'Início', path: '/' },
    { label: 'Oportunidades', path: '/opportunities' },
  ],
  '/opportunities/new': [
    { label: 'Início', path: '/' },
    { label: 'Oportunidades', path: '/opportunities' },
    { label: 'Nova Oportunidade', path: '/opportunities/new' },
  ],

  // Tarefas
  '/tasks': [
    { label: 'Início', path: '/' },
    { label: 'Tarefas', path: '/tasks' },
  ],
  '/tasks/new': [
    { label: 'Início', path: '/' },
    { label: 'Tarefas', path: '/tasks' },
    { label: 'Nova Tarefa', path: '/tasks/new' },
  ],

  // Notas
  '/notes': [
    { label: 'Início', path: '/' },
    { label: 'Notas', path: '/notes' },
  ],
  '/notes/new': [
    { label: 'Início', path: '/' },
    { label: 'Notas', path: '/notes' },
    { label: 'Nova Nota', path: '/notes/new' },
  ],

  // Outras páginas
  '/import': [
    { label: 'Início', path: '/' },
    { label: 'Importar Dados', path: '/import' },
  ],
  '/search': [
    { label: 'Início', path: '/' },
    { label: 'Busca', path: '/search' },
  ],
  '/profile': [
    { label: 'Início', path: '/' },
    { label: 'Meu Perfil', path: '/profile' },
  ],
  '/design-system': [
    { label: 'Início', path: '/' },
    { label: 'Design System', path: '/design-system' },
  ],
};

/**
 * Configuração de rotas dinâmicas
 * Define como extrair o nome da entidade para breadcrumbs dinâmicos
 */
export interface DynamicRouteConfig {
  pattern: RegExp;
  parentPath: string;
  entityType: 'contact' | 'company' | 'lead' | 'opportunity' | 'task' | 'note';
  getLabel: (entityName: string) => string;
}

export const dynamicRouteConfigs: DynamicRouteConfig[] = [
  {
    pattern: /^\/contacts\/[^/]+$/,
    parentPath: '/contacts',
    entityType: 'contact',
    getLabel: (name) => name || 'Detalhes do Contato',
  },
  {
    pattern: /^\/contacts\/[^/]+\/edit$/,
    parentPath: '/contacts',
    entityType: 'contact',
    getLabel: (name) => `Editar: ${name || 'Contato'}`,
  },
  {
    pattern: /^\/companies\/[^/]+$/,
    parentPath: '/companies',
    entityType: 'company',
    getLabel: (name) => name || 'Detalhes da Empresa',
  },
  {
    pattern: /^\/companies\/[^/]+\/edit$/,
    parentPath: '/companies',
    entityType: 'company',
    getLabel: (name) => `Editar: ${name || 'Empresa'}`,
  },
  {
    pattern: /^\/leads\/[^/]+$/,
    parentPath: '/leads',
    entityType: 'lead',
    getLabel: (name) => name || 'Detalhes do Lead',
  },
  {
    pattern: /^\/leads\/[^/]+\/edit$/,
    parentPath: '/leads',
    entityType: 'lead',
    getLabel: (name) => `Editar: ${name || 'Lead'}`,
  },
  {
    pattern: /^\/opportunities\/[^/]+$/,
    parentPath: '/opportunities',
    entityType: 'opportunity',
    getLabel: (name) => name || 'Detalhes da Oportunidade',
  },
  {
    pattern: /^\/opportunities\/[^/]+\/edit$/,
    parentPath: '/opportunities',
    entityType: 'opportunity',
    getLabel: (name) => `Editar: ${name || 'Oportunidade'}`,
  },
  {
    pattern: /^\/tasks\/[^/]+$/,
    parentPath: '/tasks',
    entityType: 'task',
    getLabel: (name) => name || 'Detalhes da Tarefa',
  },
  {
    pattern: /^\/tasks\/[^/]+\/edit$/,
    parentPath: '/tasks',
    entityType: 'task',
    getLabel: (name) => `Editar: ${name || 'Tarefa'}`,
  },
  {
    pattern: /^\/notes\/[^/]+$/,
    parentPath: '/notes',
    entityType: 'note',
    getLabel: (name) => name || 'Detalhes da Nota',
  },
  {
    pattern: /^\/notes\/[^/]+\/edit$/,
    parentPath: '/notes',
    entityType: 'note',
    getLabel: (name) => `Editar: ${name || 'Nota'}`,
  },
];
