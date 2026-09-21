import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  State
> {
  public state: State = {
    hasError: false,
    errorMsg: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught component error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-slate-50 p-8 text-center font-sans">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-red-100 max-w-md w-full">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              A critical error occurred while rendering this component. Our team
              has been notified.
            </p>
            <div className="bg-slate-100 p-3 rounded font-mono text-[10px] text-slate-600 text-left overflow-x-auto mb-6">
              {this.state.errorMsg || "Unknown Error"}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-slate-900 hover:bg-black text-white font-semibold py-2.5 px-6 rounded-lg w-full transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return (this as React.Component<Props, State>).props.children;
  }
}
