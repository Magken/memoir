export type {
  DataApiErrorCode,
  FieldConstraints,
  FieldSpec,
  FieldType,
  FilterClause,
  FilterInput,
  FilterOp,
  FetchOptions,
  FetchResult,
  PageMeta,
  PlatformEnvelope,
  ResourceKey,
  SortSpec,
  WriteOptions,
} from './types'
export { DataApiError } from './types'
export {
  KNOWN_DATA_API_CODES,
  mapRpcError,
  resolveDataApiErrorCode,
  toUserMessage,
  unwrapPlatformEnvelope,
} from './errors'
export { DATA_API_CAPABILITIES } from './capabilities'
export { RESOURCE_CATALOG, getResourceCatalog } from './resourceCatalog'
export {
  getSupabase,
  getSupabaseUrl,
  getSupabasePublicKey,
  hasSupabasePublicConfig,
  callPlatform,
  fetchResource,
  fetchResourceLegacy,
  fetchResourceOne,
  existsResource,
  countResource,
  createResource,
  createResources,
  updateResource,
  updateResources,
  upsertResource,
  deleteResource,
  deleteResources,
  describeResource,
} from './client'
