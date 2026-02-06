/**
 * Utilitários para testes
 * Helpers para renderizar componentes com providers necessários
 */

import React, { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Mock do matchMedia para testes
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock do IntersectionObserver para testes
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock do ResizeObserver para testes
class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withRouter?: boolean;
}

/**
 * Renderiza componente com providers necessários
 */
export function render(
  ui: ReactElement,
  { withRouter = true, ...options }: CustomRenderOptions = {}
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (withRouter) {
      return <MemoryRouter>{children}</MemoryRouter>;
    }
    return <>{children}</>;
  };

  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

/**
 * Cria um mock de função com tipagem
 */
export function createMock<T extends (...args: any[]) => any>(
  implementation?: T
) {
  if (implementation) {
    return vi.fn(implementation);
  }
  return vi.fn();
}

/**
 * Aguarda um tempo determinado
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cria dados mock para testes
 */
export const mockData = {
  contact: {
    id: '1',
    firstName: 'João',
    lastName: 'Silva',
    emails: [{ email: 'joao@example.com', isPrimary: true }],
    phones: [{ phone: '(11) 99999-9999', isPrimary: true }],
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tenantId: 'tenant-1',
    tags: [],
  },
  company: {
    id: '1',
    name: 'Empresa Teste',
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tenantId: 'tenant-1',
    emails: [],
    phones: [],
    addresses: [],
  },
  lead: {
    id: '1',
    firstName: 'Maria',
    lastName: 'Souza',
    status: 'NEW' as const,
    source: 'WEBSITE' as const,
    score: 50,
    emails: [{ email: 'maria@example.com', isPrimary: true }],
    phones: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tenantId: 'tenant-1',
  },
  task: {
    id: '1',
    title: 'Tarefa de teste',
    description: 'Descrição da tarefa',
    status: 'PENDING' as const,
    priority: 'MEDIUM' as const,
    dueDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tenantId: 'tenant-1',
  },
};

export * from '@testing-library/react';