import { useRef } from 'react'
import { TestForm, type TestFormHandle } from '../TestForm'
import { EditorContextDemoBar } from '../editorContextParts/EditorContextDemoBar'
import { EditorActionSpineLab } from './EditorActionSpineLab'
import { EditorFeatureTable } from './EditorFeatureTable'

export function TestFormShowcase() {
  const editorRef = useRef<TestFormHandle>(null)

  return (
    <div className="space-y-8">
      <p className="type-body-sm type-muted prose-measure">
        Screening / standardized test workbench — author questions and answer keys, take without the
        key, then review auto-scored results. Sample includes Formats (number, email, phone, date),
        optional fields, required Submit checks, and reject lists on short / fill-blank keys. Export
        full JSON for Drive (<code className="type-code">doc_kind=form</code>) or strip the key for
        candidate payloads.
      </p>
      <EditorFeatureTable kind="testform" />
      <EditorContextDemoBar targetKind="testform" runtimeRef={editorRef} />
      <EditorActionSpineLab kind="testform" runtimeRef={editorRef} />
      <TestForm ref={editorRef} className="theme-test-form--showcase" />
    </div>
  )
}
