export type ButtonGroupVariant = 'joined' | 'toggle' | 'segmented' | 'card' | 'compact' | 'paged' | 'scroll'

export type ButtonGroupOutline = 'default' | 'muted' | 'toolbar'

export const buttonGroupOutlineClass: Record<ButtonGroupOutline, string> = {
  default: '',
  muted: 'theme-btn-group--outline-muted',
  toolbar: 'theme-btn-group--outline-toolbar',
}

export const buttonGroupVariantClass: Record<ButtonGroupVariant, string> = {
  joined: 'theme-btn-group--joined',
  toggle: 'theme-btn-group--toggle',
  segmented: 'theme-btn-group--segmented',
  card: 'theme-btn-group--card',
  compact: 'theme-btn-group--compact',
  paged: 'theme-btn-group--paged',
  scroll: 'theme-btn-group--scroll',
}
