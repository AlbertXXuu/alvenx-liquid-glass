import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type MenuToggleProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'type' | 'aria-expanded' | 'aria-controls'
> & {
  /** Whether the navigation controlled by this button is open. */
  expanded: boolean;
  /** The id of the navigation region controlled by this button. */
  controls: string;
  /** Skip the transition when an application-level motion preference is set. */
  reducedMotion?: boolean;
};

/** Canonical AlvenX navigation disclosure: two lines transform into a close icon.
 * The host owns navigation visibility, dismissal and focus restoration. */
export const MenuToggle = forwardRef<HTMLButtonElement, MenuToggleProps>(
  function MenuToggle({
    expanded,
    controls,
    reducedMotion = false,
    className = '',
    'aria-label': ariaLabel = 'Navigation menu',
    ...buttonProps
  }, ref) {
    return <button
      {...buttonProps}
      ref={ref}
      type="button"
      className={`ax-menu-toggle ${className}`.trim()}
      aria-label={ariaLabel}
      aria-expanded={expanded}
      aria-controls={controls}
      data-reduced-motion={reducedMotion || undefined}
    >
      <span className="ax-menu-icon" aria-hidden="true"><span /><span /></span>
    </button>;
  },
);
