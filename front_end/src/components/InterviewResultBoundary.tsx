import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'

type InterviewResultBoundaryProps = {
  /** Named in the fallback so a recruiter can say which panel died. */
  surface?: string
  /** Serialised beside the message so a broken package is still debuggable. */
  detail?: unknown
  children: ReactNode
}

type InterviewResultBoundaryState = {
  error: Error | null
}

function detailDump(detail: unknown): string {
  if (detail === undefined) return ''
  try {
    return JSON.stringify(detail, null, 2)
  } catch {
    return String(detail)
  }
}

/**
 * Keeps one bad grain from blanking the whole report.
 *
 * The results path builds its packages inside render-time memos, so a malformed analysis
 * row throws during commit and React unmounts the tree — the recruiter sees an empty
 * overlay with nothing to report. This degrades to a readable notice instead.
 */
export class InterviewResultBoundary extends Component<
  InterviewResultBoundaryProps,
  InterviewResultBoundaryState
> {
  state: InterviewResultBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): InterviewResultBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[interview-result]', this.props.surface ?? 'results', error, info.componentStack)
  }

  private reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const dump = detailDump(this.props.detail)
    return (
      <div className="theme-interview-result-boundary flex w-full min-w-0 flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <h2 className="type-body-lg m-0">
            {this.props.surface ? `${this.props.surface} could not be shown` : 'This report could not be shown'}
          </h2>
        </div>
        <p className="type-body type-muted m-0">
          The marking data for this attempt is incomplete or malformed, so this panel was skipped.
          The rest of the report is unaffected.
        </p>
        <p className="type-body-sm type-muted m-0 font-mono">{error.message}</p>
        <span className="self-start">
          <Button size="sm" variant="ghost" onClick={this.reset}>
            Try again
          </Button>
        </span>
        {dump ? (
          <details className="theme-interview-result-boundary__dump">
            <summary className="type-body-sm type-muted cursor-pointer">Raw package</summary>
            <pre className="type-body-sm m-0 mt-2 max-h-64 overflow-auto whitespace-pre-wrap">
              {dump}
            </pre>
          </details>
        ) : null}
      </div>
    )
  }
}
