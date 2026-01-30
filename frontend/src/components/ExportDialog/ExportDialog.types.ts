export interface Field {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  order: number;
}

export interface ExportOptions {
  format: 'csv' | 'excel';
  fields: string[];
  filters?: any;
  orderBy?: string;
  limit?: number;
}

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  currentFilters?: any;
  availableFields: Field[];
  onExport: (options: ExportOptions) => void;
}