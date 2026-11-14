import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isChunkLoadError } from '../../lib/errors';

/**
 * Error boundaries keep one broken screen, step or game from taking the whole
 * app down. They never touch saved progress: progress is written to storage as
 * it changes, so a learner who reloads or tries again keeps everything earned.
 */

export interface ErrorFallbackProps {
  error: unknown;
  /** Clears the error and renders the children again. */
  reset: () => void;
  /**
   * The failure was a download of the app's own code. Browsers remember a failed
   * module download for the rest of the visit, so only a page reload fetches it again.
   */
  chunkError: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (props: ErrorFallbackProps) => ReactNode;
  /** Changing any of these values clears the error, for example a new route, step or game attempt. */
  resetKeys?: readonly unknown[];
  onError?: (error: unknown, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: unknown;
  failed: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, failed: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error, failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.failed && !sameKeys(prev.resetKeys, this.props.resetKeys)) this.reset();
  }

  reset = () => this.setState({ error: null, failed: false });

  render() {
    if (!this.state.failed) return this.props.children;
    return this.props.fallback({ error: this.state.error, reset: this.reset, chunkError: isChunkLoadError(this.state.error) });
  }
}

function sameKeys(a: readonly unknown[] = [], b: readonly unknown[] = []): boolean {
  return a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
}
