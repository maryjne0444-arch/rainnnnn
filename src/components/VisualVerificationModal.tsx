import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Building,
  Info,
  Layers,
  HelpCircle,
  Home,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import type { PropertyRecord, MapCheckValue } from '../types/property.ts';
import { ParcelAerialView } from './ParcelAerialView.tsx';

interface VisualVerificationModalProps {
  lots: PropertyRecord[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSetMapCheck: (
    accountNumber: string,
    status: MapCheckValue,
    notes?: string,
    mapLoadError?: boolean
  ) => void;
  onSelectIndex: (index: number) => void;
  onSetAllUncheckedVacant: () => void;
}

export const VisualVerificationModal: React.FC<VisualVerificationModalProps> = ({
  lots,
  currentIndex,
  isOpen,
  onClose,
  onSetMapCheck,
  onSelectIndex,
  onSetAllUncheckedVacant,
}) => {
  const [userNotes, setUserNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [viewMode, setViewMode] = useState<'dcad_map' | 'aerial'>('dcad_map');

  const currentLot = lots && lots.length > 0 ? (lots[currentIndex] || lots[0]) : null;

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen || !currentLot || lots.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'v' || e.key === 'V') {
        handleDecision('MapCheck - Vacant Lot');
      } else if (e.key === 's' || e.key === 'S') {
        handleDecision('MapCheck - Had Structures');
      } else if (e.key === 'u' || e.key === 'U') {
        handleDecision('MapCheck - Unclear');
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) onSelectIndex(currentIndex - 1);
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < lots.length - 1) onSelectIndex(currentIndex + 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, currentLot, lots?.length]);

  if (!isOpen || !lots || lots.length === 0 || !currentLot) return null;

  const handleDecision = (status: MapCheckValue, notes?: string, error = false) => {
    onSetMapCheck(currentLot.accountNumber, status, notes || userNotes, error);
    setUserNotes('');
    setShowNotesInput(false);

    // Auto-advance to next parcel if available
    if (currentIndex < lots.length - 1) {
      onSelectIndex(currentIndex + 1);
    }
  };

  const vacantCount = lots.filter((l) => l.mapCheck === 'MapCheck - Vacant Lot').length;
  const structuresCount = lots.filter((l) => l.mapCheck === 'MapCheck - Had Structures').length;
  const unclearCount = lots.filter((l) => l.mapCheck === 'MapCheck - Unclear').length;
  const pendingCount = lots.filter((l) => l.mapCheck === 'Pending MapCheck').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Step 2: DCAD 2026 Map Viewer Verification
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Aerial Imagery
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Inspect 2026 aerial imagery to confirm if lot is empty, has structures, or is unclear.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Counts */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Parcel {currentIndex + 1} of {lots.length}
              </span>
              <span className="px-2 py-1 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/40">
                ✓ Vacant: {vacantCount}
              </span>
              <span className="px-2 py-1 rounded bg-rose-950/70 text-rose-300 border border-rose-800/40">
                ✗ Structures: {structuresCount}
              </span>
              <span className="px-2 py-1 rounded bg-amber-950/70 text-amber-300 border border-amber-800/40">
                ? Unclear: {unclearCount}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step-by-Step Guidance Banner for DCAD Map Viewer */}
        <div className="bg-emerald-950 text-emerald-100 px-5 py-2.5 text-xs border-b border-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Auto-Basemap:</strong> The map viewer automatically activates the{' '}
              <strong className="text-white underline">2026 Hybrid</strong> layer (aerial photography + labels) without having to manually open the basemap gallery.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-emerald-300 hidden lg:inline">
              Shortcuts: <kbd className="px-1 py-0.5 bg-emerald-900 rounded font-mono">V</kbd> Vacant • <kbd className="px-1 py-0.5 bg-emerald-900 rounded font-mono">S</kbd> Structures • <kbd className="px-1 py-0.5 bg-emerald-900 rounded font-mono">U</kbd> Unclear
            </span>
            <a
              href={currentLot.mapLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-medium text-[11px] transition-colors"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Parcel Selector Strip */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous lot (Arrow Left)"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
            <button
              onClick={() => onSelectIndex(Math.min(lots.length - 1, currentIndex + 1))}
              disabled={currentIndex === lots.length - 1}
              className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next lot (Arrow Right)"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
            <span className="font-semibold text-slate-700 ml-1">
              Select parcel:
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 overflow-x-auto py-0.5">
            {lots.map((lot, idx) => {
              const isSelected = idx === currentIndex;
              const isVacant = lot.mapCheck === 'MapCheck - Vacant Lot';
              const isStruct = lot.mapCheck === 'MapCheck - Had Structures';
              const isUnclear = lot.mapCheck === 'MapCheck - Unclear';

              return (
                <button
                  key={lot.accountNumber}
                  onClick={() => onSelectIndex(idx)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900 font-bold'
                      : isVacant
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : isStruct
                      ? 'bg-rose-100 text-rose-800 border border-rose-300 line-through'
                      : isUnclear
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                  title={`${lot.address} (${lot.accountNumber}) - ${lot.mapCheck}`}
                >
                  <span>#{idx + 1}</span>
                  {isVacant && <Check className="w-3 h-3 text-emerald-600" />}
                  {isStruct && <Home className="w-3 h-3 text-rose-600" />}
                  {isUnclear && <HelpCircle className="w-3 h-3 text-amber-600" />}
                </button>
              );
            })}
          </div>

          {pendingCount > 0 && (
            <div className="shrink-0">
              <button
                onClick={onSetAllUncheckedVacant}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors cursor-pointer flex items-center gap-1"
                title="Mark all pending lots as MapCheck - Vacant Lot"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Mark Rest as Vacant ({pendingCount})</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body: Split View (Details Left, Map Right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-y-auto">
          {/* Left Column: Property appraisal details & MapCheck decision buttons */}
          <div className="lg:col-span-5 p-5 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto bg-slate-50/50 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    DCAD Public Record
                  </span>
                  {/* Current MapCheck status pill */}
                  {currentLot.mapCheck === 'MapCheck - Vacant Lot' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Check className="w-3.5 h-3.5" /> MapCheck - Vacant Lot
                    </span>
                  ) : currentLot.mapCheck === 'MapCheck - Had Structures' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      <Home className="w-3.5 h-3.5" /> MapCheck - Had Structures
                    </span>
                  ) : currentLot.mapCheck === 'MapCheck - Unclear' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <HelpCircle className="w-3.5 h-3.5" /> MapCheck - Unclear
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Pending MapCheck
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-slate-900 mt-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{currentLot.address}</span>
                </h4>
                <p className="text-sm text-slate-600">
                  {currentLot.city}, TX {currentLot.zip || '(Dallas County)'}
                </p>
              </div>

              {/* Appraisal Summary Badges */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                    Improvement Value
                  </span>
                  <span className="text-base font-bold text-emerald-700">
                    {currentLot.improvementValueDisplay === 'N/A'
                      ? 'N/A'
                      : `$${currentLot.improvementValue.toLocaleString()}`}
                  </span>
                  <span className="block text-[10px] text-emerald-600 mt-0.5 font-medium">
                    {currentLot.improvementValueDisplay === 'N/A'
                      ? '✓ N/A (No Structure Assessed by DCAD)'
                      : '✓ $0 (No Structure Assessed by DCAD)'}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                    Land Value / Market
                  </span>
                  <span className="text-base font-bold text-slate-800">
                    ${currentLot.landValue.toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    Total Assessed: ${currentLot.totalValue.toLocaleString()}
                  </span>
                </div>

                {/* Owner on Record */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs col-span-2">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase">
                    Owner on Record
                  </span>
                  <span className="text-sm font-bold text-slate-900 truncate block mt-0.5" title={currentLot.ownerName || 'DCAD Not Listed'}>
                    {currentLot.ownerName || <span className="text-slate-400 italic">DCAD Not Listed</span>}
                  </span>
                </div>
              </div>

              {/* Auto MapCheck Result Banner if verified */}
              {currentLot.mapCheckExplanation && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-950">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-0.5">
                    <span>🤖 App Auto MapCheck:</span>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-900 font-semibold text-[10px]">
                      {currentLot.mapCheck}
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-snug">
                    {currentLot.mapCheckExplanation}
                  </p>
                </div>
              )}

              {/* Account details */}
              <div className="bg-white rounded-lg border border-slate-200 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">DCAD Account #:</span>
                  <span className="font-mono font-bold text-slate-900 select-all bg-slate-100 px-2 py-0.5 rounded">
                    {currentLot.accountNumber}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Property Class:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[210px]" title={currentLot.propertyClass}>
                    {currentLot.propertyClass || 'Residential'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Land Use:</span>
                  <span className="font-medium text-slate-800">
                    {currentLot.useDescription || 'Residential'}
                  </span>
                </div>

                {currentLot.legalDescription && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-500 block mb-0.5">Legal / Subdivision:</span>
                    <span className="font-medium text-slate-800 text-[11px] italic block truncate">
                      {currentLot.legalDescription}
                    </span>
                  </div>
                )}

                {currentLot.vacantReason && (
                  <div className="pt-2 border-t border-slate-100 flex items-start gap-1.5 text-emerald-800 bg-emerald-50/80 p-2 rounded text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{currentLot.vacantReason}</span>
                  </div>
                )}
              </div>

              {/* Direct Links */}
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href={currentLot.dcadLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-colors border border-slate-300"
                >
                  <Building className="w-3.5 h-3.5 text-slate-600" />
                  <span>DCAD Account Detail</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <a
                  href={currentLot.mapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-colors border border-slate-300"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Full Map Viewer</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>

            {/* Step 2 MapCheck Decision Buttons */}
            <div className="mt-5 pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Step 2: Assign MapCheck Status
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Exact required values
                </span>
              </div>

              {/* 3 Main Action Buttons matching exact required strings */}
              <div className="space-y-2">
                {/* 1. MapCheck - Vacant Lot */}
                <button
                  onClick={() => handleDecision('MapCheck - Vacant Lot')}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer ${
                    currentLot.mapCheck === 'MapCheck - Vacant Lot'
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-500'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>MapCheck - Vacant Lot</span>
                  </div>
                  <span className="text-[10px] font-normal text-emerald-100 bg-emerald-800/60 px-2 py-0.5 rounded">
                    Aerial shows no structure [V]
                  </span>
                </button>

                {/* 2. MapCheck - Had Structures */}
                <button
                  onClick={() => handleDecision('MapCheck - Had Structures')}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer ${
                    currentLot.mapCheck === 'MapCheck - Had Structures'
                      ? 'bg-rose-600 text-white ring-2 ring-rose-500'
                      : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-rose-600" />
                    <span>MapCheck - Had Structures</span>
                  </div>
                  <span className="text-[10px] font-normal text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                    Building/house visible [S]
                  </span>
                </button>

                {/* 3. MapCheck - Unclear */}
                <button
                  onClick={() => handleDecision('MapCheck - Unclear')}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer ${
                    currentLot.mapCheck === 'MapCheck - Unclear'
                      ? 'bg-amber-600 text-white ring-2 ring-amber-500'
                      : 'bg-white hover:bg-amber-50 text-amber-800 border border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <span>MapCheck - Unclear</span>
                  </div>
                  <span className="text-[10px] font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    Blurry/outdated/cannot tell [U]
                  </span>
                </button>
              </div>

              {/* If imagery failed to load */}
              {iframeError && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Map imagery could not load in the embed.</span>
                  </p>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Click &ldquo;Open in New Tab&rdquo; to inspect directly on DCAD, or mark this parcel as &ldquo;MapCheck - Unclear&rdquo;.
                  </p>
                  <button
                    onClick={() => handleDecision('MapCheck - Unclear', 'Embedded map viewer imagery load failed', true)}
                    className="mt-2 px-3 py-1 bg-amber-600 text-white font-medium text-xs rounded hover:bg-amber-700 cursor-pointer"
                  >
                    Mark as MapCheck - Unclear (Load Error)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Embedded DCAD 2026 Property Map Viewer */}
          <div className="lg:col-span-7 flex flex-col bg-slate-900 relative min-h-[420px] lg:min-h-[520px]">
            {/* Map Header Toolbar */}
            <div className="px-4 py-2 bg-slate-800 text-slate-300 text-xs flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-white">
                  2026 Hybrid Viewer
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Parcel #{currentLot.accountNumber}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-md p-0.5 bg-slate-900 border border-slate-700">
                  <button
                    onClick={() => setViewMode('dcad_map')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      viewMode === 'dcad_map' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    DCAD Map (Auto 2026)
                  </button>
                  <button
                    onClick={() => setViewMode('aerial')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                      viewMode === 'aerial' ? 'bg-amber-600 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>📸 Boxed Aerial Shot</span>
                  </button>
                </div>

                <a
                  href={currentLot.mapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-medium text-[11px] transition-colors"
                >
                  <span>Open Full DCAD Viewer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Embedded DCAD Map Viewer iframe or Boxed Aerial Shot */}
            <div className="flex-1 relative w-full h-full bg-slate-950 flex flex-col">
              {viewMode === 'aerial' ? (
                <div className="flex-1 flex flex-col w-full h-full p-2 bg-slate-950 relative">
                  <ParcelAerialView
                    property={currentLot}
                    heightClass="h-full min-h-[460px]"
                  />
                  <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400 px-1">
                    <span className="text-[11px] text-amber-300">
                      Property outline &amp; boundary box highlighted above.
                    </span>
                    <button
                      onClick={() => setViewMode('dcad_map')}
                      className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer text-[11px]"
                    >
                      Switch to interactive DCAD map
                    </button>
                  </div>
                </div>
              ) : (
                <iframe
                  key={currentLot.accountNumber}
                  src={currentLot.mapLink}
                  title={`DCAD Map for ${currentLot.address}`}
                  className="w-full h-full border-0"
                  allow="geolocation"
                  onError={() => setIframeError(true)}
                />
              )}

              {/* Instructions banner at bottom of viewer */}
              <div className="absolute bottom-2 left-2 right-2 bg-slate-900/92 backdrop-blur-xs border border-slate-700 rounded-lg p-2.5 text-[11px] text-slate-300 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>2026 Hybrid View:</strong> Basemap is automatically set to 2026 Hybrid (aerial photography + labels). Verify if parcel shows structures or plain vacant lot.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    onClick={() => handleDecision('MapCheck - Unclear', 'Marked unclear via viewer toolbar', true)}
                    className="text-amber-400 hover:text-amber-300 text-[11px] underline cursor-pointer"
                  >
                    Cannot load imagery?
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Progress: <strong className="text-emerald-700">{vacantCount} Vacant</strong> • <strong className="text-rose-600">{structuresCount} Had Structures</strong> • <strong className="text-amber-600">{unclearCount} Unclear</strong> ({lots.length - pendingCount} of {lots.length} reviewed)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous Lot
            </button>
            <button
              onClick={() => onSelectIndex(Math.min(lots.length - 1, currentIndex + 1))}
              disabled={currentIndex === lots.length - 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next Lot
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Finish MapCheck
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
