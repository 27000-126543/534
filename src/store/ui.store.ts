import { create } from 'zustand';

export type ModalType =
  | 'create-task'
  | 'upload-files'
  | 'create-patient'
  | 'edit-patient'
  | 'review-alert'
  | 'process-approval'
  | 'export-data'
  | 'view-report'
  | 'confirm-dialog';

export interface ModalData {
  title?: string;
  taskId?: string;
  patientId?: string;
  alertId?: string;
  approvalId?: string;
  reportId?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  [key: string]: any;
}

interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  sidebarCollapsed: boolean;
  activeTheme: 'light' | 'dark';
  modalType: ModalType | null;
  modalData: ModalData;
  notifications: NotificationItem[];
  currentPageTitle: string;
  breadcrumbs: Array<{ label: string; path?: string }>;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  openModal: (type: ModalType, data?: ModalData) => void;
  closeModal: () => void;
  addNotification: (notification: Omit<NotificationItem, 'id'>) => void;
  removeNotification: (id: string) => void;
  setCurrentPageTitle: (title: string) => void;
  setBreadcrumbs: (breadcrumbs: Array<{ label: string; path?: string }>) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  activeTheme: 'light',
  modalType: null,
  modalData: {},
  notifications: [],
  currentPageTitle: '仪表盘',
  breadcrumbs: [{ label: '首页' }],

  toggleSidebar: () => {
    set({ sidebarCollapsed: !get().sidebarCollapsed });
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },

  toggleTheme: () => {
    const newTheme = get().activeTheme === 'light' ? 'dark' : 'light';
    set({ activeTheme: newTheme });
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  },

  setTheme: (theme) => {
    set({ activeTheme: theme });
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  },

  openModal: (type, data = {}) => {
    set({ modalType: type, modalData: data });
  },

  closeModal: () => {
    set({ modalType: null, modalData: {} });
  },

  addNotification: (notification) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    set({
      notifications: [...get().notifications, newNotification]
    });
    const duration = notification.duration || 3000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeNotification(id);
      }, duration);
    }
  },

  removeNotification: (id) => {
    set({
      notifications: get().notifications.filter((n) => n.id !== id)
    });
  },

  setCurrentPageTitle: (title) => {
    set({ currentPageTitle: title });
  },

  setBreadcrumbs: (breadcrumbs) => {
    set({ breadcrumbs });
  }
}));
