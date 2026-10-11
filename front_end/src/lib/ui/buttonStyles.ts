export type ButtonSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

export type ButtonVariant =
  | 'default'
  | 'inset'
  | 'outline'
  | 'ghost'
  | 'tray'
  | 'tray-color'
  | 'cardless'
  | 'accent'
  | 'action'
  | 'stack'
  | 'media'
  | 'success'
  | 'error'
  | 'warning'

/** Min block size per button scale — keep dropdown selector `--theme-menu-row-height` in sync. */
export const buttonMinHeightRem: Record<ButtonSize, string> = {
  xxs: '1.375rem',
  xs: '1.625rem',
  sm: '2rem',
  md: '2.375rem',
  lg: '2.75rem',
  xl: '3.125rem',
  xxl: '3.5rem',
}

export const buttonSizeClass: Record<ButtonSize, string> = {
  xxs: 'type-caption gap-1 px-[0.24rem] py-[0.08rem] min-h-[1.375rem] [&_svg]:size-2.5',
  xs: 'type-caption gap-1 px-[0.32rem] py-[0.16rem] min-h-[1.625rem] [&_svg]:size-3',
  sm: 'type-body-sm gap-1.5 px-[0.4rem] py-[0.24rem] min-h-[2rem] [&_svg]:size-3.5',
  md: 'type-label gap-2 px-[0.56rem] py-[0.32rem] min-h-[2.375rem] [&_svg]:size-4',
  lg: 'type-body gap-2 px-[0.64rem] py-[0.4rem] min-h-[2.75rem] [&_svg]:size-4',
  xl: 'type-body-lg gap-2.5 px-[0.8rem] py-[0.48rem] min-h-[3.125rem] [&_svg]:size-[1.125rem]',
  xxl: 'type-title gap-3 px-[0.96rem] py-[0.56rem] min-h-[3.5rem] [&_svg]:size-5',
}

/** Expandable chips — no Tailwind padding; [button-expandable.css](../css/effects/button-expandable.css) owns pad via CSS vars. */
export const buttonExpandableSizeClass: Record<ButtonSize, string> = {
  xxs: 'type-caption gap-1 min-h-[1.375rem] [&_svg]:size-2.5',
  xs: 'type-caption gap-1 min-h-[1.625rem] [&_svg]:size-3',
  sm: 'type-body-sm gap-1.5 min-h-[2rem] [&_svg]:size-3.5',
  md: 'type-label gap-2 min-h-[2.375rem] [&_svg]:size-4',
  lg: 'type-body gap-2 min-h-[2.75rem] [&_svg]:size-4',
  xl: 'type-body-lg gap-2.5 min-h-[3.125rem] [&_svg]:size-[1.125rem]',
  xxl: 'type-title gap-3 min-h-[3.5rem] [&_svg]:size-5',
}

export const buttonStackSizeClass: Record<ButtonSize, string> = {
  xxs: 'type-caption gap-0.5 px-1 py-0.5 min-h-0 min-w-[2.25rem] [&_svg]:size-3',
  xs: 'type-caption gap-0.5 px-1.5 py-1 min-h-0 min-w-[2.5rem] [&_svg]:size-3.5',
  sm: 'type-caption gap-1 px-2 py-1.5 min-h-0 min-w-[3rem] [&_svg]:size-4',
  md: 'type-caption gap-1 px-2.5 py-2 min-h-0 min-w-[3.5rem] [&_svg]:size-[1.125rem]',
  lg: 'type-body-sm gap-1 px-3 py-2 min-h-0 min-w-[4rem] [&_svg]:size-5',
  xl: 'type-body-sm gap-1.5 px-3.5 py-2.5 min-h-0 min-w-[4.5rem] [&_svg]:size-5',
  xxl: 'type-label gap-1.5 px-4 py-3 min-h-0 min-w-[5rem] [&_svg]:size-[1.375rem]',
}

export const buttonIconOnlySizeClass: Record<ButtonSize, string> = {
  xxs:
    'min-h-[1.375rem] min-w-[1.375rem] p-[0.18rem] [&_.theme-btn__icon]:size-2.5 [&_svg]:size-2.5',
  xs: 'min-h-[1.625rem] min-w-[1.625rem] p-[0.2rem] [&_.theme-btn__icon]:size-3.5 [&_svg]:size-3.5',
  sm: 'min-h-[2rem] min-w-[2rem] p-[0.24rem] [&_.theme-btn__icon]:size-4 [&_svg]:size-4',
  md: 'min-h-[2.375rem] min-w-[2.375rem] p-[0.34rem] [&_.theme-btn__icon]:size-4 [&_svg]:size-4',
  lg: 'min-h-[2.75rem] min-w-[2.75rem] p-[0.38rem] [&_.theme-btn__icon]:size-4 [&_svg]:size-4',
  xl:
    'min-h-[3.125rem] min-w-[3.125rem] p-[0.42rem] [&_.theme-btn__icon]:size-[1.125rem] [&_svg]:size-[1.125rem]',
  xxl: 'min-h-[3.5rem] min-w-[3.5rem] p-[0.48rem] [&_.theme-btn__icon]:size-5 [&_svg]:size-5',
}

export const buttonVariantClass: Record<ButtonVariant, string> = {
  default: 'theme-btn--default',
  inset: 'theme-btn--inset',
  outline: 'theme-btn--outline',
  ghost: 'theme-btn--ghost',
  tray: 'theme-btn--tray',
  'tray-color': 'theme-btn--tray-color',
  cardless: 'theme-btn--cardless',
  accent: 'theme-btn--accent',
  action: 'theme-btn--action',
  stack: 'theme-btn--stack',
  success: 'theme-btn--success',
  error: 'theme-btn--error',
  warning: 'theme-btn--warning',
  media: 'theme-btn--media',
}

export function buttonSurfaceClass({
  size,
  variant,
  iconOnly,
  className = '',
}: {
  size: ButtonSize
  variant: ButtonVariant
  iconOnly?: boolean
  className?: string
}): string {
  return [
    'theme-btn',
    iconOnly ? buttonIconOnlySizeClass[size] : buttonSizeClass[size],
    buttonVariantClass[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ')
}
