/**
 * LazyImage Component
 * Carregamento lazy de imagens para melhor performance
 * Usa IntersectionObserver para carregar apenas quando visível
 */

import { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  /** URL da imagem */
  src: string;
  /** Texto alternativo */
  alt: string;
  /** Classe CSS */
  className?: string;
  /** Largura */
  width?: number | string;
  /** Altura */
  height?: number | string;
  /** Imagem placeholder enquanto carrega */
  placeholder?: string;
  /** Callback quando a imagem carrega */
  onLoad?: () => void;
  /** Callback em caso de erro */
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder,
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Começa a carregar 50px antes de entrar na viewport
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Placeholder padrão (base64 transparente)
  const defaultPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder ou imagem de erro */}
      {(!isLoaded || hasError) && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          {hasError ? (
            <span className="text-gray-400 text-sm">Erro ao carregar</span>
          ) : (
            <svg
              className="w-8 h-8 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>
      )}

      {/* Imagem real - só carrega quando estiver na viewport */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* Placeholder enquanto não está na viewport */}
      {!isInView && (
        <img
          src={placeholder || defaultPlaceholder}
          alt=""
          className="w-full h-full object-cover"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default LazyImage;