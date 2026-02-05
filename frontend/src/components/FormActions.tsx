/**
 * Componente FormActions
 * Botões de ação do formulário (salvar/cancelar)
 */

import { Button } from './Button';

export interface FormActionsProps {
  /** Função chamada ao clicar em cancelar */
  onCancel?: () => void;
  /** Texto do botão de cancelar */
  cancelLabel?: string;
  /** Texto do botão de submit */
  submitLabel?: string;
  /** Se está carregando */
  loading?: boolean;
  /** Se o formulário é válido */
  isValid?: boolean;
  /** Classes adicionais */
  className?: string;
  /** Se deve mostrar o botão de cancelar */
  showCancel?: boolean;
  /** Se deve fixar no bottom em mobile */
  sticky?: boolean;
}

export function FormActions({
  onCancel,
  cancelLabel = 'Cancelar',
  submitLabel = 'Salvar',
  loading = false,
  isValid = true,
  className = '',
  showCancel = true,
  sticky = false,
}: FormActionsProps) {
  return (
    <div
      className={`
        flex flex-col-reverse sm:flex-row 
        sm:justify-end 
        gap-3
        ${sticky ? 'sticky bottom-0 bg-white py-4 border-t border-gray-200 mt-6' : 'mt-8'}
        ${className}
      `}
    >
      {/* Cancelar */}
      {showCancel && onCancel && (
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
          fullWidth
          className="sm:w-auto"
        >
          {cancelLabel}
        </Button>
      )}

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        isLoading={loading}
        disabled={loading || !isValid}
        fullWidth
        className="sm:w-auto"
      >
        {submitLabel}
      </Button>
    </div>
  );
}

export default FormActions;
