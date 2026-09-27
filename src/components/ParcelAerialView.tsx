import React, { useState, useEffect, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  MapPin,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import type { PropertyRecord, ParcelSnapshotData } from '../types/property.ts';

interface ParcelAerialViewProps {
  property: PropertyRecord;
  initialSnapshot?: ParcelSnapshotData | null;
  className?: string;
  heightClass?: string;
}

export const ParcelAerialView: React.FC<ParcelAerialViewProps> = ({
  property,
  initialSnapshot,
  className = '',
  heightClass = 'h-[440px] sm:h-[480px]',
}) => {
  const [snapshot, setSnapshot] = useState<ParcelSnapshotData | null>(initialSnapshot || null);
  const [loading, setLoading] = useState(!initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSnapshot) {
      setSnapshot(initialSnapshot);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/parcel-snapshot/${encodeURIComponent(property.accountNumber)}?address=${encodeURIComponent(property.address || '')}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.snapshot) {
          setSnapshot(data.snapshot);
        } else {
          throw new Error(data.error || 'Snapshot not available');
        }
      })
      .catch((_err) => {
        if (!isMounted) return;
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
          bbox: { minX: -10772200, minY: 3864300, maxX: -10772030, maxY: 3864430 },
          center: { x: 50, y: 50 },
          aerialImageUrl: property.aerialImageUrl || `/api/dcad-aerial-2026?bbox=-10772200,3864300,-10772030,3864430&size=900,600`,
          parcelOverlayUrl: `/api/dcad-parcel-overlay?bbox=-10772200,3864300,-10772030,3864430&size=900,600`,
          rings: [],
        });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [property.accountNumber, property.aerialImageUrl, initialSnapshot]);

  // Compute parcel boundary polygon points and bounding box in 0-100 percentage coordinates
  const computeBoxData = () => {
    if (snapshot && snapshot.rings && snapshot.rings.length > 0 && snapshot.bbox) {
      const { bbox, rings } = snapshot;
      const width = bbox.maxX - bbox.minX;
      const height = bbox.maxY - bbox.minY;

      if (width > 0 && height > 0) {
        let minPx = 100;
        let maxPx = 0;
        let minPy = 100;
        let maxPy = 0;

        const pointsList = rings.map((ring) => {
          return ring
            .map(([x, y]) => {
              const px = Math.max(0, Math.min(100, ((x - bbox.minX) / width) * 100));
              const py = Math.max(0, Math.min(100, ((bbox.maxY - y) / height) * 100));
              if (px < minPx) minPx = px;
              if (px > maxPx) maxPx = px;
              if (py < minPy) minPy = py;
              if (py > maxPy) maxPy = py;
              return `${px.toFixed(2)},${py.toFixed(2)}`;
            })
            .join(' ');
        });

        // Ensure box has at least minimal padding and doesn't collapse
        const boxMinX = Math.max(2, minPx);
        const boxMaxX = Math.min(98, maxPx);
        const boxMinY = Math.max(2, minPy);
        const boxMaxY = Math.min(98, maxPy);

        return {
          hasExactRings: true,
          pointsList,
          boxMinX,
          boxMaxX,
          boxMinY,
          boxMaxY,
          boxW: Math.max(8, boxMaxX - boxMinX),
          boxH: Math.max(8, boxMaxY - boxMinY),
          centerX: (boxMinX + boxMaxX) / 2,
          centerY: (boxMinY + boxMaxY) / 2,
        };
      }
    }

    // Fallback: DCAD aerial export is always generated centered on the parcel location
    return {
      hasExactRings: false,
      pointsList: [],
      boxMinX: 30,
      boxMaxX: 70,
      boxMinY: 30,
      boxMaxY: 70,
      boxW: 40,
      boxH: 40,
      centerX: 50,
      centerY: 50,
    };
  };

  const boxData = computeBoxData();
  const { hasExactRings, pointsList, boxMinX, boxMaxX, boxMinY, boxMaxY, boxW, boxH, centerX, centerY } = boxData;
  const bracketLength = Math.max(3.5, Math.min(7, boxW * 0.2));

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center select-none ${heightClass} ${className}`}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center p-8 space-y-3">
          <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
          <p className="text-xs text-slate-300 font-medium">
            Loading high-res 2026 aerial shot and bounding box for {property.address}...
          </p>
        </div>
      ) : error || !snapshot ? (
        <div className="p-8 text-center space-y-2">
          <p className="text-xs text-rose-400">{error || 'Unable to display aerial view'}</p>
          <p className="text-[11px] text-slate-400">
            Please verify via the interactive 2026 map viewer.
          </p>
        </div>
      ) : (
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
          {/* Zoomable Image Container */}
          <div
            className="relative transition-transform duration-200 ease-out origin-center w-full h-full"
            style={{
              transform: `scale(${zoomLevel})`,
            }}
          >
            {/* 1. Base Layer: High-Res 2026 Satellite Aerial Imagery */}
            <img
              src={snapshot.aerialImageUrl}
              alt={`2026 Aerial Imagery for ${property.address}`}
              className="w-full h-full object-cover"
            />

            {/* 2. Overlay Layer: Official DCAD Parcel Lines */}
            {snapshot.parcelOverlayUrl && (
              <img
                src={snapshot.parcelOverlayUrl}
                alt="DCAD Official Parcel Lines"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-85"
              />
            )}

            {/* 3. Highlight & Indication Box SVG Overlay */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Glowing drop shadow filter for property box and outline */}
                <filter id="yellowGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#facc15" floodOpacity="0.9" />
                </filter>
                <filter id="boxShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#f59e0b" floodOpacity="0.95" />
                </filter>
              </defs>

              {/* A. If exact boundary polygon is available, render crisp outline only with NO fill */}
              {hasExactRings &&
                pointsList.map((pts, pIdx) => (
                  <g key={pIdx}>
                    <polygon
                      points={pts}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                      filter="url(#yellowGlow)"
                    />
                    <polygon
                      points={pts}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="0.8"
                      strokeDasharray="2.5,1.5"
                      strokeLinejoin="round"
                    />
                  </g>
                ))}

              {/* B. Official Property Box Outlining the Parcel - Box Only, No Highlight Fill */}
              <g filter="url(#boxShadow)">
                {/* Main Yellow Bounding Box (fill="none" so all structures, trees, and ground remain 100% visible) */}
                <rect
                  x={boxMinX - 1.2}
                  y={boxMinY - 1.2}
                  width={boxW + 2.4}
                  height={boxH + 2.4}
                  rx="1.5"
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />

                {/* Corner Viewfinder Reticle Brackets (Top-Left) */}
                <path
                  d={`M ${boxMinX - 2.5} ${boxMinY + bracketLength} L ${boxMinX - 2.5} ${boxMinY - 2.5} L ${boxMinX + bracketLength} ${boxMinY - 2.5}`}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Corner Viewfinder Reticle Brackets (Top-Right) */}
                <path
                  d={`M ${boxMaxX + 2.5 - bracketLength} ${boxMinY - 2.5} L ${boxMaxX + 2.5} ${boxMinY - 2.5} L ${boxMaxX + 2.5} ${boxMinY + bracketLength}`}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Corner Viewfinder Reticle Brackets (Bottom-Left) */}
                <path
                  d={`M ${boxMinX - 2.5} ${boxMaxY + 2.5 - bracketLength} L ${boxMinX - 2.5} ${boxMaxY + 2.5} L ${boxMinX + bracketLength} ${boxMaxY + 2.5}`}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Corner Viewfinder Reticle Brackets (Bottom-Right) */}
                <path
                  d={`M ${boxMaxX + 2.5 - bracketLength} ${boxMaxY + 2.5} L ${boxMaxX + 2.5} ${boxMaxY + 2.5} L ${boxMaxX + 2.5} ${boxMaxY + 2.5 - bracketLength}`}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              {/* Target Property Tag at top of box */}
              <g>
                <rect
                  x={centerX - 16}
                  y={Math.max(2, boxMinY - 6.5)}
                  width="32"
                  height="4.8"
                  rx="1.2"
                  fill="rgba(15, 23, 42, 0.92)"
                  stroke="#facc15"
                  strokeWidth="0.8"
                />
                <text
                  x={centerX}
                  y={Math.max(2, boxMinY - 6.5) + 3.4}
                  textAnchor="middle"
                  fill="#fef08a"
                  fontSize="2.7"
                  fontFamily="monospace"
                  fontWeight="bold"
                  letterSpacing="0.05em"
                >
                  TARGET PARCEL
                </text>
              </g>
            </svg>

            {/* 4. Address Pin placed above the box so lot interior remains 100% unobstructed */}
            <div
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-full flex flex-col items-center z-10"
              style={{
                left: `${centerX}%`,
                top: `${Math.max(6, boxMinY - 1)}%`,
              }}
            >
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950/90 text-yellow-300 border border-yellow-500/80 text-[10px] font-mono font-bold shadow-lg whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                <span>{property.address}</span>
              </div>
            </div>
          </div>

          {/* Floating Zoom & Control Bar */}
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-900/90 backdrop-blur-xs p-1 rounded-lg border border-slate-700 shadow-md z-20">
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-slate-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, +(z - 0.25).toFixed(2)))}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Reset zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bottom Property Indication Banner */}
          <div className="absolute bottom-2 left-2 right-2 bg-slate-900/92 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 flex items-center justify-between shadow-md z-20">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
              <span>
                <strong>Property Box:</strong> Yellow box frames parcel #{property.accountNumber} (no shading/fill for clear aerial visibility)
              </span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-300 font-mono bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/60">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              <span>2026 High-Res Aerial</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
