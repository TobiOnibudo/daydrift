import { Component, type ErrorInfo, type ReactNode } from 'react';

import { ErrorState } from './states';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
}

/** Last line of defence: a render error shows a recoverable message instead of a blank page. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="container py-16">
        <ErrorState
          title="Something went off route"
          description="An unexpected error stopped this page from loading. Reloading usually fixes it."
          action={<Button onClick={() => window.location.reload()}>Reload the page</Button>}
        />
      </div>
    );
  }
}
