import React, { useState, useMemo } from 'react';
import {
  ExternalLink,
  Download,
  FileSpreadsheet,
  Check,
  X,
  MapPin,
  Building,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Search,
  HelpCircle,
  Home,
  Filter,
  Sparkles,
} from 'lucide-react';
import type { PropertyRecord, MapCheckValue } from '../types/property.ts';
import { InlineParcelView } from './InlineParcelView.tsx';

interface ResultsTableProps {
  records: PropertyRecord[];
  onOpenMapVerification: (index: number) => void;
  onUpdateMapCheck: (accountNumber: string, status: MapCheckValue, notes?: string) => void;
  onRunAutoMapCheck?: () => void;
  isAutoChecking?: boolean;
  onExportCSV: () => void;
  onExportGoogleSheets: () => void;
  onSetAllUncheckedVacant: () => void;
  activeZipFilter?: string;
  onZipFilterChange?: (zip: string) => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  records,
  onOpenMapVerification,
  onUpdateMapCheck,
  onRunAutoMapCheck,
  isAutoChecking = false,
  onExportCSV,
  onExportGoogleSheets,
  onSetAllUncheckedVacant,
  activeZipFilter = '',
  onZipFilterChange,
}) => {
  const [filterTab, setFilterTab] = useState<
    'all' | 'vacant' | 'structures' | 'unclear' | 'pending'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'address' | 'landValue' | 'ownerName' | 'accountNumber' | 'mapCheck'>('address');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedParcelId, setExpandedParcelId] = useState<string | null>(null);

  const vacantLots = useMemo(
    () => records.filter((r) => r.mapCheck === 'MapCheck - Vacant Lot'),
    [records]
  );
  const structureLots = useMemo(
    () => records.filter((r) => r.mapCheck === 'MapCheck - Had Structures'),
    [records]
  );
  const unclearLots = useMemo(
    () => records.filter((r) => r.mapCheck === 'MapCheck - Unclear'),
    [records]
  );
  const pendingLots = useMemo(
    () => records.filter((r) => r.mapCheck === 'Pending MapCheck'),
    [records]
  );

  const displayedRecords = useMemo(() => {
    let list: PropertyRecord[] = [];
    if (filterTab === 'vacant') {
      list = vacantLots;
    } else if (filterTab === 'structures') {
      list = structureLots;
    } else if (filterTab === 'unclear') {
      list = unclearLots;
    } else if (filterTab === 'pending') {
      list = pendingLots;
    } else {
      list = records;
    }

    if (activeZipFilter.trim()) {
      const zf = activeZipFilter.trim();
      list = list.filter((r) => r.zip && r.zip.startsWith(zf));
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.address.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.zip.toLowerCase().includes(q) ||
          (r.ownerName && r.ownerName.toLowerCase().includes(q)) ||
          r.accountNumber.toLowerCase().includes(q) ||
          r.mapCheck.toLowerCase().includes(q) ||
          r.propertyClass.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'address') {
        cmp = a.address.localeCompare(b.address);
      } else if (sortBy === 'landValue') {
        cmp = a.landValue - b.landValue;
      } else if (sortBy === 'ownerName') {
        cmp = (a.ownerName || '').localeCompare(b.ownerName || '');
      } else if (sortBy === 'accountNumber') {
        cmp = a.accountNumber.localeCompare(b.accountNumber);
      } else if (sortBy === 'mapCheck') {
        cmp = a.mapCheck.localeCompare(b.mapCheck);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [
    records,
    filterTab,
    vacantLots,
    structureLots,
    unclearLots,
    pendingLots,
    activeZipFilter,
    searchTerm,
    sortBy,
    sortOrder,
  ]);

  const toggleSort = (field: 'address' | 'landValue' | 'ownerName' | 'accountNumber' | 'mapCheck') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-12">
      {/* Top Action Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">
              Vacant Residential Lots
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {displayedRecords.length} {displayedRecords.length === 1 ? 'Lot' : 'Lots'}
            </span>
            {pendingLots.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                {pendingLots.length} Pending MapCheck
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Filtered for $0 improvement value &amp; vacant land use. Verify aerial imagery on DCAD 2026 map viewer.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onRunAutoMapCheck && records.length > 0 && (
            <button
              onClick={onRunAutoMapCheck}
              disabled={isAutoChecking}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
              title="Automatically run MapCheck on all parcels using AI aerial vision & DCAD physical structure records"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAutoChecking ? 'animate-spin' : 'text-indigo-200'}`} />
              <span>{isAutoChecking ? 'Auto-Checking Lots...' : '⚡ Auto MapCheck All'}</span>
            </button>
          )}

          {records.length > 0 && (
            <button
              onClick={() => onOpenMapVerification(0)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Step 2: 2026 MapCheck Viewer</span>
            </button>
          )}

          <button
            onClick={onExportCSV}
            disabled={records.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Table as CSV</span>
          </button>

          <button
            onClick={onExportGoogleSheets}
            disabled={records.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Google Sheets</span>
          </button>
        </div>
      </div>

      {/* Tabs and Filter Toolbar */}
      <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        {/* Filter Tabs matching exact status options */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>All Lots</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              filterTab === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'
            }`}>
              {records.length}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('vacant')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'vacant'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>MapCheck - Vacant Lot</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              filterTab === 'vacant' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-800'
            }`}>
              {vacantLots.length}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('structures')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'structures'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Had Structures</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              filterTab === 'structures' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-800'
            }`}>
              {structureLots.length}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('unclear')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'unclear'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Unclear</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              filterTab === 'unclear' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-800'
            }`}>
              {unclearLots.length}
            </span>
          </button>

          {pendingLots.length > 0 && (
            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'pending'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Pending</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filterTab === 'pending' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {pendingLots.length}
              </span>
            </button>
          )}
        </div>

        {/* Quick Search and Zip Filter */}
        <div className="flex items-center gap-2">
          {onZipFilterChange && (
            <div className="relative w-28">
              <input
                type="text"
                value={activeZipFilter}
                onChange={(e) => onZipFilterChange(e.target.value)}
                placeholder="Zip Filter"
                maxLength={5}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                title="Filter by Zip Code shown on property detail"
              />
            </div>
          )}

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search table..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Main Data Table with exact required columns:
          Address, City, Zip, Account Number, DCAD Link, Map Link, MapCheck */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              {/* 1. Address */}
              <th className="py-3 px-4">
                <button
                  onClick={() => toggleSort('address')}
                  className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                >
                  <span>Address</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>

              {/* 2. City */}
              <th className="py-3 px-3">City</th>

              {/* 3. Zip */}
              <th className="py-3 px-3">Zip</th>

              {/* 4. Account Number */}
              <th className="py-3 px-3">
                <button
                  onClick={() => toggleSort('accountNumber')}
                  className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                >
                  <span>Account Number</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>

              {/* Land Value (helpful appraisal context) */}
              <th className="py-3 px-3">
                <button
                  onClick={() => toggleSort('landValue')}
                  className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                >
                  <span>Land Value</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>

              {/* Owner on Record (Required: Next to Land Value) */}
              <th className="py-3 px-3 min-w-[150px]">
                <button
                  onClick={() => toggleSort('ownerName')}
                  className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                >
                  <span>Owner on Record</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>

              {/* 5. DCAD Link */}
              <th className="py-3 px-3 text-center">DCAD Link</th>

              {/* 6. Map Link */}
              <th className="py-3 px-3 text-center">Map Link</th>

              {/* 7. MapCheck (Exact required column) */}
              <th className="py-3 px-4 min-w-[210px]">
                <button
                  onClick={() => toggleSort('mapCheck')}
                  className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                >
                  <span>MapCheck</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>

              <th className="py-3 px-3 text-right min-w-[130px]">2026 Map View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedRecords.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500">
                  <div className="max-w-md mx-auto space-y-2">
                    <p className="font-semibold text-slate-700 text-sm">
                      No matching properties found
                    </p>
                    <p className="text-xs text-slate-500">
                      {records.length === 0
                        ? 'Enter a street name and city above and click Search to pull results from DCAD.'
                        : 'No parcels matched the selected tab or search query.'}
                    </p>
                    {pendingLots.length > 0 && filterTab !== 'all' && (
                      <button
                        onClick={() => setFilterTab('all')}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 cursor-pointer"
                      >
                        View All {records.length} Lots
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              displayedRecords.map((property, idx) => {
                const originalIndex = records.findIndex(
                  (r) => r.accountNumber === property.accountNumber
                );
                const isVacant = property.mapCheck === 'MapCheck - Vacant Lot';
                const isStructures = property.mapCheck === 'MapCheck - Had Structures';
                const isUnclear = property.mapCheck === 'MapCheck - Unclear';
                const isPending = property.mapCheck === 'Pending MapCheck';

                return (
                  <React.Fragment key={property.accountNumber}>
                    <tr
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isVacant
                          ? 'bg-emerald-50/30'
                          : isStructures
                          ? 'bg-rose-50/20 opacity-75'
                          : isUnclear
                          ? 'bg-amber-50/20'
                          : ''
                      }`}
                    >
                    {/* 1. Address */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{property.address}</span>
                      </div>
                      {property.legalDescription && (
                        <span className="text-[10px] text-slate-400 block ml-5 truncate max-w-xs">
                          {property.legalDescription}
                        </span>
                      )}
                    </td>

                    {/* 2. City */}
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {property.city || 'DALLAS'}
                    </td>

                    {/* 3. Zip */}
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {property.zip || '—'}
                    </td>

                    {/* 4. Account Number */}
                    <td className="py-3 px-3">
                      <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] select-all">
                        {property.accountNumber}
                      </span>
                    </td>

                    {/* Land Value */}
                    <td className="py-3 px-3 font-medium text-slate-800">
                      ${property.landValue.toLocaleString()}
                      <span className="block text-[10px] text-emerald-600 font-medium">
                        {property.improvementValueDisplay === 'N/A' ? 'N/A Imp' : '$0 Imp'}
                      </span>
                    </td>

                    {/* Owner on Record (Required: Next to Land Value) */}
                    <td className="py-3 px-3 text-slate-700">
                      <span
                        className="font-medium text-[11px] truncate max-w-[160px] block"
                        title={property.ownerName || 'DCAD Not Listed'}
                      >
                        {property.ownerName || <span className="text-slate-400 italic">Not Listed</span>}
                      </span>
                    </td>

                    {/* 5. DCAD Link */}
                    <td className="py-3 px-3 text-center">
                      <a
                        href={property.dcadLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium transition-colors border border-slate-200"
                        title="Open DCAD Certified Account Detail Page"
                      >
                        <Building className="w-3 h-3 text-slate-600" />
                        <span>Detail</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                      </a>
                    </td>

                    {/* 6. Map Link (Pops out 2026 map viewer modal without opening a new tab) */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenMapVerification(originalIndex >= 0 ? originalIndex : idx)
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 hover:border-emerald-400"
                        title="Click to pop out 2026 Property Map Viewer (no new tab)"
                      >
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        <span>Map</span>
                      </button>
                    </td>

                    {/* 7. MapCheck (Exact required values) */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          {isVacant ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>MapCheck - Vacant Lot</span>
                            </span>
                          ) : isStructures ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <Home className="w-3 h-3 text-rose-600" />
                              <span>MapCheck - Had Structures</span>
                            </span>
                          ) : isUnclear ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <HelpCircle className="w-3 h-3 text-amber-600" />
                              <span>MapCheck - Unclear</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-300">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span>Pending MapCheck</span>
                            </span>
                          )}

                          {property.mapLoadError && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-200 text-amber-900"
                              title="Map imagery failed to load in embed"
                            >
                              Load Error
                            </span>
                          )}
                        </div>

                        {/* Inline Quick Selector buttons */}
                        <div className="flex items-center gap-1 pt-0.5">
                          <button
                            onClick={() =>
                              onUpdateMapCheck(property.accountNumber, 'MapCheck - Vacant Lot')
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                              isVacant
                                ? 'bg-emerald-700 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800'
                            }`}
                            title="Mark as MapCheck - Vacant Lot"
                          >
                            ✓ Vacant
                          </button>
                          <button
                            onClick={() =>
                              onUpdateMapCheck(property.accountNumber, 'MapCheck - Had Structures')
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                              isStructures
                                ? 'bg-rose-700 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-rose-100 hover:text-rose-800'
                            }`}
                            title="Mark as MapCheck - Had Structures"
                          >
                            ✗ House
                          </button>
                          <button
                            onClick={() =>
                              onUpdateMapCheck(property.accountNumber, 'MapCheck - Unclear')
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                              isUnclear
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-800'
                            }`}
                            title="Mark as MapCheck - Unclear"
                          >
                            ? Unclear
                          </button>
                        </div>

                        {/* Auto-check explanation or notes */}
                        {property.mapCheckExplanation && (
                          <div className="text-[10px] text-slate-500 pt-0.5 leading-tight">
                            <span className="font-semibold text-slate-600">
                              {property.autoChecked ? '🤖 ' : ''}
                            </span>
                            {property.mapCheckExplanation}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* View Button (Grabs 2026 Hybrid Map screenshot & shows inline, no popup new window) */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() =>
                            setExpandedParcelId(
                              expandedParcelId === property.accountNumber
                                ? null
                                : property.accountNumber
                            )
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer shadow-xs ${
                            expandedParcelId === property.accountNumber
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                          }`}
                          title="Grab 2026 hybrid map screenshot and show inline (no popup new window)"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{expandedParcelId === property.accountNumber ? 'Hide' : 'View'}</span>
                        </button>

                        <button
                          onClick={() =>
                            onOpenMapVerification(originalIndex >= 0 ? originalIndex : 0)
                          }
                          className="inline-flex items-center px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs"
                          title="Open in full 2026 map verification modal"
                        >
                          <span className="hidden sm:inline">Modal</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline 2026 Hybrid Map Screenshot View (No popup new window) */}
                  {expandedParcelId === property.accountNumber && (
                    <tr>
                      <td colSpan={10} className="p-0 border-b-2 border-indigo-500">
                        <InlineParcelView
                          property={property}
                          onUpdateMapCheck={onUpdateMapCheck}
                          onClose={() => setExpandedParcelId(null)}
                          onOpenPopout={() =>
                            onOpenMapVerification(originalIndex >= 0 ? originalIndex : idx)
                          }
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
          </tbody>
        </table>
      </div>

      {/* Table Footer info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 text-slate-500 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p>
          Showing {displayedRecords.length} of {records.length} candidate vacant lots.
        </p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{vacantLots.length} Vacant</span>
          </span>
          <span className="flex items-center gap-1 text-rose-700">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>{structureLots.length} Structures</span>
          </span>
          <span className="flex items-center gap-1 text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>{unclearLots.length} Unclear</span>
          </span>
          {pendingLots.length > 0 && (
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>{pendingLots.length} Pending</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
