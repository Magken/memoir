import { Component, type ErrorInfo, type ReactNode } from 'react'

type AssetBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
  onError?: (message: string) => void
}

type AssetBoundaryState = {
  message: string | null
}

export class AssetBoundary extends Component<AssetBoundaryProps, AssetBoundaryState> {
  state: AssetBoundaryState = { message: null }

  static getDerivedStateFromError(error: unknown): AssetBoundaryState {
    const message = error instanceof Error ? error.message : String(error)
    return { message: message || 'Failed to load 3D asset' }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError?.(error.message)
  }

  componentDidUpdate(prev: AssetBoundaryProps) {
    if (prev.children !== this.props.children && this.state.message) {
      this.setState({ message: null })
    }
  }

  render() {
    if (!this.state.message) return this.props.children
    // Canvas-safe: never mount a DOM node here. Panel copy goes through onError.
    return this.props.fallback !== undefined ? this.props.fallback : null
  }
}
