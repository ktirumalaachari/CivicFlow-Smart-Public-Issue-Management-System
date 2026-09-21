import React from 'react';

interface SkeletonProps {
  type?: 'card' | 'table' | 'text' | 'dashboard';
  count?: number;
}

export function SkeletonLoader({ type = 'card', count = 1 }: SkeletonProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-pulse w-full">
            <div className="h-10 bg-slate-200 rounded-lg w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
              ))}
            </div>
            <div className="h-64 bg-slate-200 rounded-2xl w-full mt-6"></div>
          </div>
        );
      case 'table':
        return (
          <div className="animate-pulse w-full space-y-4 bg-white p-4 rounded-xl border border-slate-100">
            <div className="h-8 bg-slate-200 rounded w-full mb-4"></div>
            {[...Array(Math.max(count, 3))].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="h-6 bg-slate-100 rounded w-1/4"></div>
                <div className="h-6 bg-slate-100 rounded w-1/4"></div>
                <div className="h-6 bg-slate-100 rounded w-1/4"></div>
                <div className="h-6 bg-slate-100 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        );
      case 'text':
        return (
          <div className="animate-pulse w-full space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-100 rounded w-5/6"></div>
            <div className="h-4 bg-slate-100 rounded w-4/6"></div>
          </div>
        );
      case 'card':
      default:
        return (
          <div className="animate-pulse bg-white border border-slate-100 rounded-xl p-5 space-y-4 shadow-sm w-full">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-8 bg-slate-200 rounded w-1/2 mt-4"></div>
            <div className="flex gap-2 pt-4 border-t border-slate-50">
              <div className="h-4 bg-slate-100 rounded w-1/4"></div>
              <div className="h-4 bg-slate-100 rounded w-1/4"></div>
            </div>
          </div>
        );
    }
  };

  if (count > 1 && type !== 'table' && type !== 'dashboard') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
        {[...Array(count)].map((_, i) => (
          <React.Fragment key={i}>{renderSkeleton()}</React.Fragment>
        ))}
      </div>
    );
  }

  return renderSkeleton();
}
