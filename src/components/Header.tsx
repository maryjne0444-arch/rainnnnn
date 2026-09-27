import React from 'react';
import { Building2, MapPin, Database, ExternalLink, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Dallas County Vacant Residential Lot Finder
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  2026 Roll
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Public appraisal records from</span>
                <a
                  href="https://www.dallascad.org/SearchAddr.aspx"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-0.5"
                >
                  Dallas Central Appraisal District (DCAD)
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span>&amp;</span>
                <a
                  href="https://maps.dcad.org/prd/dpm/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-0.5"
                >
                  2026 Property Map Viewer
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>DCAD SearchAddr</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>2026 GIS Ortho</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-950/60 border border-emerald-800/50 text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Public Records Grounded</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
