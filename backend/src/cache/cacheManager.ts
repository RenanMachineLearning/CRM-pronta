/**
 * Gerenciador de cache em memória
 * Implementa cache simples para V1, com suporte futuro para Redis
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
  tags?: string[];
}

export class CacheManager {
  private cache: Map<string, CacheEntry<any>>;
  private readonly DEFAULT_TTL = 300; // 5 minutos em segundos

  constructor() {
    this.cache = new Map();
    // Limpar entradas expiradas a cada minuto
    setInterval(() => this.cleanExpired(), 60000);
  }

  /**
   * Obtém valor do cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Armazena valor no cache
   */
  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL, tags?: string[]): Promise<void> {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl * 1000,
      tags,
    });
  }

  /**
   * Invalida entradas do cache que correspondem ao padrão
   * Suporta wildcards (*)
   */
  async invalidate(pattern: string): Promise<void> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalida entradas do cache por tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Remove entradas expiradas do cache
   */
  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpa todo o cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Retorna estatísticas do cache (útil para monitoramento)
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const cacheManager = new CacheManager();
