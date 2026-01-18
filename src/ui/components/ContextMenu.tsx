/**
 * ContextMenu Component
 * Custom right-click context menu positioned at cursor location
 */

import React, { useEffect, useCallback, useRef } from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<IconProps>;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      onClose();
    }
  }, [onClose]);

  // Close on escape key
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const getAdjustedPosition = useCallback(() => {
    if (!position || !menuRef.current) {
      return position;
    }

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // Adjust if menu goes off right edge
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 8;
    }

    // Adjust if menu goes off bottom edge
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 8;
    }

    // Ensure minimum position
    x = Math.max(8, x);
    y = Math.max(8, y);

    return { x, y };
  }, [position]);

  useEffect(() => {
    if (position) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [position, handleClickOutside, handleKeyDown]);

  // Adjust position after render
  useEffect(() => {
    if (position && menuRef.current) {
      const adjusted = getAdjustedPosition();
      if (adjusted) {
        menuRef.current.style.left = `${adjusted.x}px`;
        menuRef.current.style.top = `${adjusted.y}px`;
      }
    }
  }, [position, getAdjustedPosition]);

  if (!position) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={`divider-${index}`}
              className="h-px bg-gray-200 my-1"
            />
          );
        }

        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            className={`
              w-full px-3 py-2 text-left text-sm flex items-center gap-2
              transition-colors
              ${item.disabled
                ? 'text-gray-400 cursor-not-allowed'
                : item.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            {Icon && (
              <Icon
                size={16}
                className={item.disabled ? 'text-gray-400' : item.danger ? 'text-red-500' : 'text-gray-500'}
              />
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export default ContextMenu;
