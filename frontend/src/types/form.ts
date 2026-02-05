/**
 * Tipos compartilhados para formulários
 */

import { ValidatorFn } from '../utils/validators';

/**
 * Schema de validação para formulários
 * Mapeia nomes de campos para arrays de validadores
 */
export type ValidationSchema<T = any> = {
  [K in keyof T]?: ValidatorFn[];
};

/**
 * Erros de validação de formulário
 */
export type FormErrors<T = any> = {
  [K in keyof T]?: string;
};

/**
 * Estado de um campo (para tracking de touched/dirty)
 */
export interface FieldState {
  touched: boolean;
  dirty: boolean;
}

/**
 * Estado dos campos do formulário
 */
export type FormFieldStates<T = any> = {
  [K in keyof T]?: FieldState;
};

/**
 * Props comuns para componentes de campo
 */
export interface FieldComponentProps {
  name: string;
  label?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  disabled?: boolean;
}

/**
 * Opção para selects
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
