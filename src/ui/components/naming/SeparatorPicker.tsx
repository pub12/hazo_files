/**
 * SeparatorPicker Component
 * Quick-add buttons for common separators in naming patterns
 */

export interface SeparatorPickerProps {
  /** Callback when a separator is selected */
  onSelect: (separator: string) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Additional CSS class */
  className?: string;
}

const COMMON_SEPARATORS = [
  { value: '-', label: '-', title: 'Hyphen' },
  { value: '_', label: '_', title: 'Underscore' },
  { value: '/', label: '/', title: 'Slash (for folder paths)' },
  { value: ' ', label: '␣', title: 'Space' },
  { value: '.', label: '.', title: 'Period' },
];

export function SeparatorPicker({
  onSelect,
  disabled = false,
  className = '',
}: SeparatorPickerProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-xs text-gray-500 mr-1">Add:</span>
      {COMMON_SEPARATORS.map(({ value, label, title }) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          disabled={disabled}
          title={title}
          className={`
            w-7 h-7 flex items-center justify-center rounded border text-sm font-mono
            bg-gray-50 border-gray-200 text-gray-600
            hover:bg-gray-100 hover:border-gray-300
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default SeparatorPicker;
