import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Changing this value clears a caught error (e.g. the route). */
  resetKey?: unknown;
  onHome?: () => void;
}

interface State {
  error: Error | null;
  resetKey: unknown;
}

/**
 * Last line of defence for rendering errors. Without it React unmounts the
 * whole tree and the user is left with a blank page. Saved data is never
 * touched here: autosave has already written every committed change.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error: Error): void {
    console.error('Garden Toolkit crashed while rendering', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="home" role="alert">
        <div className="home-inner">
          <div className="empty-state">
            <h2>Something went wrong</h2>
            <p>This view could not be displayed. Your saved projects are still stored in this browser.</p>
            <pre className="small" style={{ textAlign: 'left', whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
            <button className="btn primary" onClick={() => this.props.onHome?.()}>
              Back to projects
            </button>{' '}
            <button className="btn" onClick={() => location.reload()}>
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
