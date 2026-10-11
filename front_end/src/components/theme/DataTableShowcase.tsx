import { useCallback, useRef, useState } from 'react'
import { ArrowRightLeft, FileText, Image, Newspaper, Users } from 'lucide-react'
import { DataGridEditor, type DataGridEditorHandle } from '../DataGridEditor'
import { DataTable } from '../DataTable'
import { EditorContextDemoBar } from '../editorContextParts/EditorContextDemoBar'
import { EditorFeatureTable } from './EditorFeatureTable'
import {
  DATA_TYPES,
  listOperatorsForType,
  type DataColumn,
  type DataRow,
  type DataTableSheet,
  type DataType,
} from '../../lib/data'

const DATA_TYPE_ORDER: readonly DataType[] = [
  'text',
  'integer',
  'number',
  'currency',
  'percent',
  'boolean',
  'date',
  'datetime',
  'time',
  'enum',
  'tags',
  'json',
]

const SORTABLE_TYPES = DATA_TYPE_ORDER.filter((id) => DATA_TYPES[id].sortable)
const FILTER_ONLY_TYPES = DATA_TYPE_ORDER.filter((id) => !DATA_TYPES[id].sortable)

/* ---- demo data (showcase-local) ----------------------------------------- */

const ORDER_COLUMNS: DataColumn[] = [
  { key: 'orderId', header: 'Order', dataType: 'text' },
  { key: 'status', header: 'Status', dataType: 'enum' },
  { key: 'tags', header: 'Tags', dataType: 'tags' },
  { key: 'units', header: 'Units', dataType: 'integer', align: 'end' },
  { key: 'weightKg', header: 'Weight (kg)', dataType: 'number', align: 'end' },
  { key: 'revenue', header: 'Revenue', dataType: 'currency', align: 'end' },
  { key: 'marginPct', header: 'Margin', dataType: 'percent', align: 'end' },
  { key: 'inStock', header: 'In stock', dataType: 'boolean', align: 'center' },
  { key: 'orderDate', header: 'Order date', dataType: 'date' },
  { key: 'lastSeen', header: 'Last seen', dataType: 'datetime' },
  { key: 'shipBy', header: 'Ship by', dataType: 'time' },
  { key: 'meta', header: 'Metadata', dataType: 'json' },
]

type Order = {
  orderId: string
  status: string
  tags: string[]
  units: number
  weightKg: number
  revenue: number
  marginPct: number
  inStock: boolean
  orderDate: string
  lastSeen: string
  shipBy: string
  meta: Record<string, unknown>
}

const ORDERS: Order[] = [
  { orderId: 'ORD-1042', status: 'shipped', tags: ['priority', 'gift'], units: 3, weightKg: 1.2, revenue: 248.5, marginPct: 18.5, inStock: true, orderDate: '2026-01-12', lastSeen: '2026-06-20T09:14:00', shipBy: '09:30', meta: { region: 'NA', channel: 'web' } },
  { orderId: 'ORD-1043', status: 'pending', tags: ['backorder'], units: 1, weightKg: 0.45, revenue: 79.0, marginPct: 12.0, inStock: false, orderDate: '2026-01-18', lastSeen: '2026-05-30T16:02:00', shipBy: '14:00', meta: { region: 'EU', channel: 'retail' } },
  { orderId: 'ORD-1044', status: 'delivered', tags: ['wholesale', 'priority'], units: 12, weightKg: 4.8, revenue: 1340.0, marginPct: 22.0, inStock: true, orderDate: '2026-02-02', lastSeen: '2026-06-22T11:48:00', shipBy: '08:15', meta: { region: 'APAC', channel: 'wholesale' } },
  { orderId: 'ORD-1045', status: 'processing', tags: [], units: 5, weightKg: 2.1, revenue: 412.75, marginPct: 15.5, inStock: true, orderDate: '2026-02-14', lastSeen: '2026-06-19T08:30:00', shipBy: '16:45', meta: { region: 'NA', channel: 'web' } },
  { orderId: 'ORD-1046', status: 'cancelled', tags: ['gift'], units: 2, weightKg: 0.9, revenue: 158.0, marginPct: 9.0, inStock: false, orderDate: '2026-03-01', lastSeen: '2026-04-11T13:20:00', shipBy: '11:00', meta: { region: 'EU', channel: 'web' } },
  { orderId: 'ORD-1047', status: 'shipped', tags: ['priority'], units: 8, weightKg: 3.3, revenue: 905.2, marginPct: 20.0, inStock: true, orderDate: '2026-03-09', lastSeen: '2026-06-21T19:05:00', shipBy: '10:30', meta: { region: 'LATAM', channel: 'retail' } },
  { orderId: 'ORD-1048', status: 'delivered', tags: ['clearance'], units: 1, weightKg: 0.35, revenue: 49.99, marginPct: 5.5, inStock: true, orderDate: '2026-03-22', lastSeen: '2026-06-01T07:42:00', shipBy: '13:15', meta: { region: 'NA', channel: 'web' } },
  { orderId: 'ORD-1049', status: 'pending', tags: ['wholesale'], units: 20, weightKg: 8.5, revenue: 2210.0, marginPct: 24.0, inStock: false, orderDate: '2026-04-04', lastSeen: '2026-06-23T22:11:00', shipBy: '07:45', meta: { region: 'APAC', channel: 'wholesale' } },
  { orderId: 'ORD-1050', status: 'processing', tags: ['gift', 'priority'], units: 4, weightKg: 1.75, revenue: 333.0, marginPct: 16.0, inStock: true, orderDate: '2026-04-19', lastSeen: '2026-05-12T10:00:00', shipBy: '15:30', meta: { region: 'EU', channel: 'web' } },
  { orderId: 'ORD-1051', status: 'shipped', tags: [], units: 6, weightKg: 2.4, revenue: 540.6, marginPct: 17.5, inStock: true, orderDate: '2026-05-02', lastSeen: '2026-06-24T14:37:00', shipBy: '12:00', meta: { region: 'NA', channel: 'retail' } },
  { orderId: 'ORD-1052', status: 'delivered', tags: ['backorder', 'priority'], units: 9, weightKg: 3.9, revenue: 988.0, marginPct: 19.0, inStock: false, orderDate: '2026-05-18', lastSeen: '2026-06-18T18:25:00', shipBy: '17:00', meta: { region: 'LATAM', channel: 'web' } },
  { orderId: 'ORD-1053', status: 'processing', tags: ['gift'], units: 2, weightKg: 0.8, revenue: 120.0, marginPct: 11.0, inStock: true, orderDate: '2026-06-07', lastSeen: '2026-06-25T06:50:00', shipBy: '09:00', meta: { region: 'APAC', channel: 'web' } },
  {
    orderId: 'ORD-1054',
    status: 'processing',
    tags: ['audit', 'large-payload'],
    units: 1,
    weightKg: 0.2,
    revenue: 0,
    marginPct: 0,
    inStock: true,
    orderDate: '2026-06-28',
    lastSeen: '2026-06-28T12:00:00',
    shipBy: '10:00',
    meta: {
      region: 'NA',
      channel: 'api',
      schemaVersion: 3,
      auditTrail: Array.from({ length: 24 }, (_, i) => ({
        step: i + 1,
        actor: `service-${(i % 6) + 1}`,
        action: ['validate', 'transform', 'index', 'notify', 'archive', 'reconcile'][i % 6],
        at: `2026-06-28T${String(8 + (i % 12)).padStart(2, '0')}:${String(i * 2).padStart(2, '0')}:00Z`,
        payload: { bytes: 1200 + i * 87, checksum: `sha256-${i.toString(16).padStart(8, '0')}` },
      })),
      nested: {
        customer: { id: 'cust-88421', tier: 'enterprise', flags: ['beta', 'sso', 'webhooks'] },
        shipment: {
          carriers: ['fedex', 'ups', 'dhl'],
          events: Array.from({ length: 8 }, (_, i) => ({ code: `EVT-${i}`, note: `Scan at hub ${i + 1}` })),
        },
        integrations: {
          erp: { synced: true, lastJobId: 'job-99281' },
          warehouse: { bins: ['A-12', 'B-04', 'C-19'], pickList: [101, 102, 103, 104] },
        },
      },
      notes: 'Large JSON fixture for table cell truncation preview — expand UX removed for now.',
    },
  },
]

const ORDER_ROWS: DataRow[] = ORDERS.map((o) => ({
  id: o.orderId,
  values: {
    orderId: o.orderId,
    status: o.status,
    tags: o.tags,
    units: o.units,
    weightKg: o.weightKg,
    revenue: o.revenue,
    marginPct: o.marginPct,
    inStock: o.inStock,
    orderDate: o.orderDate,
    lastSeen: o.lastSeen,
    shipBy: o.shipBy,
    meta: o.meta,
  },
}))

const CMS_STATUS_TONE = {
  draft: 'warning',
  published: 'success',
  scheduled: 'info',
  archived: 'error',
  live: 'success',
} as const

const CMS_REDIRECT_STATUS_TONE = {
  active: 'success',
  scheduled: 'warning',
  disabled: 'error',
} as const

const CMS_REDIRECT_CODE_TONE = {
  '301': 'info',
  '302': 'warning',
  '308': 'success',
} as const

const CMS_USER_ROLE_TONE = {
  admin: 'error',
  editor: 'info',
  author: 'success',
  viewer: 'warning',
} as const

const CMS_DEMO_USERS = {
  alex: {
    name: 'Alex Chen',
    imageSrc: 'https://picsum.photos/64/64?random=71',
    imageAlt: 'Alex Chen',
    shape: 'round',
  },
  jordan: {
    name: 'Jordan Lee',
    imageSrc: 'https://picsum.photos/64/64?random=72',
    imageAlt: 'Jordan Lee',
    shape: 'round',
  },
  sam: {
    name: 'Sam Oka',
    shape: 'round',
  },
  morgan: {
    name: 'Morgan Vega',
    imageSrc: 'https://picsum.photos/64/64?random=75',
    imageAlt: 'Morgan Vega',
    shape: 'round',
  },
  acme: {
    name: 'Acme Co',
    imageSrc: 'https://picsum.photos/64/64?random=73',
    imageAlt: 'Acme Co logo',
    shape: 'square',
  },
  northStudio: {
    name: 'North Studio',
    imageSrc: 'https://picsum.photos/64/64?random=74',
    imageAlt: 'North Studio logo',
    shape: 'square',
  },
} as const

const CMS_PAGE_COLUMNS: DataColumn[] = [
  { key: 'title', header: 'Title', dataType: 'text', cellDisplay: 'text' },
  { key: 'owner', header: 'Owner', dataType: 'text', cellDisplay: 'user', minWidth: '8rem' },
  {
    key: 'status',
    header: 'Status',
    dataType: 'enum',
    cellDisplay: 'status',
    toneMap: CMS_STATUS_TONE,
  },
  { key: 'tags', header: 'Tags', dataType: 'tags', cellDisplay: 'tags' },
  { key: 'featured', header: 'Featured', dataType: 'boolean', cellDisplay: 'boolean-switch', align: 'center' },
  {
    key: 'channel',
    header: 'Channel',
    dataType: 'text',
    cellDisplay: 'text-badge',
    badgeKey: 'channelStatus',
    toneMap: CMS_STATUS_TONE,
  },
  { key: 'updated', header: 'Updated', dataType: 'datetime', cellDisplay: 'text' },
  { key: 'actions', header: 'Actions', dataType: 'text', cellDisplay: 'actions', align: 'end' },
]

const CMS_POST_COLUMNS: DataColumn[] = [
  { key: 'title', header: 'Title', dataType: 'text', cellDisplay: 'text' },
  { key: 'author', header: 'Author', dataType: 'text', cellDisplay: 'user', minWidth: '8rem' },
  {
    key: 'status',
    header: 'Status',
    dataType: 'enum',
    cellDisplay: 'status',
    toneMap: CMS_STATUS_TONE,
  },
  { key: 'tags', header: 'Tags', dataType: 'tags', cellDisplay: 'tags' },
  { key: 'updated', header: 'Updated', dataType: 'datetime', cellDisplay: 'text' },
  { key: 'actions', header: 'Actions', dataType: 'text', cellDisplay: 'actions', align: 'end' },
]

const CMS_MEDIA_COLUMNS: DataColumn[] = [
  { key: 'title', header: 'Asset', dataType: 'text', cellDisplay: 'text' },
  {
    key: 'status',
    header: 'Status',
    dataType: 'enum',
    cellDisplay: 'status',
    toneMap: CMS_STATUS_TONE,
  },
  { key: 'tags', header: 'Tags', dataType: 'tags', cellDisplay: 'chips' },
  { key: 'actions', header: 'Actions', dataType: 'text', cellDisplay: 'actions', align: 'end' },
]

const CMS_USER_COLUMNS: DataColumn[] = [
  { key: 'member', header: 'Member', dataType: 'text', cellDisplay: 'user', minWidth: '8.5rem' },
  {
    key: 'organization',
    header: 'Organization',
    dataType: 'text',
    cellDisplay: 'user',
    minWidth: '8.5rem',
  },
  { key: 'team', header: 'Team', dataType: 'json', cellDisplay: 'users', minWidth: '10rem' },
  {
    key: 'role',
    header: 'Role',
    dataType: 'enum',
    cellDisplay: 'dot-text',
    toneMap: CMS_USER_ROLE_TONE,
  },
  {
    key: 'status',
    header: 'Status',
    dataType: 'enum',
    cellDisplay: 'status',
    toneMap: CMS_STATUS_TONE,
  },
  { key: 'updated', header: 'Updated', dataType: 'datetime', cellDisplay: 'text' },
  { key: 'actions', header: 'Actions', dataType: 'text', cellDisplay: 'actions', align: 'end' },
]

const CMS_REDIRECT_COLUMNS: DataColumn[] = [
  { key: 'from', header: 'From', dataType: 'text', cellDisplay: 'link', minWidth: '9rem' },
  { key: 'to', header: 'To', dataType: 'text', cellDisplay: 'link', minWidth: '9rem' },
  {
    key: 'code',
    header: 'Type',
    dataType: 'enum',
    cellDisplay: 'dot-text',
    toneMap: CMS_REDIRECT_CODE_TONE,
    align: 'center',
  },
  {
    key: 'status',
    header: 'Status',
    dataType: 'enum',
    cellDisplay: 'dot-text',
    toneMap: CMS_REDIRECT_STATUS_TONE,
  },
  { key: 'updated', header: 'Updated', dataType: 'datetime', cellDisplay: 'text' },
  { key: 'actions', header: 'Actions', dataType: 'text', cellDisplay: 'actions', align: 'end'   },
]

const CMS_PAGE_ROW_OWNERS = [
  CMS_DEMO_USERS.alex,
  CMS_DEMO_USERS.jordan,
  CMS_DEMO_USERS.morgan,
  CMS_DEMO_USERS.sam,
] as const

const CMS_PAGE_ROW_STATUSES = ['published', 'draft', 'scheduled', 'archived'] as const

const CMS_PAGE_ROWS_STATIC: DataRow[] = [
  {
    id: 'page-home',
    values: {
      title: 'Homepage',
      owner: CMS_DEMO_USERS.alex,
      status: 'published',
      tags: ['hero', 'seo'],
      featured: true,
      channel: 'Marketing',
      channelStatus: 'live',
      updated: '2026-06-27T14:20:00',
      actions: ['edit', 'duplicate'],
    },
  },
  {
    id: 'page-pricing',
    values: {
      title: 'Pricing',
      owner: CMS_DEMO_USERS.jordan,
      status: 'draft',
      tags: ['sales'],
      featured: false,
      channel: 'Product',
      channelStatus: 'draft',
      updated: '2026-06-26T09:05:00',
      actions: ['edit', 'duplicate', 'delete'],
    },
  },
  {
    id: 'page-docs',
    values: {
      title: 'Documentation hub',
      owner: CMS_DEMO_USERS.morgan,
      status: 'scheduled',
      tags: ['docs', 'nav'],
      featured: true,
      channel: 'Support',
      channelStatus: 'scheduled',
      updated: '2026-06-25T18:40:00',
      actions: ['edit'],
    },
  },
  {
    id: 'page-archive',
    values: {
      title: 'Legacy landing',
      owner: CMS_DEMO_USERS.sam,
      status: 'archived',
      tags: ['legacy'],
      featured: false,
      channel: 'Marketing',
      channelStatus: 'archived',
      updated: '2026-05-12T11:00:00',
      actions: ['edit', 'delete'],
    },
  },
]

const CMS_PAGE_ROWS_GENERATED: DataRow[] = Array.from({ length: 96 }, (_, index) => {
  const n = index + 5
  const status = CMS_PAGE_ROW_STATUSES[index % CMS_PAGE_ROW_STATUSES.length]
  return {
    id: `page-gen-${n}`,
    values: {
      title: `Landing page ${n}`,
      owner: CMS_PAGE_ROW_OWNERS[index % CMS_PAGE_ROW_OWNERS.length],
      status,
      tags: index % 3 === 0 ? ['seo'] : index % 3 === 1 ? ['campaign'] : ['content'],
      featured: index % 5 === 0,
      channel: ['Marketing', 'Product', 'Support'][index % 3],
      channelStatus: status,
      updated: `2026-06-${String(1 + (index % 28)).padStart(2, '0')}T12:00:00`,
      actions: index % 4 === 0 ? ['edit', 'delete'] : ['edit'],
    },
  }
})

const CMS_PAGE_ROWS: DataRow[] = [...CMS_PAGE_ROWS_STATIC, ...CMS_PAGE_ROWS_GENERATED]

const CMS_POST_ROWS: DataRow[] = [
  {
    id: 'post-1',
    values: {
      title: 'Launch recap',
      author: CMS_DEMO_USERS.alex,
      status: 'published',
      tags: ['news', 'product'],
      updated: '2026-06-24T10:00:00',
      actions: ['edit', 'duplicate'],
    },
  },
  {
    id: 'post-2',
    values: {
      title: 'Editorial calendar Q3',
      author: CMS_DEMO_USERS.jordan,
      status: 'draft',
      tags: ['planning'],
      updated: '2026-06-22T16:30:00',
      actions: ['edit', 'delete'],
    },
  },
]

const CMS_MEDIA_ROWS: DataRow[] = [
  {
    id: 'media-1',
    values: {
      title: 'hero-banner.webp',
      status: 'published',
      tags: ['hero', 'webp'],
      actions: ['edit'],
    },
  },
  {
    id: 'media-2',
    values: {
      title: 'team-photo.jpg',
      status: 'draft',
      tags: ['people'],
      actions: ['edit', 'delete'],
    },
  },
]

const CMS_USER_ROWS: DataRow[] = [
  {
    id: 'user-1',
    values: {
      member: CMS_DEMO_USERS.alex,
      organization: CMS_DEMO_USERS.acme,
      team: [CMS_DEMO_USERS.alex, CMS_DEMO_USERS.jordan, CMS_DEMO_USERS.sam],
      role: 'admin',
      status: 'published',
      updated: '2026-06-27T11:15:00',
      actions: ['edit'],
    },
  },
  {
    id: 'user-2',
    values: {
      member: CMS_DEMO_USERS.jordan,
      organization: CMS_DEMO_USERS.northStudio,
      team: [CMS_DEMO_USERS.jordan, CMS_DEMO_USERS.morgan],
      role: 'editor',
      status: 'published',
      updated: '2026-06-26T16:40:00',
      actions: ['edit', 'duplicate'],
    },
  },
  {
    id: 'user-3',
    values: {
      member: CMS_DEMO_USERS.sam,
      organization: CMS_DEMO_USERS.acme,
      team: [CMS_DEMO_USERS.sam],
      role: 'author',
      status: 'draft',
      updated: '2026-06-24T09:20:00',
      actions: ['edit', 'delete'],
    },
  },
  {
    id: 'user-4',
    values: {
      member: CMS_DEMO_USERS.morgan,
      organization: CMS_DEMO_USERS.northStudio,
      team: [CMS_DEMO_USERS.morgan, CMS_DEMO_USERS.alex, CMS_DEMO_USERS.jordan],
      role: 'viewer',
      status: 'scheduled',
      updated: '2026-06-22T13:05:00',
      actions: ['edit'],
    },
  },
]

const CMS_REDIRECT_ROWS: DataRow[] = [
  {
    id: 'redir-1',
    values: {
      from: '/old-blog/*',
      to: '/articles/*',
      code: '301',
      status: 'active',
      updated: '2026-06-20T08:00:00',
      actions: ['edit', 'delete'],
    },
  },
  {
    id: 'redir-2',
    values: {
      from: '/promo',
      to: '/pricing',
      code: '302',
      status: 'scheduled',
      updated: '2026-06-18T12:00:00',
      actions: ['edit'],
    },
  },
  {
    id: 'redir-3',
    values: {
      from: '/legacy-app',
      to: 'https://docs.example.com/start',
      code: '301',
      status: 'active',
      updated: '2026-06-15T09:30:00',
      actions: ['edit', 'duplicate'],
    },
  },
  {
    id: 'redir-4',
    values: {
      from: '/sunset-campaign',
      to: '/home',
      code: '308',
      status: 'disabled',
      updated: '2026-05-02T14:00:00',
      actions: ['edit', 'delete'],
    },
  },
]

const CMS_SHEETS: DataTableSheet[] = [
  { id: 'pages', label: 'Pages', icon: FileText, columns: CMS_PAGE_COLUMNS, rows: CMS_PAGE_ROWS },
  { id: 'posts', label: 'Posts', icon: Newspaper, columns: CMS_POST_COLUMNS, rows: CMS_POST_ROWS },
  { id: 'media', label: 'Media', icon: Image, columns: CMS_MEDIA_COLUMNS, rows: CMS_MEDIA_ROWS },
  { id: 'users', label: 'Users', icon: Users, columns: CMS_USER_COLUMNS, rows: CMS_USER_ROWS },
  {
    id: 'redirects',
    label: 'Redirects',
    icon: ArrowRightLeft,
    columns: CMS_REDIRECT_COLUMNS,
    rows: CMS_REDIRECT_ROWS,
  },
]

function DashboardTableDemo() {
  const [cmsRows, setCmsRows] = useState(CMS_PAGE_ROWS)

  const handleBooleanChange = useCallback((rowId: string, columnKey: string, next: boolean) => {
    setCmsRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, values: { ...row.values, [columnKey]: next } } : row,
      ),
    )
  }, [])

  const handleAction = useCallback((rowId: string, actionId: string) => {
    console.debug('[DashboardTableDemo]', { rowId, actionId })
  }, [])

  const handleRefresh = useCallback(() => {
    setCmsRows(CMS_PAGE_ROWS)
  }, [])

  const sheetsWithLivePages = CMS_SHEETS.map((sheet) =>
    sheet.id === 'pages' ? { ...sheet, rows: cmsRows } : sheet,
  )

  return (
    <DataTable
      tableKey="demo.cms-dashboard"
      variant="dashboard"
      title="Site content"
      sheets={sheetsWithLivePages}
      columns={CMS_PAGE_COLUMNS}
      rows={cmsRows}
      exportBasename="cms-content"
      onBooleanChange={handleBooleanChange}
      onAction={handleAction}
      onRefresh={handleRefresh}
      pageSize={10}
    />
  )
}

const FULFILLMENT_COLUMNS: DataColumn[] = [
  { key: 'orderId', header: 'Order', dataType: 'text' },
  { key: 'status', header: 'Status', dataType: 'enum' },
  { key: 'units', header: 'Units', dataType: 'integer', align: 'end' },
  { key: 'shipBy', header: 'Ship by', dataType: 'time' },
  { key: 'inStock', header: 'In stock', dataType: 'boolean', align: 'center' },
]

const FINANCE_COLUMNS: DataColumn[] = [
  { key: 'orderId', header: 'Order', dataType: 'text' },
  { key: 'revenue', header: 'Revenue', dataType: 'currency', align: 'end' },
  { key: 'marginPct', header: 'Margin', dataType: 'percent', align: 'end' },
  { key: 'weightKg', header: 'Weight (kg)', dataType: 'number', align: 'end' },
  { key: 'orderDate', header: 'Order date', dataType: 'date' },
]

const INVENTORY_COLUMNS: DataColumn[] = [
  { key: 'orderId', header: 'Order', dataType: 'text' },
  { key: 'units', header: 'Units', dataType: 'integer', align: 'end' },
  { key: 'weightKg', header: 'Weight (kg)', dataType: 'number', align: 'end' },
  { key: 'inStock', header: 'In stock', dataType: 'boolean', align: 'center' },
  { key: 'tags', header: 'Tags', dataType: 'tags' },
]

const RETURNS_COLUMNS: DataColumn[] = [
  { key: 'orderId', header: 'Order', dataType: 'text' },
  { key: 'status', header: 'Status', dataType: 'enum' },
  { key: 'revenue', header: 'Revenue', dataType: 'currency', align: 'end' },
  { key: 'lastSeen', header: 'Last seen', dataType: 'datetime' },
]

const CHANNEL_COLUMNS: DataColumn[] = [
  { key: 'orderId', header: 'Order', dataType: 'text' },
  { key: 'status', header: 'Status', dataType: 'enum' },
  { key: 'meta', header: 'Metadata', dataType: 'json' },
]

const ORDER_SHEETS = [
  { id: 'orders-all', label: 'All orders', columns: ORDER_COLUMNS, rows: ORDER_ROWS },
  { id: 'orders-fulfillment', label: 'Fulfillment', columns: FULFILLMENT_COLUMNS, rows: ORDER_ROWS },
  { id: 'orders-finance', label: 'Finance', columns: FINANCE_COLUMNS, rows: ORDER_ROWS },
  { id: 'orders-inventory', label: 'Inventory', columns: INVENTORY_COLUMNS, rows: ORDER_ROWS },
  { id: 'orders-returns', label: 'Returns', columns: RETURNS_COLUMNS, rows: ORDER_ROWS },
  { id: 'orders-channels', label: 'Channels', columns: CHANNEL_COLUMNS, rows: ORDER_ROWS },
]

export function DataTableShowcase() {
  const gridEditorRef = useRef<DataGridEditorHandle>(null)
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <p className="type-overline">Typed data tables</p>
        <p className="type-body-sm type-muted prose-measure">
          The <code className="type-code">DataTable</code> reads a column&rsquo;s{' '}
          <code className="type-code">dataType</code> from the data-type context (
          <code className="type-code">lib/data</code>) to drive per-column filters, single-column
          sort, display formatting, and typed CSV / JSON export. Each type carries its own operator
          set &mdash; twelve semantic types including <code className="type-code">time</code>,{' '}
          <code className="type-code">enum</code>, <code className="type-code">tags</code>,{' '}
          <code className="type-code">currency</code>, and <code className="type-code">percent</code>{' '}
          &mdash; so the filter popover is fully schema-driven. The same typed columns are designed
          to feed charts later.
        </p>

        <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
          <p className="type-overline mb-2">Column sort</p>
          <ul className="type-body-sm type-muted list-disc space-y-1 pl-5">
            <li>
              Click a header sort icon: ascending &rarr; descending &rarr; off (picking another column
              starts at ascending).
            </li>
            <li>
              Sortable types:{' '}
              {SORTABLE_TYPES.map((id, index) => (
                <span key={id}>
                  {index > 0 ? ', ' : null}
                  <code className="type-code">{id}</code>
                </span>
              ))}
              .
            </li>
            <li>
              Not sortable:{' '}
              {FILTER_ONLY_TYPES.map((id, index) => (
                <span key={id}>
                  {index > 0 ? ', ' : null}
                  <code className="type-code">{id}</code>
                </span>
              ))}
              .
            </li>
            <li>Empty or invalid cell values always sort last.</li>
            <li>
              Comparators: text/enum locale compare; integer/number/currency/percent subtract; boolean
              false&nbsp;&lt;&nbsp;true; date/datetime timestamps; time as minutes since midnight;
              tags as sorted join.
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="type-overline">Data types &amp; filter operators</p>
          <p className="type-body-sm type-muted prose-measure">
            Pulled from <code className="type-code">DATA_TYPES</code> and{' '}
            <code className="type-code">listOperatorsForType</code> in{' '}
            <code className="type-code">lib/data</code> — the same registry the filter popover reads.
            Rules within a column are AND-ed; toggle a rule off without deleting it.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {DATA_TYPE_ORDER.map((id) => {
              const descriptor = DATA_TYPES[id]
              const operators = listOperatorsForType(id)

              return (
                <div
                  key={id}
                  className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <code className="type-code type-label">{id}</code>
                    <span className="type-caption type-faint">{descriptor.label}</span>
                  </div>
                  <p className="type-caption type-muted mt-1">
                    Sort: {descriptor.sortable ? 'yes' : 'no'}
                    {descriptor.chartRole ? (
                      <>
                        {' '}
                        &middot; chart role{' '}
                        <code className="type-code">{descriptor.chartRole}</code>
                      </>
                    ) : null}
                  </p>
                  <p className="type-overline mb-1 mt-3">Filters</p>
                  <ul className="type-body-sm type-muted list-disc space-y-0.5 pl-5">
                    {operators.map((op) => (
                      <li key={op.id}>{op.label}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
            <p className="type-overline mb-1">Per-column filters</p>
            <ul className="type-body-sm type-muted list-disc space-y-1 pl-5">
              <li>Operators come from the column type (e.g. <code className="type-code">between</code>, <code className="type-code">has tag</code>).</li>
              <li>Rules within a column are AND-ed; toggle one off without deleting it.</li>
              <li>JSON columns filter on text, deep key/value, and list index.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4">
            <p className="type-overline mb-1">Export</p>
            <ul className="type-body-sm type-muted list-disc space-y-1 pl-5">
              <li>Export CSV (with a data-type row) or a typed JSON bundle.</li>
              <li>All rows or just the current selection.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="w-full min-w-0 space-y-4">
        <div className="space-y-2">
          <p className="type-overline">Spreadsheet editor</p>
          <p className="type-body-sm type-muted prose-measure">
            Editable canvas grid on{' '}
            <code className="type-code">@glideapps/glide-data-grid</code> —{' '}
            <code className="type-code">mode=&quot;edit&quot;</code> for full spreadsheet chrome
            (cell edit, fill handle, paste, undo, add row/column);{' '}
            <code className="type-code">mode=&quot;view&quot;</code> for read-only browse with search,
            copy, and export. Upstream mirror:{' '}
            <code className="type-code">item-reference/front-end/glide-data-grid</code>.
          </p>
        </div>
        <EditorFeatureTable kind="grid" />
        <EditorContextDemoBar targetKind="grid" runtimeRef={gridEditorRef} />
        <DataGridEditor
          ref={gridEditorRef}
          className="theme-data-grid-editor--showcase"
          initialTitle="Product orders"
          mode="edit"
        />
        <DataGridEditor
          className="theme-data-grid-editor--showcase"
          initialTitle="Product orders (view)"
          mode="view"
        />
      </section>

      <section className="w-full min-w-0 space-y-4">
        <DataTable
          tableKey="demo.product-orders"
          title="Product orders"
          sheets={ORDER_SHEETS}
          columns={ORDER_COLUMNS}
          rows={ORDER_ROWS}
          exportBasename="product-orders"
          onRefresh={() => {
            console.debug('[DataTableShowcase] refresh product orders')
          }}
        />
      </section>

      <section className="w-full min-w-0 space-y-4">
        <div className="space-y-2">
          <p className="type-overline">Dashboard variant</p>
          <p className="type-body-sm type-muted prose-measure">
            <code className="type-code">variant=&quot;dashboard&quot;</code> — dense padding, compact sheet
            tabs, footer pagination (Pages sheet has 100 rows at 10 per page), and typed cell toolkit (status
            badges, user chips, tags, switches, row actions). Toggle Featured or use action icons; check the
            console for action events.
          </p>
        </div>
        <DashboardTableDemo />
      </section>
    </div>
  )
}
