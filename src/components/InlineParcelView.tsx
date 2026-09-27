import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Check,
  Home,
  HelpCircle,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  Sparkles,
  Layers,
  Building,
  User,
  X,
  Copy,
  CheckCheck,
  Compass,
  Maximize2,
} from 'lucide-react';
import type { PropertyRecord, MapCheckValue, ParcelSnapshotData } from '../types/property.ts';
import { ParcelAerialView } from './ParcelAerialView.tsx';

interface InlineParcelViewProps {
  property: PropertyRecord;
  onUpdateMapCheck: (accountNumber: string, value: MapCheckValue, notes?: string) => void;
  onClose: () => void;
  onOpenPopout?: () => void;
}

export const InlineParcelView: React.FC<InlineParcelViewProps> = ({
  property,
  onUpdateMapCheck,
  onClose,
  onOpenPopout,
}) => {
  const [snapshot, setSnapshot] = useState<ParcelSnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'screenshot' | 'interactive'>('screenshot');
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState(property.mapCheckNotes || '');

  // Fetch 2026 Hybrid Map screenshot data for this parcel
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/parcel-snapshot/${encodeURIComponent(property.accountNumber)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load parcel snapshot: HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.snapshot) {
          setSnapshot(data.snapshot);
        } else {
          throw new Error(data.error || 'Snapshot data not available');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Parcel snapshot fetch error, using fallback:', err);
        // Fallback using property data
        if (property.aerialImageUrl) {
          setSnapshot({
            accountNumber: property.accountNumber,
            address: property.address,
            city: property.city,
            zip: property.zip,
            ownerName: property.ownerName,
            landValue: property.landValue,
            improvementValue: property.improvementValue,
            totalValue: property.totalValue,
            propertyClass: property.propertyClass,
            useDescription: property.useDescription,
            bbox: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
            center: { x: 50, y: 50 },
            aerialImageUrl: property.aerialImageUrl,
            parcelOverlayUrl: '',
            rings: [],
          });
        } else {
          setError('Could not fetch 2026 hybrid map imagery for this parcel.');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [property.accountNumber, property.aerialImageUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(property.dcadLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVacant = property.mapCheck === 'MapCheck - Vacant Lot';
  const isStructures = property.mapCheck === 'MapCheck - Had Structures';
  const isUnclear = property.mapCheck === 'MapCheck - Unclear';

  return (
    <div className="bg-slate-900 border-y-2 border-indigo-500/80 p-4 sm:p-5 text-white shadow-xl animate-fadeIn">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{property.address}</span>
              </h4>
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                #{property.accountNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{property.city || 'DALLAS'}, TX {property.zip}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <User className="w-3 h-3 text-slate-400" />
                <strong>Owner:</strong> {property.ownerName || 'DCAD Not Listed'}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">
                Land: ${property.landValue.toLocaleString()} ({property.improvementValueDisplay === 'N/A' ? 'N/A' : '$0'} Improvement)
              </span>
            </p>
          </div>
        </div>

        {/* View Mode Switcher and Close */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg p-1 bg-slate-800 border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('screenshot')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                viewMode === 'screenshot'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📸 2026 Hybrid Screenshot
            </button>
            <button
              onClick={() => setViewMode('interactive')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                viewMode === 'interactive'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🗺️ Live 2026 Map
            </button>
          </div>

          {onOpenPopout && (
            <button
              onClick={onOpenPopout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
              title="Pop out into full 2026 map verification modal (no new tab)"
            >
              <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pop Out Map</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close inline view"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Map / Screenshot Display Area */}
      <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 min-h-[360px] flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-400">
              Grabbing 2026 Hybrid screenshot for parcel #{property.accountNumber}...
            </p>
          </div>
        ) : error && viewMode === 'screenshot' ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-xs text-rose-400">{error}</p>
            <button
              onClick={() => setViewMode('interactive')}
              className="px-3 py-1.5 rounded bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
            >
              Switch to Live Interactive 2026 Map
            </button>
          </div>
        ) : viewMode === 'interactive' ? (
          /* Live Interactive Map embedded inline (no popup new window) */
          <div className="w-full h-[460px] relative">
            <iframe
              src={property.mapLink}
              title={`2026 Map for ${property.address}`}
              className="w-full h-full border-0"
              allow="geolocation"
            />
            <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 backdrop-blur-xs border border-slate-700 p-2 rounded text-[11px] text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Auto-switched to <strong>2026 Hybrid</strong> basemap. Inspect lot directly in this inline frame.</span>
              </span>
              <button
                onClick={() => setViewMode('screenshot')}
                className="text-xs text-indigo-300 hover:text-indigo-200 underline shrink-0 ml-2"
              >
                Back to Screenshot
              </button>
            </div>
          </div>
        ) : (
          /* High-Resolution 2026 Hybrid Screenshot with Parcel Boundary Box & Outline */
          <div className="w-full h-[440px] sm:h-[480px]">
            <ParcelAerialView
              property={property}
              initialSnapshot={snapshot}
              heightClass="h-full"
            />
          </div>
        )}
      </div>

      {/* MapCheck Inline Action Bar */}
      <div className="mt-4 p-3.5 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Assign MapCheck:
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                isVacant
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                  : isStructures
                  ? 'bg-rose-950 text-rose-300 border-rose-600'
                  : isUnclear
                  ? 'bg-amber-950 text-amber-300 border-amber-600'
                  : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}
            >
              {property.mapCheck}
            </span>
          </div>
          {property.mapCheckExplanation && (
            <p className="text-xs text-slate-300">
              <span className="text-indigo-300 font-semibold">AI Aerial Assessment:</span>{' '}
              {property.mapCheckExplanation}
            </p>
          )}
        </div>

        {/* Quick MapCheck Decision Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onUpdateMapCheck(property.accountNumber, 'MapCheck - Vacant Lot', notes)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              isVacant
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                : 'bg-slate-700 hover:bg-emerald-700 text-slate-200 hover:text-white'
            }`}
          >
            <Check className="w-3.5 h-3.5 text-emerald-300" />
            <span>MapCheck - Vacant Lot</span>
          </button>

          <button
            onClick={() =>
              onUpdateMapCheck(property.accountNumber, 'MapCheck - Had Structures', notes)
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              isStructures
                ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                : 'bg-slate-700 hover:bg-rose-700 text-slate-200 hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-rose-300" />
            <span>MapCheck - Had Structures</span>
          </button>

          <button
            onClick={() => onUpdateMapCheck(property.accountNumber, 'MapCheck - Unclear', notes)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              isUnclear
                ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                : 'bg-slate-700 hover:bg-amber-700 text-slate-200 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
            <span>MapCheck - Unclear</span>
          </button>

          <a
            href={property.dcadLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            title="Open DCAD Account Detail in new tab"
          >
            <Building className="w-3.5 h-3.5" />
            <span>DCAD Detail</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>
    </div>
  );
};
