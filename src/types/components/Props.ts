/**
 * Component Props type definitions
 * Standardized prop interfaces for reusable components
 */

import { ReactNode, HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import { UserProfile, UserRole } from '../global/User';
import { Session, SessionStatus, SessionType } from '../global/Session';
import { Message, Conversation } from '../global/Message';

// Base component props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
  testId?: string;
}

export interface BaseDialogProps extends BaseComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export interface BaseFormProps extends BaseComponentProps {
  onSubmit: (data: any) => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  initialValues?: Record<string, any>;
}

// Button component props
export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'>, BaseComponentProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// Input component props
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, BaseComponentProps {
  label?: string;
  description?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: 'sm' | 'default' | 'lg';
}

export interface TextareaProps extends BaseComponentProps {
  label?: string;
  description?: string;
  error?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

// Select component props
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps extends BaseComponentProps {
  label?: string;
  description?: string;
  error?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  clearable?: boolean;
}

// Table component props
export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
}

export interface TableProps<T = any> extends BaseComponentProps {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  selection?: {
    selectedRowKeys: string[];
    onChange: (selectedRowKeys: string[], selectedRows: T[]) => void;
  };
  expandable?: {
    expandedRowRender: (record: T) => ReactNode;
    rowExpandable?: (record: T) => boolean;
  };
  onRow?: (record: T) => HTMLAttributes<HTMLTableRowElement>;
  scroll?: { x?: number; y?: number };
  empty?: ReactNode;
}

// Card component props
export interface CardProps extends BaseComponentProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  size?: 'small' | 'default' | 'large';
}

export interface StatCardProps extends CardProps {
  value: string | number;
  label: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

// Avatar component props
export interface AvatarProps extends BaseComponentProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  shape?: 'circle' | 'square';
  badge?: {
    status?: 'online' | 'offline' | 'away' | 'busy';
    count?: number;
    dot?: boolean;
  };
  onClick?: () => void;
  upload?: {
    onUpload: (file: File) => void;
    loading?: boolean;
  };
}

// User-specific component props
export interface UserProfileCardProps extends CardProps {
  user: UserProfile;
  showContact?: boolean;
  showRole?: boolean;
  actions?: ReactNode;
  onClick?: () => void;
}

export interface UserListProps extends BaseComponentProps {
  users: UserProfile[];
  loading?: boolean;
  onUserClick?: (user: UserProfile) => void;
  onUserEdit?: (user: UserProfile) => void;
  onUserDelete?: (user: UserProfile) => void;
  filters?: {
    role?: UserRole;
    search?: string;
  };
  pagination?: TableProps['pagination'];
}

// Session-specific component props
export interface SessionCardProps extends CardProps {
  session: Session;
  userType: 'therapist' | 'client';
  onEdit?: (session: Session) => void;
  onCancel?: (session: Session) => void;
  onConfirm?: (session: Session) => void;
  onJoin?: (session: Session) => void;
}

export interface SessionCalendarProps extends BaseComponentProps {
  sessions: Session[];
  onSessionClick?: (session: Session) => void;
  onDateClick?: (date: Date) => void;
  onSessionCreate?: (date: Date, time?: string) => void;
  view?: 'month' | 'week' | 'day';
  editable?: boolean;
}

export interface SessionFormProps extends BaseFormProps {
  session?: Session;
  userType: 'therapist' | 'client';
  availableClients?: Array<{ id: string; name: string }>;
  availableTherapists?: Array<{ id: string; name: string }>;
  mode?: 'create' | 'edit' | 'view';
}

// Message-specific component props
export interface MessageListProps extends BaseComponentProps {
  messages: Message[];
  currentUserId: string;
  loading?: boolean;
  onMessageSend?: (content: string, attachments?: File[]) => void;
  onMessageEdit?: (messageId: string, content: string) => void;
  onMessageDelete?: (messageId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export interface ConversationListProps extends BaseComponentProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onConversationClick?: (conversation: Conversation) => void;
  onConversationDelete?: (conversation: Conversation) => void;
  loading?: boolean;
  searchable?: boolean;
}

export interface MessageInputProps extends BaseComponentProps {
  onSend: (content: string, attachments?: File[]) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  allowAttachments?: boolean;
  maxLength?: number;
  allowVoice?: boolean;
}

// Dashboard component props
export interface DashboardProps extends BaseComponentProps {
  userType: 'therapist' | 'client' | 'admin';
  stats?: Record<string, number>;
  loading?: boolean;
  onRefresh?: () => void;
}

// Navigation component props
export interface NavigationItem {
  key: string;
  label: string;
  icon?: ReactNode;
  path?: string;
  children?: NavigationItem[];
  badge?: number;
  disabled?: boolean;
}

export interface SidebarProps extends BaseComponentProps {
  items: NavigationItem[];
  activeKey?: string;
  collapsed?: boolean;
  onItemClick?: (item: NavigationItem) => void;
  onCollapse?: (collapsed: boolean) => void;
  user?: UserProfile;
}

// Modal and Dialog props
export interface ConfirmDialogProps extends BaseDialogProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export interface FormDialogProps<T = any> extends BaseDialogProps {
  form: ReactNode;
  onSubmit?: (data: T) => void | Promise<void>;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
}

// Filter and search props
export interface FilterProps extends BaseComponentProps {
  filters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  onReset?: () => void;
  loading?: boolean;
}

export interface SearchProps extends BaseComponentProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  suggestions?: string[];
}

// Layout props
export interface LayoutProps extends BaseComponentProps {
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  loading?: boolean;
}

// Error boundary props
export interface ErrorBoundaryProps extends BaseComponentProps {
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}