import type { ComponentProps } from 'react'
import { DataUpload } from './DataUpload'

type FileInputProps = Omit<ComponentProps<typeof DataUpload>, 'layout'>

/** Simple file picker — delegates to [DataUpload](DataUpload.tsx) with compact list (no previews). */
export function FileInput(props: FileInputProps) {
  return <DataUpload {...props} preview="none" />
}

export type { ValidateOn, ValidationRule } from './DataUpload'
