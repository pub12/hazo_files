/**
 * Naming Rule Components
 * Drop-in components for configuring file/folder naming rules
 */

// Main component
export { NamingRuleConfigurator } from './NamingRuleConfigurator';
export { default as NamingRuleConfiguratorDefault } from './NamingRuleConfigurator';

// Sub-components (for custom implementations)
export { VariableList } from './VariableList';
export { PatternBuilder } from './PatternBuilder';
export { PatternPreview } from './PatternPreview';
export { DraggableVariable } from './DraggableVariable';
export { PatternSegmentItem } from './PatternSegmentItem';
export { SeparatorPicker } from './SeparatorPicker';

// Types
export type { VariableListProps } from './VariableList';
export type { PatternBuilderProps } from './PatternBuilder';
export type { PatternPreviewProps } from './PatternPreview';
export type { DraggableVariableProps } from './DraggableVariable';
export type { PatternSegmentItemProps } from './PatternSegmentItem';
export type { SeparatorPickerProps } from './SeparatorPicker';
