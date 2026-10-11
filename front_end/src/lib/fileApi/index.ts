/**
 * fileApi — DEFINER RPC wrappers for app_files peer system.
 * Errors surface via DataApiError / KNOWN_CODES (files_*).
 */
import { callPlatform, getSupabase, getSupabaseUrl, DataApiError, unwrapPlatformEnvelope } from '../dataApi'
import type { PlatformEnvelope } from '../dataApi'

/**
 * Edge `files-sign` mints URLs against internal Docker `SUPABASE_URL` (`http://kong:8000`).
 * Browsers cannot resolve `kong` — rewrite to the public Vite API origin.
 */
function browserReachableStorageUrl(signedUrl: string): string {
  try {
    const signed = new URL(signedUrl)
    if (signed.hostname !== 'kong') return signedUrl
    const publicBase = getSupabaseUrl()
    if (!publicBase) return signedUrl
    const pub = new URL(publicBase)
    signed.protocol = pub.protocol
    signed.host = pub.host
    return signed.toString()
  } catch {
    return signedUrl
  }
}

export type FilesNodeJson = {
  id: string
  accountId: string
  parentId: string | null
  nodeKind: 'folder' | 'file' | 'document'
  kind: 'folder' | 'file'
  name: string
  docKind?: string | null
  mime?: string | null
  byteSize?: number
  storageBucket?: string | null
  storagePath?: string | null
  visibility?: 'private' | 'link' | 'public_world'
  status?: string
  starred?: boolean
  shareCount?: number
  metadata?: Record<string, unknown>
  deletedAt?: string | null
  createdAt?: string
  updatedAt?: string
  body?: unknown
  revision?: number
  snippet?: string
}

export type FilesShareRow = {
  id: string
  nodeId?: string
  role?: string
  granteeUserId?: string | null
  granteeAccountId?: string | null
  displayName?: string
  username?: string | null
  email?: string | null
  accountName?: string | null
  createdAt?: string
}

function unwrap<T>(env: PlatformEnvelope<T>): T {
  return unwrapPlatformEnvelope(env)
}

export async function listFiles(
  accountId: string,
  parentId: string | null = null,
  opts: { limit?: number; offset?: number } = {},
): Promise<FilesNodeJson[]> {
  const env = await callPlatform<FilesNodeJson[]>('app_files_list', {
    p_account_id: accountId,
    p_parent_id: parentId,
    p_limit: opts.limit ?? 100,
    p_offset: opts.offset ?? 0,
  })
  return unwrap(env) ?? []
}

export async function getFile(nodeId: string): Promise<FilesNodeJson> {
  return unwrap(await callPlatform<FilesNodeJson>('app_files_get', { p_node_id: nodeId }))
}

export async function listStarred(accountId: string): Promise<FilesNodeJson[]> {
  return (
    unwrap(
      await callPlatform<FilesNodeJson[]>('app_files_list_starred', {
        p_account_id: accountId,
        p_limit: 100,
        p_offset: 0,
      }),
    ) ?? []
  )
}

export async function listRecent(accountId: string): Promise<FilesNodeJson[]> {
  return (
    unwrap(
      await callPlatform<FilesNodeJson[]>('app_files_list_recent', {
        p_account_id: accountId,
        p_limit: 40,
      }),
    ) ?? []
  )
}

export async function listShared(): Promise<FilesNodeJson[]> {
  return (
    unwrap(
      await callPlatform<FilesNodeJson[]>('app_files_list_shared', {
        p_limit: 100,
        p_offset: 0,
      }),
    ) ?? []
  )
}

export async function listTrash(accountId: string): Promise<FilesNodeJson[]> {
  return (
    unwrap(
      await callPlatform<FilesNodeJson[]>('app_files_list_trash', {
        p_account_id: accountId,
        p_limit: 100,
        p_offset: 0,
      }),
    ) ?? []
  )
}

export async function listTree(accountId: string, maxDepth = 4): Promise<FilesNodeJson[]> {
  return (
    unwrap(
      await callPlatform<FilesNodeJson[]>('app_files_tree', {
        p_account_id: accountId,
        p_max_depth: maxDepth,
      }),
    ) ?? []
  )
}

export async function mkdir(
  accountId: string,
  name: string,
  parentId: string | null = null,
): Promise<FilesNodeJson> {
  return unwrap(
    await callPlatform<FilesNodeJson>('app_files_mkdir', {
      p_account_id: accountId,
      p_name: name,
      p_parent_id: parentId,
    }),
  )
}

export async function renameFile(nodeId: string, name: string): Promise<FilesNodeJson> {
  return unwrap(
    await callPlatform<FilesNodeJson>('app_files_rename', {
      p_node_id: nodeId,
      p_name: name,
    }),
  )
}

export async function moveFile(
  nodeId: string,
  newParentId: string | null,
): Promise<FilesNodeJson> {
  return unwrap(
    await callPlatform<FilesNodeJson>('app_files_move', {
      p_node_id: nodeId,
      p_new_parent_id: newParentId,
    }),
  )
}

export async function copyFile(
  nodeId: string,
  newParentId: string | null = null,
  newName?: string,
): Promise<FilesNodeJson> {
  return unwrap(
    await callPlatform<FilesNodeJson>('app_files_copy', {
      p_node_id: nodeId,
      p_new_parent_id: newParentId,
      p_new_name: newName ?? null,
    }),
  )
}

export async function deleteFile(nodeId: string): Promise<{ id: string; softDeleted: number }> {
  return unwrap(
    await callPlatform<{ id: string; softDeleted: number }>('app_files_delete', {
      p_node_id: nodeId,
    }),
  )
}

export async function restoreFile(nodeId: string): Promise<FilesNodeJson> {
  return unwrap(
    await callPlatform<FilesNodeJson>('app_files_restore', { p_node_id: nodeId }),
  )
}

export async function setStarred(nodeId: string, starred: boolean): Promise<FilesNodeJson> {
  return unwrap(
    await callPlatform<FilesNodeJson>('app_files_set_starred', {
      p_node_id: nodeId,
      p_starred: starred,
    }),
  )
}

export async function documentCreate(
  accountId: string,
  name: string,
  docKind: string,
  body: unknown = {},
  parentId: string | null = null,
): Promise<FilesNodeJson> {
  return unwrap(
    await callPlatform<FilesNodeJson>('app_files_document_create', {
      p_account_id: accountId,
      p_name: name,
      p_doc_kind: docKind,
      p_body: body,
      p_parent_id: parentId,
    }),
  )
}

export async function documentUpdate(nodeId: string, body: unknown): Promise<FilesNodeJson> {
  return unwrap(
    await callPlatform<FilesNodeJson>('app_files_document_update', {
      p_node_id: nodeId,
      p_body: body,
    }),
  )
}

export async function documentGet(nodeId: string): Promise<FilesNodeJson> {
  return unwrap(
    await callPlatform<FilesNodeJson>('app_files_document_get', { p_node_id: nodeId }),
  )
}

export async function uploadInit(
  accountId: string,
  name: string,
  mime: string | null,
  byteSize: number,
  parentId: string | null = null,
): Promise<FilesNodeJson & { upload?: { bucket: string; path: string; expiresIn: number } }> {
  return unwrap(
    await callPlatform('app_files_upload_init', {
      p_account_id: accountId,
      p_name: name,
      p_mime: mime,
      p_byte_size: byteSize,
      p_parent_id: parentId,
    }),
  )
}

export async function uploadComplete(nodeId: string, byteSize?: number): Promise<FilesNodeJson> {
  return unwrap(
    await callPlatform<FilesNodeJson>('app_files_upload_complete', {
      p_node_id: nodeId,
      p_byte_size: byteSize ?? null,
    }),
  )
}

export async function downloadUrlMeta(nodeId: string): Promise<{
  nodeId: string
  bucket: string
  path: string
  expiresIn: number
  public: boolean
}> {
  return unwrap(await callPlatform('app_files_download_url', { p_node_id: nodeId }))
}

/** Edge files-sign → signed URL string */
export async function getDownloadUrl(nodeId: string): Promise<string> {
  const { data, error } = await getSupabase().functions.invoke('files-sign', {
    body: { mode: 'download', nodeId },
  })
  if (error) throw new DataApiError('unknown', error.message)
  const signed = (data as { data?: { signedUrl?: string } })?.data?.signedUrl
  if (!signed) throw new DataApiError('not_found', 'signedUrl missing')
  return browserReachableStorageUrl(signed)
}

export async function getUploadSignedUrl(nodeId: string): Promise<{
  signedUrl: string
  token?: string
  path: string
  bucket: string
}> {
  const { data, error } = await getSupabase().functions.invoke('files-sign', {
    body: { mode: 'upload', nodeId },
  })
  if (error) throw new DataApiError('unknown', error.message)
  const payload = (data as { data?: Record<string, string> })?.data
  if (!payload?.signedUrl) throw new DataApiError('not_found', 'signedUrl missing')
  return {
    signedUrl: browserReachableStorageUrl(payload.signedUrl),
    token: payload.token,
    path: payload.path,
    bucket: payload.bucket,
  }
}

export type UploadBrowserFileOptions = {
  /** Byte-upload ratio 0–1 across init → PUT → complete (≈0.05 → 0.95 → 1). */
  onProgress?: (ratio: number) => void
}

function putFileWithProgress(
  signedUrl: string,
  file: File,
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return
      onProgress(event.loaded, event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new DataApiError('unknown', `upload failed: ${xhr.status}`))
    }
    xhr.onerror = () => reject(new DataApiError('unknown', 'upload failed: network error'))
    xhr.onabort = () => reject(new DataApiError('unknown', 'upload aborted'))
    xhr.send(file)
  })
}

export async function uploadBrowserFile(
  accountId: string,
  file: File,
  parentId: string | null = null,
  options: UploadBrowserFileOptions = {},
): Promise<FilesNodeJson> {
  const { onProgress } = options
  onProgress?.(0.05)
  const init = await uploadInit(accountId, file.name, file.type || null, file.size, parentId)
  onProgress?.(0.08)
  const signed = await getUploadSignedUrl(init.id)
  onProgress?.(0.1)
  await putFileWithProgress(signed.signedUrl, file, (loaded, total) => {
    const putRatio = total > 0 ? loaded / total : 1
    onProgress?.(0.1 + putRatio * 0.85)
  })
  onProgress?.(0.96)
  const node = await uploadComplete(init.id, file.size)
  onProgress?.(1)
  return node
}

export async function setVisibility(
  nodeId: string,
  visibility: 'private' | 'link' | 'public_world',
): Promise<FilesNodeJson> {
  return unwrap(
    await callPlatform<FilesNodeJson>('app_files_set_visibility', {
      p_node_id: nodeId,
      p_visibility: visibility,
    }),
  )
}

export async function shareCreate(
  nodeId: string,
  opts: { granteeUserId?: string; granteeAccountId?: string; role?: string } = {},
): Promise<Record<string, unknown>> {
  return unwrap(
    await callPlatform('app_files_share_create', {
      p_node_id: nodeId,
      p_grantee_user_id: opts.granteeUserId ?? null,
      p_grantee_account_id: opts.granteeAccountId ?? null,
      p_role: opts.role ?? 'viewer',
    }),
  )
}

export async function shareRevoke(shareId: string): Promise<Record<string, unknown>> {
  return unwrap(
    await callPlatform('app_files_share_revoke', { p_share_id: shareId }),
  )
}

export async function shareList(nodeId: string): Promise<FilesShareRow[]> {
  return (
    unwrap(await callPlatform<FilesShareRow[]>('app_files_share_list', { p_node_id: nodeId })) ??
    []
  )
}

export async function linkCreate(
  nodeId: string,
  opts: { role?: string; expiresAt?: string; maxUses?: number } = {},
): Promise<Record<string, unknown> & { token?: string }> {
  return unwrap(
    await callPlatform('app_files_link_create', {
      p_node_id: nodeId,
      p_role: opts.role ?? 'viewer',
      p_expires_at: opts.expiresAt ?? null,
      p_max_uses: opts.maxUses ?? null,
    }),
  )
}

export async function linkRevoke(linkId: string): Promise<Record<string, unknown>> {
  return unwrap(await callPlatform('app_files_link_revoke', { p_link_id: linkId }))
}

export async function linkAccess(token: string): Promise<FilesNodeJson> {
  return unwrap(await callPlatform<FilesNodeJson>('app_files_link_access', { p_token: token }))
}

export async function searchFiles(
  accountId: string,
  query: string,
  mode: 'name' | 'content' = 'name',
): Promise<FilesNodeJson[]> {
  return (
    unwrap(
      await callPlatform<FilesNodeJson[]>('app_files_search', {
        p_account_id: accountId,
        p_query: query,
        p_mode: mode,
        p_limit: 40,
      }),
    ) ?? []
  )
}

export async function usageGet(accountId: string): Promise<Record<string, unknown>> {
  return unwrap(await callPlatform('app_files_usage_get', { p_account_id: accountId }))
}

/** Re-fetch roots + current folder + folder tree (manual sync). */
export async function refresh(
  accountId: string,
  parentId: string | null = null,
): Promise<{ children: FilesNodeJson[]; tree: FilesNodeJson[] }> {
  const [children, tree] = await Promise.all([
    listFiles(accountId, parentId),
    listTree(accountId),
  ])
  return { children, tree }
}
