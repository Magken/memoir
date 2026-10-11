import {
  Braces,
  Calendar,
  CalendarClock,
  CircleDollarSign,
  Clock,
  Hash,
  List,
  Percent,
  Sigma,
  Tags,
  ToggleLeft,
  Type,
  type LucideIcon,
} from 'lucide-react'
import type { DataType } from './dataTypes'

/** Lucide icon per semantic column type — used in DataTable headers. */
export const DATA_TYPE_ICONS: Record<DataType, LucideIcon> = {
  text: Type,
  integer: Hash,
  number: Sigma,
  currency: CircleDollarSign,
  percent: Percent,
  boolean: ToggleLeft,
  date: Calendar,
  datetime: CalendarClock,
  time: Clock,
  enum: List,
  tags: Tags,
  json: Braces,
}

export function dataTypeIcon(type: DataType): LucideIcon {
  return DATA_TYPE_ICONS[type]
}
