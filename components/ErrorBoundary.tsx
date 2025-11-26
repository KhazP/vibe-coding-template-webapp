
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./UI";

interface Props {
  children?: ReactNode;
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
  
  public readonly props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#020202] text-slate-200 p-4">
          <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2 font-display">Something went wrong</h2>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              We encountered an unexpected error. Don't worry, your data is auto-saved locally.
            </p>
            {this.state.error && (
              <div className="bg-black/50 border border-white/5 p-4 rounded-lg mb-6 text-left overflow-auto max-h-32 custom-scrollbar">
                <code className="text-xs font-mono text-red-300 block whitespace-pre-wrap">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <Button 
                onClick={() => window.location.reload()} 
                className="w-full justify-center bg-white/5 hover:bg-white/10"
            >
              <RefreshCw size={16} /> Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
