import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { SearchForm } from './components/SearchForm.tsx';
import { ProgressIndicator } from './components/ProgressIndicator.tsx';
import { ResultsTable } from './components/ResultsTable.tsx';
import { VisualVerificationModal } from './components/VisualVerificationModal.tsx';
import { ExportModal } from './components/ExportModal.tsx';
import type { CityOption, PropertyRecord, SearchProgress, SearchParams, MapCheckValue } from './types/property.ts';
import {
  Trees,
  CheckCircle2,
  MapPin,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Eye,
  Download,
  Building,
  Layers,
} from 'lucide-react';

export default function App() {
  const [cities, setCities] = useState<CityOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<SearchProgress>({
    stage: 'idle',
    message: '',
    percent: 0,
  });
  const [records, setRecords] = useState<PropertyRecord[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams>({
    streetName: 'Pennsylvania Ave',
    city: 'Dallas',
    zipFilter: '',
    maxResults: 50,
  });
  const [error, setError] = useState<string | null>(null);

  // Verification Modal State
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [activeLotIndex, setActiveLotIndex] = useState(0);
  const [isAutoChecking, setIsAutoChecking] = useState(false);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch Dallas County cities on load
  useEffect(() => {
    fetch('/api/cities')
      .then((res) => res.json())
      .then((data: CityOption[]) => {
        setCities(data);
      })
      .catch((err) => {
        console.error('Failed to load cities:', err);
      });
  }, []);

  // Initial search for Pennsylvania Ave, Dallas
  useEffect(() => {
    handleSearch({
      streetName: 'Pennsylvania Ave',
      city: 'Dallas',
      zipFilter: '',
      maxResults: 50,
    });
  }, []);

  // Handle Search Submission with Server-Sent Events for live progress
  const handleSearch = async (params: {
    streetName: string;
    city: string;
    zipFilter?: string;
    maxResults?: number;
  }) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Immediately remove results of previous search when searching a new address
    setRecords([]);
    setActiveLotIndex(0);

    setIsLoading(true);
    setError(null);
    setSearchParams(params);
    setProgress({
      stage: 'searching',
      message: `Searching DCAD public records for "${params.streetName}" in ${params.city}...`,
      percent: 5,
    });

    const streamUrl = `/api/search/stream?streetName=${encodeURIComponent(
      params.streetName
    )}&city=${encodeURIComponent(params.city)}&zipFilter=${encodeURIComponent(
      params.zipFilter || ''
    )}&maxResults=${params.maxResults || 50}`;

    try {
      const sse = new EventSource(streamUrl);
      eventSourceRef.current = sse;

      sse.addEventListener('progress', (e) => {
        try {
          const data: SearchProgress = JSON.parse(e.data);
          setProgress(data);
        } catch (err) {
          console.error('Error parsing progress SSE:', err);
        }
      });

      sse.addEventListener('lot_found', (e) => {
        try {
          const lot: PropertyRecord = JSON.parse(e.data);
          setRecords((prev) => {
            const exists = prev.some((r) => r.accountNumber === lot.accountNumber);
            if (exists) {
              return prev.map((r) => (r.accountNumber === lot.accountNumber ? lot : r));
            }
            return [...prev, lot];
          });
        } catch (err) {
          console.error('Error parsing lot SSE:', err);
        }
      });

      sse.addEventListener('done', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.results) {
            setRecords(data.results);
          }
          setProgress({
            stage: 'completed',
            message: 'Search completed successfully.',
            percent: 100,
          });
        } catch (err) {
          console.error('Error parsing done SSE:', err);
        } finally {
          setIsLoading(false);
          sse.close();
        }
      });

      sse.addEventListener('error', (e) => {
        console.warn('SSE encountered error, trying fallback POST:', e);
        sse.close();
        fallbackPostSearch(params);
      });
    } catch (err: any) {
      console.warn('Failed to start SSE, falling back to POST:', err);
      fallbackPostSearch(params);
    }
  };

  const fallbackPostSearch = async (params: {
    streetName: string;
    city: string;
    zipFilter?: string;
    maxResults?: number;
  }) => {
    try {
      setProgress({
        stage: 'inspecting',
        message: 'Querying DCAD records via standard API...',
        percent: 50,
      });

      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'DCAD search failed');
      }

      setRecords(data.results || []);
      setProgress({
        stage: 'completed',
        message: `Found ${data.count || 0} vacant lots.`,
        percent: 100,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to complete search');
      setProgress({
        stage: 'error',
        message: err.message || 'Error occurred during search',
        percent: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSearch = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsLoading(false);
    setProgress({
      stage: 'completed',
      message: 'Search paused by user.',
      percent: 100,
    });
  };

  // Step 2 MapCheck verification actions
  const handleUpdateMapCheck = (
    accountNumber: string,
    status: MapCheckValue,
    notes?: string,
    mapLoadError?: boolean
  ) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.accountNumber === accountNumber
          ? {
              ...r,
              mapCheck: status,
              mapCheckNotes: notes || r.mapCheckNotes,
              mapLoadError: mapLoadError !== undefined ? mapLoadError : r.mapLoadError,
            }
          : r
      )
    );
  };

  const handleSetAllUncheckedVacant = () => {
    setRecords((prev) =>
      prev.map((r) =>
        r.mapCheck === 'Pending MapCheck'
          ? {
              ...r,
              mapCheck: 'MapCheck - Vacant Lot' as const,
              mapCheckNotes: 'Batch verified ($0 improvement value)',
            }
          : r
      )
    );
  };

  const handleOpenMapVerification = (index: number) => {
    setActiveLotIndex(index);
    setIsMapModalOpen(true);
  };

  const handleRunAutoMapCheck = async () => {
    if (records.length === 0) return;
    setIsAutoChecking(true);
    try {
      const res = await fetch('/api/auto-mapcheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lots: records }),
      });
      const data = await res.json();
      if (data.results) {
        const resultMap = new Map<string, { mapCheck: MapCheckValue; explanation: string }>();
        for (const r of data.results) {
          resultMap.set(r.accountNumber, { mapCheck: r.mapCheck, explanation: r.explanation });
        }
        setRecords((prev) =>
          prev.map((lot) => {
            const match = resultMap.get(lot.accountNumber);
            if (match) {
              return {
                ...lot,
                mapCheck: match.mapCheck,
                mapCheckExplanation: match.explanation,
                autoChecked: true,
              };
            }
            return lot;
          })
        );
      }
    } catch (err) {
      console.error('Error running on-demand Auto MapCheck:', err);
    } finally {
      setIsAutoChecking(false);
    }
  };

  const vacantCheckLots = records.filter(
    (r) => r.mapCheck === 'MapCheck - Vacant Lot'
  );
  const structureLots = records.filter(
    (r) => r.mapCheck === 'MapCheck - Had Structures'
  );
  const unclearLots = records.filter(
    (r) => r.mapCheck === 'MapCheck - Unclear'
  );
  const pendingLots = records.filter(
    (r) => r.mapCheck === 'Pending MapCheck'
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* INPUTS - Displayed as the FIRST thing on the page per instructions */}
        <SearchForm
          cities={cities}
          isLoading={isLoading}
          onSearch={handleSearch}
          onCancel={handleCancelSearch}
        />

        {/* Live Progress Indicator */}
        <ProgressIndicator
          progress={progress}
          totalFound={records.length}
          vacantFound={records.length}
        />

        {/* Error notification if any */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to complete DCAD query</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Workflow Overview Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-xs">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
              1
            </div>
            <div>
              <div className="font-semibold text-slate-900">STEP 1: Pull All Results, All Pages</div>
              <div className="text-slate-500 text-[11px]">
                Searches SearchAddr.aspx (all pages) &amp; inspects detail pages for $0 improvement value.
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
              2
            </div>
            <div>
              <div className="font-semibold text-slate-900">STEP 2: Manually Verify Each on 2026 Map</div>
              <div className="text-slate-500 text-[11px]">
                Switch DCAD map to 2026 Hybrid, check aerial imagery, and assign exact MapCheck values.
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 MapCheck Quick Action Banner */}
        {records.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Found {records.length} Vacant Lots on {searchParams.streetName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Step 1 Complete
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {vacantCheckLots.length} confirmed vacant • {structureLots.length} had structures • {unclearLots.length} unclear • {pendingLots.length} pending MapCheck
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenMapVerification(0)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Launch 2026 MapCheck Viewer</span>
              </button>

              {pendingLots.length > 0 && (
                <button
                  onClick={handleSetAllUncheckedVacant}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-colors cursor-pointer"
                  title="Mark all pending as MapCheck - Vacant Lot"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Mark Rest Vacant</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Output: Results Table with exact required columns:
            Address, City, Zip, Account Number, DCAD Link, Map Link, MapCheck */}
        <ResultsTable
          records={records}
          onOpenMapVerification={handleOpenMapVerification}
          onUpdateMapCheck={handleUpdateMapCheck}
          onRunAutoMapCheck={handleRunAutoMapCheck}
          isAutoChecking={isAutoChecking}
          onExportCSV={() => setIsExportModalOpen(true)}
          onExportGoogleSheets={() => setIsExportModalOpen(true)}
          onSetAllUncheckedVacant={handleSetAllUncheckedVacant}
          activeZipFilter={searchParams.zipFilter}
          onZipFilterChange={(zip) => setSearchParams((prev) => ({ ...prev, zipFilter: zip }))}
        />
      </main>

      {/* Visual Verification Modal with Embedded DCAD 2026 Property Map Viewer */}
      <VisualVerificationModal
        lots={records}
        currentIndex={activeLotIndex}
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onSetMapCheck={handleUpdateMapCheck}
        onSelectIndex={setActiveLotIndex}
        onSetAllUncheckedVacant={handleSetAllUncheckedVacant}
      />

      {/* Export Modal with CSV & Google Sheets Options */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        records={records}
        streetName={searchParams.streetName}
        city={searchParams.city}
      />
    </div>
  );
}

