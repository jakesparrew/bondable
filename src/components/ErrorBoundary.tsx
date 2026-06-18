import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Note: Error boundaries can't use hooks, so we'll need to handle translations differently

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo: errorInfo.componentStack,
    });

    // Log error to monitoring service in production
    if (import.meta.env.PROD) {
      // TODO: Replace with proper error monitoring service
      console.error('Error Boundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full bg-[#111111] border-[#1f1f23]">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <CardTitle className="text-white">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-400 text-sm">
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <details className="text-left">
                  <summary className="text-red-400 cursor-pointer text-sm">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 p-2 bg-[#0a0a0a] border border-[#1f1f23] rounded text-xs text-red-300 overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo}
                  </pre>
                </details>
              )}

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  size="sm"
                  className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  size="sm"
                  className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950"
                >
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;