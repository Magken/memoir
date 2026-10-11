import { useLoader } from '@react-three/fiber'
import { FileLoader, Loader } from 'three'
import { decodeSplatBytes, type SplatCloud } from './decodeSplat'

class SplatAssetLoader extends Loader<SplatCloud> {
  load(
    url: string,
    onLoad: (data: SplatCloud) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (err: unknown) => void,
  ) {
    const loader = new FileLoader(this.manager)
    loader.setPath(this.path)
    loader.setResponseType('arraybuffer')
    loader.setRequestHeader(this.requestHeader)
    loader.setWithCredentials(this.withCredentials)
    loader.load(
      url,
      (buffer) => {
        decodeSplatBytes(buffer as ArrayBuffer).then(onLoad, (error: unknown) => {
          onError?.(error)
          this.manager.itemError(url)
        })
      },
      onProgress,
      onError,
    )
  }
}

export function useSplatAsset(url: string): SplatCloud {
  return useLoader(SplatAssetLoader, url)
}

export function preloadSplatAsset(url: string): void {
  useLoader.preload(SplatAssetLoader, url)
}
