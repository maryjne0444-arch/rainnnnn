import React from 'react';
import { Loader2, CheckCircle2, Search, Building2, Trees } from 'lucide-react';
import type { SearchProgress } from '../types/property.ts';

interface ProgressIndicatorProps {
  progress: SearchProgress;
  totalFound: number;
  vacantFound: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  totalFound,
  vacantFound,
}) => {
  if (progress.stage === 'idle' || progress.stage === 'completed') {
    return null;
  }

  const isInspecting = progress.stage === 'inspecting';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 text-white shadow-lg animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            {progress.stage === 'searching' ? (
              <Search className="w-4 h-4 animate-pulse" />
            ) : isInspecting ? (
              <Building2 className="w-4 h-4 animate-bounce" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>{isInspecting ? 'Inspecting DCAD Property Accounts' : 'Searching DCAD Public Records'}</span>
              <span className="text-xs font-normal text-emerald-400">
                {progress.percent}%
              </span>
            </h3>
            <p className="text-xs text-slate-400 truncate max-w-lg mt-0.5">
              {progress.message}
            </p>
          </div>
        </div>

        {/* Live counters */}
        <div className="flex items-center gap-4 text-xs font-medium">
          {progress.total !== undefined && progress.total > 0 && (
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700">
              <span className="text-slate-400">Scanned: </span>
              <span className="text-white font-semibold">
                {progress.current || 0} / {progress.total}
              </span>
            </div>
          )}

          <div className="bg-emerald-950/70 px-3 py-1.5 rounded-md border border-emerald-800/60 text-emerald-300 flex items-center gap-1.5">
            <Trees className="w-3.5 h-3.5 text-emerald-400" />
            <span>Likely Vacant: </span>
            <span className="text-white font-bold">{vacantFound}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-emerald-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(5, Math.min(progress.percent, 100))}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          Checking improvement value ($0) &amp; property class
        </span>
        <span>Cross-checking with 2026 DCAD Parcel Maps</span>
      </div>
    </div>
  );
};
