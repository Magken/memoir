import type { ComponentProps } from 'react'
import { Input } from './Input'

export { DatePicker } from './DatePicker'
export { TimePicker } from './TimePicker'

type DateInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'prefix'>

/** Native browser date field — one calendar icon (no duplicate prefix). */
export function DateInput(props: DateInputProps) {
  return <Input type="date" controlClassName="theme-field__control--date" {...props} />
}

type TimeInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'prefix'>

/** Native browser time field — one clock icon (no duplicate prefix). */
export function TimeInput(props: TimeInputProps) {
  return <Input type="time" controlClassName="theme-field__control--time" {...props} />
}
