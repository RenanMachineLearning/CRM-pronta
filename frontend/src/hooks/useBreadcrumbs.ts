/**
 * Hook useBreadcrumbs
 * Gera breadcrumbs dinâmicos baseado na URL atual
 * Suporta rotas estáticas e dinâmicas (com :id)
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { breadcrumbConfig, dynamicRouteConfigs, type BreadcrumbItem } from '../config/breadcrumbs';

// Cache simples para nomes de entidades (evita requisições repetidas)
const entityNameCache: Record<string, string> = {};

/**
 * Extrai o nome da entidade do cache ou retorna default
 */
function getEntityNameFromCache(entityType: string, entityId: string): string | null {
  const cacheKey = `${entityType}-${entityId}`;
  return entityNameCache[cacheKey] || null;
}

/**
 * Busca o nome da entidade na página (via DOM)
 * Esta é uma solução temporária - em produção, use um contexto global
 */
function getEntityNameFromDOM(): string | null {
  // Tenta encontrar o título da página (h1 ou h2)
  const titleElement = document.querySelector('h1, h2');
  if (titleElement) {
    return titleElement.textContent?.trim() || null;
  }
  return null;
}

export interface BreadcrumbData {
  items: BreadcrumbItem[];
  isLoading: boolean;
}

export function useBreadcrumbs(): BreadcrumbData {
  const location = useLocation();
  const currentPath = location.pathname;

  const breadcrumbs = useMemo((): BreadcrumbData => {
    // 1. Verifica se é uma rota estática configurada
    if (breadcrumbConfig[currentPath]) {
      return {
        items: breadcrumbConfig[currentPath],
        isLoading: false,
      };
    }

    // 2. Verifica se é uma rota dinâmica
    for (const config of dynamicRouteConfigs) {
      // Testa o padrão RegExp diretamente
      const regexMatch = currentPath.match(config.pattern);
      if (regexMatch) {
        // Extrai o ID da URL (último segmento antes de /edit ou o último segmento)
        const pathParts = currentPath.split('/');
        const entityId = pathParts[pathParts.length - 1] === 'edit' 
          ? pathParts[pathParts.length - 2] 
          : pathParts[pathParts.length - 1];
        
        // Tenta obter o nome do cache ou DOM
        let entityName = getEntityNameFromCache(config.entityType, entityId);
        
        if (!entityName) {
          entityName = getEntityNameFromDOM();
        }

        // Se não encontrou, usa um placeholder temporário
        if (!entityName) {
          entityName = config.entityType === 'contact' ? 'Carregando contato...' :
                      config.entityType === 'company' ? 'Carregando empresa...' :
                      config.entityType === 'lead' ? 'Carregando lead...' :
                      config.entityType === 'opportunity' ? 'Carregando oportunidade...' :
                      config.entityType === 'task' ? 'Carregando tarefa...' :
                      'Carregando...';
        }

        // Monta o breadcrumb
        const parentItems = breadcrumbConfig[config.parentPath] || [
          { label: 'Início', path: '/' },
        ];

        return {
          items: [
            ...parentItems,
            {
              label: config.getLabel(entityName),
              path: currentPath,
              dynamic: true,
              entityType: config.entityType,
            },
          ],
          isLoading: entityName.includes('Carregando'),
        };
      }
    }

    // 3. Fallback: cria breadcrumb genérico baseado no path
    const pathParts = currentPath.split('/').filter(Boolean);
    if (pathParts.length === 0) {
      return { items: [{ label: 'Início', path: '/' }], isLoading: false };
    }

    // Cria breadcrumbs hierárquicos
    const items: BreadcrumbItem[] = [{ label: 'Início', path: '/' }];
    let currentBuildPath = '';

    pathParts.forEach((part, index) => {
      currentBuildPath += `/${part}`;
      
      // Se for o último item, usa o nome formatado
      if (index === pathParts.length - 1) {
        // Tenta capitalizar e formatar o nome
        const formattedName = part
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        items.push({ label: formattedName, path: currentBuildPath });
      } else {
        // Para itens intermediários, verifica se existe na configuração
        const configItem = breadcrumbConfig[currentBuildPath];
        if (configItem && configItem.length > 1) {
          items.push(configItem[configItem.length - 1]);
        } else {
          // Fallback: formata o nome
          const formattedName = part
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          items.push({ label: formattedName, path: currentBuildPath });
        }
      }
    });

    return { items, isLoading: false };
  }, [currentPath]);

  return breadcrumbs;
}

/**
 * Função para atualizar o nome da entidade no cache
 * Deve ser chamada quando os dados da entidade são carregados
 */
export function updateEntityNameInCache(
  entityType: string,
  entityId: string,
  name: string
): void {
  const cacheKey = `${entityType}-${entityId}`;
  entityNameCache[cacheKey] = name;
}

/**
 * Limpa o cache de nomes de entidades
 * Útil ao fazer logout ou quando os dados são atualizados
 */
export function clearEntityNameCache(): void {
  Object.keys(entityNameCache).forEach(key => {
    delete entityNameCache[key];
  });
}

export default useBreadcrumbs;
