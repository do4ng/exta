import React from 'react';

export interface ErrorBoundaryProps {
  children?: React.ReactNode;
  errorComponent?: (props: { error: Error }) => React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (this.props.onError) this.props.onError(error, info);
    else console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      const ErrorComp = this.props.errorComponent;
      if (ErrorComp && this.state.error) {
        return React.createElement(ErrorComp, {
          error: this.state.error,
          status: 'Client Error',
          message: this.state.error.message,
        } as any);
      }
      return React.createElement('div', null, 'Something went wrong.');
    }
    return React.createElement(React.Fragment, null, this.props.children);
  }
}

export default ErrorBoundary;
