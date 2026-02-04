/**
 * Passo 5: Processamento (Etapa 9 - Parte 10).
 * Barra de progresso e estatísticas em tempo real (backend síncrono: indicador indeterminado).
 */


export interface ProcessingStepProps {
  message: string;
  progressPercent?: number;
}

export function ProcessingStep({ message, progressPercent }: ProcessingStepProps) {
  const percent = progressPercent ?? 0;
  const indeterminate = percent <= 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{message}</p>

      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        {indeterminate ? (
          <div
            className="h-full bg-blue-600 rounded-full animate-pulse"
            style={{ width: '40%' }}
          />
        ) : (
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        )}
      </div>

      {!indeterminate && (
        <p className="text-sm text-gray-500 text-right">{percent}%</p>
      )}
    </div>
  );
}
