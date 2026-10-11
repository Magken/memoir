import type { DataGridSheet } from './sheetModel'
import { normalizeSheet } from './sheetModel'

export function createSeedSheet(): DataGridSheet {
  return normalizeSheet({
    columns: [
      { id: 'orderId', title: 'Order', width: 108 },
      { id: 'status', title: 'Status', width: 96 },
      { id: 'tags', title: 'Tags', width: 140 },
      { id: 'units', title: 'Units', width: 72 },
      { id: 'revenue', title: 'Revenue', width: 96 },
      { id: 'marginPct', title: 'Margin %', width: 88 },
      { id: 'inStock', title: 'In stock', width: 80 },
      { id: 'orderDate', title: 'Order date', width: 108 },
    ],
    rows: [
      ['ORD-1042', 'shipped', 'priority, gift', '3', '248.50', '18.5', 'yes', '2026-01-12'],
      ['ORD-1043', 'pending', 'backorder', '1', '79.00', '12.0', 'no', '2026-01-18'],
      ['ORD-1044', 'delivered', 'wholesale, priority', '12', '1340.00', '22.0', 'yes', '2026-02-02'],
      ['ORD-1045', 'processing', '', '5', '412.75', '15.5', 'yes', '2026-02-14'],
      ['ORD-1046', 'cancelled', 'gift', '2', '158.00', '9.0', 'no', '2026-03-01'],
      ['ORD-1047', 'shipped', 'priority', '8', '905.20', '20.0', 'yes', '2026-03-09'],
      ['ORD-1048', 'delivered', 'clearance', '1', '49.99', '5.5', 'yes', '2026-03-22'],
      ['ORD-1049', 'pending', 'wholesale', '20', '2210.00', '24.0', 'no', '2026-04-04'],
      ['ORD-1050', 'processing', 'gift, priority', '4', '333.00', '16.0', 'yes', '2026-04-19'],
      ['ORD-1051', 'shipped', '', '6', '540.60', '17.5', 'yes', '2026-05-02'],
      ['ORD-1052', 'delivered', 'backorder, priority', '9', '988.00', '19.0', 'no', '2026-05-18'],
      ['ORD-1053', 'processing', 'gift', '2', '120.00', '11.0', 'yes', '2026-06-07'],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
    ],
  })
}

export function createEmptySheet(colCount = 6, rowCount = 24): DataGridSheet {
  const columns = Array.from({ length: colCount }, (_, index) => ({
    id: `col-${index + 1}`,
    title: `Column ${index + 1}`,
    width: 120,
  }))
  const rows = Array.from({ length: rowCount }, () =>
    Array.from({ length: colCount }, () => ''),
  )
  return { columns, rows }
}
