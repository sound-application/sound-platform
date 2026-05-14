/**
 * Sound Platform — Empty State Component
 * Phase: 5-A
 * Reusable empty state for missing online data.
 */

import React from 'react';
import './EmptyState.css';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  /** Optional action — shown as disabled if actionDisabled is true */
  action?: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    disabledReason?: string;
  };
}

export function EmptyState({ icon = '✨', title, description, action }: Props) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-state__icon" aria-hidden="true">{icon}</span>
      <h3 className="empty-state__title">{title}</h3>
      {description && (
        <p className="empty-state__description">{description}</p>
      )}
      {action && (
        <button
          className="empty-state__action"
          onClick={action.disabled ? undefined : action.onClick}
          disabled={action.disabled}
          title={action.disabled ? action.disabledReason : undefined}
          aria-disabled={action.disabled}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
