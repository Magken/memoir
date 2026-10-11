import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import type { PickerOption } from '../lib/forms/dateTimePicker'
import {
  clampIndex,
  clampPickerVelocity,
  indexFromScrollTop,
  measurePickerMetrics,
  PICKER_MAX_MOMENTUM_ITEMS,
  PICKER_MOMENTUM_FRICTION,
  scrollTopForIndex,
} from '../lib/galleries/pickerCarousel'

type PickerCarouselColumnProps = {
  options: readonly PickerOption[]
  value: string
  onChange: (value: string) => void
  'aria-label': string
  disabled?: boolean
}

type PickerMetrics = {
  itemHeight: number
  containerHeight: number
}

type PickerCarouselItemProps = {
  option: PickerOption
  index: number
  selectedIndex: number
  isSelected: boolean
  disabled: boolean
  onPick: (index: number, value: string) => void
}

function selectedIndex(options: readonly PickerOption[], value: string): number {
  const index = options.findIndex((option) => option.value === value)
  return index >= 0 ? index : 0
}

const SNAP_DELAY_MS = 100
const SCROLL_ANIM_MS = 300
const MOMENTUM_MIN_VELOCITY = 0.08
const TOUCH_MOMENTUM_THRESHOLD = 0.55

const PickerCarouselItem = memo(function PickerCarouselItem({
  option,
  index,
  selectedIndex: activeIndex,
  isSelected,
  disabled,
  onPick,
}: PickerCarouselItemProps) {
  const distance = Math.abs(index - activeIndex)
  const opacity = Math.max(0.3, 1 - distance * 0.35)
  const scale = Math.max(0.7, 1 - distance * 0.15)

  return (
    <div
      role="option"
      aria-selected={isSelected}
      className={[
        'theme-picker-carousel__item',
        isSelected ? 'theme-picker-carousel__item--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ opacity, transform: `scale(${scale})` }}
      onClick={() => {
        if (disabled) return
        onPick(index, option.value)
      }}
    >
      {option.label}
    </div>
  )
})

export function PickerCarouselColumn({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  disabled = false,
}: PickerCarouselColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const metricsRef = useRef<PickerMetrics>({ itemHeight: 24, containerHeight: 72 })
  const optionsRef = useRef(options)
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const isScrollingRef = useRef(false)
  const isDraggingRef = useRef(false)
  const programmaticScrollRef = useRef(false)
  const skipValueSyncRef = useRef(false)
  const snapTimerRef = useRef<number | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const momentumFrameRef = useRef<number | null>(null)
  const velocityRef = useRef(0)
  const lastScrollTopRef = useRef(0)
  const lastTimeRef = useRef(0)
  const lastTouchYRef = useRef(0)
  const momentumStartScrollRef = useRef(0)

  const activeIndex = selectedIndex(options, value)

  optionsRef.current = options
  valueRef.current = value
  onChangeRef.current = onChange

  const syncMetrics = useCallback(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return
    metricsRef.current = measurePickerMetrics(scrollEl)
  }, [])

  const readIndex = useCallback((scrollTop: number, length: number) => {
    const { itemHeight, containerHeight } = metricsRef.current
    return clampIndex(indexFromScrollTop(scrollTop, itemHeight, containerHeight), length)
  }, [])

  const finishProgrammaticScroll = useCallback(() => {
    queueMicrotask(() => {
      programmaticScrollRef.current = false
    })
  }, [])

  const commitValue = useCallback((nextValue: string) => {
    if (nextValue === valueRef.current) return
    skipValueSyncRef.current = true
    onChangeRef.current(nextValue)
  }, [])

  const commitIndex = useCallback(
    (index: number) => {
      const currentOptions = optionsRef.current
      const nextValue = currentOptions[index]?.value
      if (nextValue) {
        commitValue(nextValue)
      }
    },
    [commitValue],
  )

  const scrollToIndex = useCallback(
    (
      index: number,
      length: number,
      smooth = false,
      onSettled?: (settledIndex: number) => void,
    ) => {
      const scrollEl = scrollRef.current
      if (!scrollEl || length === 0) return

      const { itemHeight, containerHeight } = metricsRef.current
      const clamped = clampIndex(index, length)
      const target = scrollTopForIndex(clamped, itemHeight, containerHeight)

      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      if (momentumFrameRef.current !== null) {
        cancelAnimationFrame(momentumFrameRef.current)
        momentumFrameRef.current = null
      }

      programmaticScrollRef.current = true

      const settle = () => {
        finishProgrammaticScroll()
        onSettled?.(clamped)
      }

      if (!smooth || Math.abs(scrollEl.scrollTop - target) < 1) {
        scrollEl.scrollTop = target
        settle()
        return
      }

      const start = scrollEl.scrollTop
      const distance = target - start
      const startTime = performance.now()

      const tick = (now: number) => {
        const el = scrollRef.current
        if (!el) {
          settle()
          return
        }

        const progress = Math.min((now - startTime) / SCROLL_ANIM_MS, 1)
        const eased = 1 - (1 - progress) ** 3
        el.scrollTop = start + distance * eased

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(tick)
          return
        }

        el.scrollTop = target
        animFrameRef.current = null
        settle()
      }

      animFrameRef.current = requestAnimationFrame(tick)
    },
    [finishProgrammaticScroll],
  )

  const snapAndCommit = useCallback(
    (smooth = true) => {
      const scrollEl = scrollRef.current
      const currentOptions = optionsRef.current
      if (!scrollEl || currentOptions.length === 0 || isDraggingRef.current) return

      const index = readIndex(scrollEl.scrollTop, currentOptions.length)
      scrollToIndex(index, currentOptions.length, smooth, commitIndex)
    },
    [commitIndex, readIndex, scrollToIndex],
  )

  const applyMomentum = useCallback(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl || !isScrollingRef.current) return

    const { itemHeight } = metricsRef.current
    const maxTravel = itemHeight * PICKER_MAX_MOMENTUM_ITEMS

    if (Math.abs(scrollEl.scrollTop - momentumStartScrollRef.current) >= maxTravel) {
      velocityRef.current = 0
      isScrollingRef.current = false
      snapAndCommit(true)
      return
    }

    if (Math.abs(velocityRef.current) > MOMENTUM_MIN_VELOCITY) {
      scrollEl.scrollTop += clampPickerVelocity(velocityRef.current)
      velocityRef.current *= PICKER_MOMENTUM_FRICTION
      momentumFrameRef.current = requestAnimationFrame(applyMomentum)
      return
    }

    velocityRef.current = 0
    isScrollingRef.current = false
    snapAndCommit(false)
  }, [snapAndCommit])

  const scheduleSnap = useCallback(() => {
    if (snapTimerRef.current !== null) {
      window.clearTimeout(snapTimerRef.current)
    }

    snapTimerRef.current = window.setTimeout(() => {
      isScrollingRef.current = false
      applyMomentum()
    }, SNAP_DELAY_MS)
  }, [applyMomentum])

  const handleScroll = useCallback(() => {
    if (programmaticScrollRef.current || isDraggingRef.current) return

    const scrollEl = scrollRef.current
    if (!scrollEl) return

    const currentTime = performance.now()
    const timeDelta = currentTime - lastTimeRef.current

    if (timeDelta > 0) {
      const scrollDelta = scrollEl.scrollTop - lastScrollTopRef.current
      velocityRef.current = clampPickerVelocity(scrollDelta / timeDelta)
    }

    lastScrollTopRef.current = scrollEl.scrollTop
    lastTimeRef.current = currentTime
    isScrollingRef.current = true

    if (momentumFrameRef.current !== null) {
      cancelAnimationFrame(momentumFrameRef.current)
      momentumFrameRef.current = null
    }

    scheduleSnap()
  }, [scheduleSnap])

  const handlePick = useCallback(
    (index: number, nextValue: string) => {
      scrollToIndex(index, optionsRef.current.length, true, () => {
        commitValue(nextValue)
      })
    },
    [commitValue, scrollToIndex],
  )

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (disabled) return

      event.preventDefault()
      event.stopPropagation()

      const scrollEl = scrollRef.current
      const currentOptions = optionsRef.current
      if (!scrollEl || currentOptions.length === 0) return

      if (snapTimerRef.current !== null) {
        window.clearTimeout(snapTimerRef.current)
        snapTimerRef.current = null
      }
      if (momentumFrameRef.current !== null) {
        cancelAnimationFrame(momentumFrameRef.current)
        momentumFrameRef.current = null
      }
      isScrollingRef.current = false

      const current = readIndex(scrollEl.scrollTop, currentOptions.length)
      const delta = event.deltaY > 0 ? 1 : -1
      const next = clampIndex(current + delta, currentOptions.length)

      scrollToIndex(next, currentOptions.length, true, commitIndex)
    },
    [commitIndex, disabled, readIndex, scrollToIndex],
  )

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (disabled) return
      const touch = event.touches[0]
      if (!touch) return

      isDraggingRef.current = true
      velocityRef.current = 0
      lastTouchYRef.current = touch.clientY
      lastTimeRef.current = performance.now()

      if (snapTimerRef.current !== null) {
        window.clearTimeout(snapTimerRef.current)
        snapTimerRef.current = null
      }
      if (momentumFrameRef.current !== null) {
        cancelAnimationFrame(momentumFrameRef.current)
        momentumFrameRef.current = null
      }
    },
    [disabled],
  )

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const scrollEl = scrollRef.current
    if (!scrollEl || !isDraggingRef.current) return

    const touch = event.touches[0]
    if (!touch) return

    event.preventDefault()
    const deltaY = lastTouchYRef.current - touch.clientY
    const currentTime = performance.now()
    const timeDelta = currentTime - lastTimeRef.current

    if (timeDelta > 0) {
      velocityRef.current = clampPickerVelocity(deltaY / timeDelta)
    }

    scrollEl.scrollTop += deltaY
    lastTouchYRef.current = touch.clientY
    lastScrollTopRef.current = scrollEl.scrollTop
    lastTimeRef.current = currentTime
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!scrollRef.current) return

    isDraggingRef.current = false

    if (Math.abs(velocityRef.current) > TOUCH_MOMENTUM_THRESHOLD) {
      momentumStartScrollRef.current = scrollRef.current.scrollTop
      isScrollingRef.current = true
      applyMomentum()
      return
    }

    window.setTimeout(() => snapAndCommit(false), 50)
  }, [applyMomentum, snapAndCommit])

  useLayoutEffect(() => {
    syncMetrics()
    scrollToIndex(
      selectedIndex(optionsRef.current, valueRef.current),
      optionsRef.current.length,
      false,
    )
  }, [scrollToIndex, syncMetrics])

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return undefined

    const observer = new ResizeObserver(() => {
      syncMetrics()
      if (programmaticScrollRef.current || isDraggingRef.current || isScrollingRef.current) return
      scrollToIndex(
        selectedIndex(optionsRef.current, valueRef.current),
        optionsRef.current.length,
        false,
      )
    })
    observer.observe(scrollEl)
    return () => observer.disconnect()
  }, [scrollToIndex, syncMetrics])

  useEffect(() => {
    if (isScrollingRef.current || programmaticScrollRef.current || isDraggingRef.current) return

    if (skipValueSyncRef.current) {
      skipValueSyncRef.current = false
      return
    }

    const scrollEl = scrollRef.current
    const idx = selectedIndex(options, value)
    if (!scrollEl) {
      scrollToIndex(idx, options.length, false)
      return
    }

    if (readIndex(scrollEl.scrollTop, options.length) === idx) return
    scrollToIndex(idx, options.length, true)
  }, [options, readIndex, scrollToIndex, value])

  useEffect(
    () => () => {
      if (snapTimerRef.current !== null) window.clearTimeout(snapTimerRef.current)
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current)
      if (momentumFrameRef.current !== null) cancelAnimationFrame(momentumFrameRef.current)
    },
    [],
  )

  return (
    <div
      className="theme-picker-carousel__column"
      data-lenis-prevent-wheel
      data-lenis-prevent-touch
    >
      <div className="theme-picker-carousel__fade theme-picker-carousel__fade--top" aria-hidden />
      <div className="theme-picker-carousel__fade theme-picker-carousel__fade--bottom" aria-hidden />
      <div
        ref={scrollRef}
        className="theme-picker-carousel__scroll"
        role="listbox"
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
        onScroll={handleScroll}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="theme-picker-carousel__list">
          {options.map((option, index) => (
            <PickerCarouselItem
              key={option.value}
              option={option}
              index={index}
              selectedIndex={activeIndex}
              isSelected={option.value === value}
              disabled={disabled}
              onPick={handlePick}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

type PickerCarouselShellProps = {
  children: ReactNode
  columnCount: number
}

export function PickerCarouselShell({ children, columnCount }: PickerCarouselShellProps) {
  return (
    <div
      className="theme-picker-carousel"
      data-columns={columnCount}
      data-lenis-prevent-wheel
      data-lenis-prevent-touch
    >
      <div className="theme-picker-carousel__highlight" aria-hidden />
      <div className="theme-picker-carousel__columns">{children}</div>
    </div>
  )
}
