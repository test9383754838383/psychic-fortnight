import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Parity with backend logging -- logs details structure to console
    console.error("[ErrorBoundary] Caught unhandled frontend exception:", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">Application Error</h2>
            <p className="error-message">
              {this.state.error?.message ?? "An unexpected rendering crash occurred."}
            </p>
            <button className="btn-retry" onClick={this.handleReset}>
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
