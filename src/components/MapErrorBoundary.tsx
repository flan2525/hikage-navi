import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; resetKey: number; fallback: ReactNode; onError: (error: Error) => void }
type State = { hasError: boolean }

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError(): State { return { hasError: true } }
  componentDidCatch(error: Error, _info: ErrorInfo) { this.props.onError(error) }
  componentDidUpdate(previous: Props) { if (previous.resetKey !== this.props.resetKey && this.state.hasError) this.setState({ hasError: false }) }
  render() { return this.state.hasError ? this.props.fallback : this.props.children }
}
