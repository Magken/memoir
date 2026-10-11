declare module 'flubber' {
  export function interpolate(
    fromShape: string | number[][],
    toShape: string | number[][],
    options?: { maxSegmentLength?: number },
  ): (t: number) => string
}
