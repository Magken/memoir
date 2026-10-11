import type { ComponentProps } from 'react'
import { Button } from './Button'
import { Loader } from './Loader'

type LoadingButtonProps = ComponentProps<typeof Button> & {
  loading?: boolean
  loadingLabel?: string
}

export function LoadingButton({
  loading = false,
  loadingLabel = 'Loading',
  children,
  disabled,
  icon: Icon,
  className = '',
  ...rest
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      icon={loading ? undefined : Icon}
      className={[loading ? 'theme-btn--loading' : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {loading ? (
        <>
          <Loader size="button" label={loadingLabel} />
          <span className="theme-btn__label">{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </Button>
  )
}
