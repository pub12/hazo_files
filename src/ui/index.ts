/**
 * Hazo Files UI Components
 * Drop-in file browser components for React applications
 */

// Main component
export { FileBrowser } from './components/FileBrowser';
export type { FileBrowserProps, FileBrowserAPI } from './components/FileBrowser';

// Individual components
export { PathBreadcrumb } from './components/PathBreadcrumb';
export { FolderTree } from './components/FolderTree';
export { FileList } from './components/FileList';
export { FilePreview } from './components/FilePreview';
export { FileActions } from './components/FileActions';

export type { PathBreadcrumbProps } from './components/PathBreadcrumb';
export type { FolderTreeProps } from './components/FolderTree';
export type { FileListProps } from './components/FileList';
export type { FilePreviewProps } from './components/FilePreview';
export type { FileActionsProps } from './components/FileActions';

// Dialogs
export {
  CreateFolderDialog,
  RenameDialog,
  DeleteConfirmDialog,
  UploadDialog,
} from './components/dialogs';

export type {
  CreateFolderDialogProps,
  RenameDialogProps,
  DeleteConfirmDialogProps,
  UploadDialogProps,
} from './components/dialogs';

// Hooks
export { useFileBrowser } from './hooks/useFileBrowser';
export { useFileOperations, useMultiFileOperations } from './hooks/useFileOperations';

export type { UseFileBrowserOptions, UseFileBrowserReturn } from './hooks/useFileBrowser';
export type { OperationState, UseFileOperationsReturn, UseMultiFileOperationsReturn } from './hooks/useFileOperations';

// Context
export { FileBrowserProvider, useFileBrowserContext } from './context/FileBrowserContext';
export type { FileBrowserProviderProps } from './context/FileBrowserContext';

// Icons
export * from './icons/FileIcons';

// Naming Rule Components
export {
  NamingRuleConfigurator,
  VariableList,
  PatternBuilder,
  PatternPreview,
  DraggableVariable,
  PatternSegmentItem,
  SeparatorPicker,
} from './components/naming';

export type {
  VariableListProps,
  PatternBuilderProps,
  PatternPreviewProps,
  DraggableVariableProps,
  PatternSegmentItemProps,
  SeparatorPickerProps,
} from './components/naming';

// Naming Rule Hook
export { useNamingRule, type UseNamingRuleOptions } from './hooks/useNamingRule';
