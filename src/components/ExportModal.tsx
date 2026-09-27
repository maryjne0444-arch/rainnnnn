import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  ExternalLink,
  Info,
  Sparkles,
  Table,
} from 'lucide-react';
import type { PropertyRecord } from '../types/property.ts';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: PropertyRecord[];
  streetName: string;
  city: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  records,
  streetName,
  city,
}) => {
  const [copied, setCopied] = useState(false);
  const [filterMode, setFilterMode] = useState<'vacant_only' | 'all'>('all');
  const [sheetId, setSheetId] = useState('');
  const [sheetNotice, setSheetNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const vacantCheckLots = records.filter(
    (r) => r.mapCheck === 'MapCheck - Vacant Lot'
  );

  const exportRecords =
    filterMode === 'vacant_only' && vacantCheckLots.length > 0
      ? vacantCheckLots
      : records;

  // Exact required output columns:
  // Address, City, Zip, Account Number, DCAD Link, Map Link, MapCheck
  const generateCSV = (): string => {
    const headers = [
      'Address',
      'City',
      'Zip',
      'Account Number',
      'DCAD Link',
      'Map Link',
      'MapCheck',
      'Improvement Value',
      'Land Value',
      'Owner on Record',
      'Total Value',
      'MapCheck Note',
    ];

    const rows = exportRecords.map((r) => [
      `"${r.address.replace(/"/g, '""')}"`,
      `"${r.city.replace(/"/g, '""')}"`,
      `"${r.zip || ''}"`,
      `"${r.accountNumber}"`,
      `"${r.dcadLink}"`,
      `"${r.mapLink}"`,
      `"${r.mapCheck}"`,
      r.improvementValueDisplay === 'N/A' ? '"N/A"' : r.improvementValue,
      r.landValue,
      `"${(r.ownerName || '').replace(/"/g, '""')}"`,
      r.totalValue,
      `"${(r.mapCheckExplanation || r.mapCheckNotes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  };

  // Generate Tab-Separated Values (TSV) for direct paste into Google Sheets
  const generateTSV = (): string => {
    const headers = [
      'Address',
      'City',
      'Zip',
      'Account Number',
      'DCAD Link',
      'Map Link',
      'MapCheck',
      'Improvement Value',
      'Land Value',
      'Owner on Record',
      'Total Value',
      'MapCheck Note',
    ];

    const rows = exportRecords.map((r) => [
      r.address,
      r.city,
      r.zip || '',
      r.accountNumber,
      r.dcadLink,
      r.mapLink,
      r.mapCheck,
      r.improvementValueDisplay === 'N/A' ? 'N/A' : r.improvementValue,
      r.landValue,
      r.ownerName || '',
      r.totalValue,
      r.mapCheckExplanation || r.mapCheckNotes || '',
    ]);

    return [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
  };

  const handleDownloadCSV = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeStreet = streetName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', `dcad_vacant_lots_${safeStreet}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyForGoogleSheets = async () => {
    const tsvContent = generateTSV();
    try {
      await navigator.clipboard.writeText(tsvContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleConnectSheetId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetId.trim()) return;
    setSheetNotice(
      `Sheet ID recorded (${sheetId.trim()}). To write directly, paste the copied data below into cell A1 of your Google Sheet, or share edit access to the sheet with your application account.`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Export Dallas County Vacant Lots
              </h3>
              <p className="text-xs text-slate-400">
                {streetName}, {city} • {exportRecords.length} records ready
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Export Filter Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Select Records to Include:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  filterMode === 'all'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="block font-semibold text-xs text-slate-900">
                  All Found Lots ({records.length})
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Includes confirmed, pending, and unclear parcels
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('vacant_only')}
                disabled={vacantCheckLots.length === 0}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  filterMode === 'vacant_only'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <span className="block font-semibold text-xs text-slate-900">
                  Only &ldquo;MapCheck - Vacant Lot&rdquo; ({vacantCheckLots.length})
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Parcels visually verified empty on 2026 map
                </span>
              </button>
            </div>
          </div>

          {/* Export Method 1: CSV File Download */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">
                  Export as CSV (.csv)
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Columns: Address, City, Zip, Account Number, DCAD Link, Map Link, MapCheck
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Download standard CSV formatted for Microsoft Excel, Numbers, GIS platforms, and databases.
            </p>

            <button
              onClick={handleDownloadCSV}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV File ({exportRecords.length} records)</span>
            </button>
          </div>

          {/* Export Method 2: Google Sheets Integration */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-900">
                  Google Sheets Integration
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Instant 1-Click Paste
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Copy tab-formatted records and paste (<kbd className="px-1 py-0.5 bg-white rounded border border-slate-300 font-mono text-[10px]">Ctrl+V</kbd> or <kbd className="px-1 py-0.5 bg-white rounded border border-slate-300 font-mono text-[10px]">Cmd+V</kbd>) directly into cell <strong>A1</strong> of any Google Sheet.
            </p>

            <button
              onClick={handleCopyForGoogleSheets}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-xs shadow-sm transition-colors cursor-pointer ${
                copied
                  ? 'bg-emerald-800 text-white'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Copied to Clipboard! Paste directly into Google Sheets</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-emerald-600" />
                  <span>Copy Formatted for Google Sheets (TSV)</span>
                </>
              )}
            </button>

            {/* Optional Google Sheet ID Field */}
            <form onSubmit={handleConnectSheetId} className="pt-2 border-t border-emerald-200/60 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-700">
                Connect Specific Google Sheet ID (Optional):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer shrink-0"
                >
                  Save ID
                </button>
              </div>

              {sheetNotice && (
                <div className="p-2.5 bg-white rounded border border-emerald-300 text-[11px] text-emerald-900">
                  {sheetNotice}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
