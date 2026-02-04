/**
 * Passo 4: Opções de importação (Etapa 9 - Parte 10).
 * Checkbox Atualizar registros existentes; Ignorar erros e continuar.
 */

import type { ImportOptionsState } from '../types';

export interface ImportOptionsStepProps {
  options: ImportOptionsState;
  onOptionsChange: (options: ImportOptionsState) => void;
}

export function ImportOptionsStep({ options, onOptionsChange }: ImportOptionsStepProps) {
  const set = (key: keyof ImportOptionsState, value: boolean) => {
    onOptionsChange({ ...options, [key]: value });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Configure como a importação deve se comportar em caso de conflitos ou erros.
      </p>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={options.updateExisting}
          onChange={(e) => set('updateExisting', e.target.checked)}
          className="mt-1 rounded border-gray-300"
        />
        <span className="text-sm">
          <strong>Atualizar registros existentes:</strong> quando um registro já existir (ex.: mesmo e-mail),
          atualizar em vez de criar novo. Desmarque para apenas criar novos.
        </span>
      </label>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={options.continueOnError}
          onChange={(e) => set('continueOnError', e.target.checked)}
          className="mt-1 rounded border-gray-300"
        />
        <span className="text-sm">
          <strong>Ignorar erros e continuar:</strong> se uma linha falhar na validação, continuar importando as demais.
          Recomendado para arquivos grandes.
        </span>
      </label>
    </div>
  );
}
