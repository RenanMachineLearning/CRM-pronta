/**
 * Cache em memória para relatórios de importação.
 * Reduz carga no banco e tempo de resposta em acessos repetidos ao mesmo relatório.
 * TTL padrão: 5 minutos.
 */

import type { ImportReport } from '../types/importProcessing.types';

const TTL_MS = 5 * 60 * 1000; // 5 min

interface CacheEntry {
  report: ImportReport;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

function prune(): void {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.expiresAt <= now) store.delete(k);
  }
}

let pruneTimer: ReturnType<typeof setInterval> | null = null;
function schedulePrune(): void {
  if (pruneTimer) return;
  pruneTimer = setInterval(prune, 60 * 1000); // a cada 1 min
  if (pruneTimer.unref) pruneTimer.unref();
}

/**
 * Obtém relatório do cache. Retorna undefined se não existir ou estiver expirado.
 */
export function get(key: string): ImportReport | undefined {
  schedulePrune();
  const entry = store.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    if (entry) store.delete(key);
    return undefined;
  }
  return entry.report;
}

/**
 * Armazena relatório no cache com TTL.
 */
export function set(key: string, report: ImportReport): void {
  schedulePrune();
  store.set(key, {
    report,
    expiresAt: Date.now() + TTL_MS,
  });
}

/** Objeto exposto para o controller (get/set). */
export const reportCache = { get, set };
