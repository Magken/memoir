import { HOME_ASSETS, type HomeAsset } from './catalog.ts'

/** Every Home public still, poster, frame, and reel URL. */
export function homeMediaSrcs(): readonly string[] {
  const srcs: string[] = []
  for (const asset of Object.values(HOME_ASSETS) as HomeAsset[]) {
    srcs.push(asset.src)
    if (asset.poster) srcs.push(asset.poster)
    if (asset.frames) srcs.push(...asset.frames)
  }
  return srcs
}
