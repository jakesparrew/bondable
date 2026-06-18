// Component prop types

// Common component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Form component props
export interface FormFieldProps extends BaseComponentProps {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

// Table component props
export interface TableColumn<T = any> {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface TableProps<T = any> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  pagination?: {
    current: number;
    total: number;
    pageSize: number;
    onChange: (page: number) => void;
  };
}

// Dialog component props
export interface DialogProps extends BaseComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

// Re-export types commonly used in components
export type { Client } from '../client';
export type { Session } from '../session';
export type { ClientTask, TaskStatus, TaskPriority } from '../global';