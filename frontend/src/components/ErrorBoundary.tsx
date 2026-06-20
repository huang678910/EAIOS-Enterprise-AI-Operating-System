"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-6 text-center">
            <p className="text-sm text-red-600 mb-3">
              {this.state.error?.message || "An error occurred"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-xs px-4 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
