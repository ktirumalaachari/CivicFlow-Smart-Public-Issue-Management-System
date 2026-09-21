import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';

interface ComplaintTracking {
  id: number;
  complaint_id: number;
  status: string;
  officer_name: string | null;
  remarks: string | null;
  created_at: string;
}

interface TimelineProps {
  currentStatus: string;
  trackingHistory?: ComplaintTracking[];
}

const STATUS_ORDER = [
  'Submitted',
  'Verified',
  'Assigned',
  'In Progress',
  'Resolved',
  'Closed'
];

export default function Timeline({ currentStatus, trackingHistory }: TimelineProps) {
  // If we have parcel-style tracking history, render the vertical detailed timeline
  if (trackingHistory && trackingHistory.length > 0) {
    return (
      <div className="w-full py-2">
        <div className="relative border-l-2 border-blue-200 ml-4 space-y-6">
          {trackingHistory.map((track, index) => {
            const isLatest = index === trackingHistory.length - 1;
            const dateObj = new Date(track.created_at);
            const dateStr = dateObj.toLocaleDateString();
            const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return (
              <div key={track.id} className="relative pl-6">
                <span className={`absolute -left-[11px] top-1 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center ${isLatest ? 'bg-blue-600 shadow-md ring-4 ring-blue-100' : 'bg-slate-300'}`}>
                  {isLatest ? <CheckCircle className="w-3 h-3 text-white" /> : <div className="w-2 h-2 rounded-full bg-white" />}
                </span>
                
                <div className="flex flex-col">
                  <div className="flex justify-between items-start mb-0.5">
                    <span className={`font-bold text-sm ${isLatest ? 'text-blue-700' : 'text-slate-700'}`}>
                      {track.status}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">
                      {dateStr} {timeStr}
                    </span>
                  </div>
                  
                  {track.officer_name && track.officer_name !== 'System' && (
                    <div className="text-xs text-slate-600 font-medium mb-1">
                      By: {track.officer_name}
                    </div>
                  )}
                  
                  {track.remarks && (
                    <div className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded border border-slate-100 mt-1">
                      "{track.remarks}"
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback to legacy horizontal timeline if no tracking history exists
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="w-full py-4">
      <div className="relative flex items-center justify-between w-full">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-200 z-0"></div>
        <div 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-blue-500 z-0 transition-all duration-500" 
          style={{ width: `${(Math.max(currentIndex, 0) / (STATUS_ORDER.length - 1)) * 100}%` }}
        ></div>
        
        {STATUS_ORDER.map((status, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={status} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' 
                    : 'bg-white border-slate-300 text-slate-400'
                } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </div>
              <span 
                className={`mt-2 text-xs font-semibold whitespace-nowrap ${
                  isCurrent ? 'text-blue-700' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
