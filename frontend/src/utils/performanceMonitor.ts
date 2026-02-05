/**
 * Performance Monitor
 * Utilitário para monitorar métricas de performance da aplicação
 */

interface PerformanceMetrics {
  /** Tempo até o primeiro byte (TTFB) */
  ttfb: number;
  /** Tempo de carregamento do DOM */
  domLoad: number;
  /** Tempo de carregamento completo */
  fullLoad: number;
  /** Tempo de renderização do primeiro conteúdo (FCP) */
  fcp?: number;
  /** Maior elemento visível (LCP) */
  lcp?: number;
  /** Tempo até interatividade (TTI) */
  tti?: number;
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];

  /**
   * Inicia o monitoramento de performance
   */
  start(): void {
    if (typeof window === 'undefined' || !('performance' in window)) {
      console.warn('Performance API não disponível');
      return;
    }

    // Coleta métricas básicas
    this.collectBasicMetrics();
    
    // Monitora FCP e LCP
    this.observePaintMetrics();
    
    // Monitora elementos grandes
    this.observeLargestContentfulPaint();
    
    // Log das métricas quando a página carrega
    window.addEventListener('load', () => {
      setTimeout(() => this.logMetrics(), 0);
    });
  }

  /**
   * Coleta métricas básicas de performance
   */
  private collectBasicMetrics(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      this.metrics = {
        ttfb: navigation.responseStart - navigation.startTime,
        domLoad: navigation.domContentLoadedEventEnd - navigation.startTime,
        fullLoad: navigation.loadEventEnd - navigation.startTime,
      };
    }
  }

  /**
   * Observa métricas de paint (FCP)
   */
  private observePaintMetrics(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime;
          }
        }
      });
      
      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (e) {
      console.warn('Paint metrics não suportado');
    }
  }

  /**
   * Observa Largest Contentful Paint (LCP)
   */
  private observeLargestContentfulPaint(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (e) {
      console.warn('LCP metrics não suportado');
    }
  }

  /**
   * Retorna as métricas coletadas
   */
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  /**
   * Log das métricas no console
   */
  logMetrics(): void {
    console.group('📊 Performance Metrics');
    console.log('TTFB:', this.metrics.ttfb?.toFixed(2), 'ms');
    console.log('DOM Load:', this.metrics.domLoad?.toFixed(2), 'ms');
    console.log('Full Load:', this.metrics.fullLoad?.toFixed(2), 'ms');
    if (this.metrics.fcp) {
      console.log('FCP:', this.metrics.fcp.toFixed(2), 'ms');
    }
    if (this.metrics.lcp) {
      console.log('LCP:', this.metrics.lcp.toFixed(2), 'ms');
    }
    console.groupEnd();
  }

  /**
   * Marca um ponto de tempo personalizado
   */
  mark(label: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(label);
    }
  }

  /**
   * Mede o tempo entre dois pontos
   */
  measure(name: string, startLabel: string, endLabel?: string): void {
    if (typeof performance !== 'undefined') {
      try {
        performance.measure(name, startLabel, endLabel);
        const entries = performance.getEntriesByName(name);
        if (entries.length > 0) {
          console.log(`⏱️ ${name}:`, entries[0].duration.toFixed(2), 'ms');
        }
      } catch (e) {
        console.warn('Erro ao medir performance:', e);
      }
    }
  }

  /**
   * Limpa observers e marcações
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}

// Exporta instância singleton
export const performanceMonitor = new PerformanceMonitor();

// Inicia automaticamente em ambiente de desenvolvimento
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.start();
}

export default performanceMonitor;