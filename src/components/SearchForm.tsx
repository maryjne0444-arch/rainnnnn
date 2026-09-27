import React, { useState } from 'react';
import { Search, Loader2, Sparkles, Filter, Info, Building } from 'lucide-react';
import type { CityOption } from '../types/property.ts';

interface SearchFormProps {
  cities: CityOption[];
  isLoading: boolean;
  onSearch: (params: { streetName: string; city: string; zipFilter?: string; maxResults?: number }) => void;
  onCancel?: () => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  cities,
  isLoading,
  onSearch,
  onCancel,
}) => {
  const [streetName, setStreetName] = useState('Pennsylvania Ave');
  const [city, setCity] = useState('Dallas');
  const [zipFilter, setZipFilter] = useState('');
  const [maxResults, setMaxResults] = useState(50);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!streetName.trim()) return;
    onSearch({
      streetName: streetName.trim(),
      city: city.trim() || 'Dallas',
      zipFilter: zipFilter.trim() || undefined,
      maxResults,
    });
  };

  const sampleStreets = [
    { street: 'Pennsylvania Ave', city: 'Dallas', zip: '75215', label: 'Pennsylvania Ave (Dallas)' },
    { street: 'Malcolm X Blvd', city: 'Dallas', zip: '75215', label: 'Malcolm X Blvd (Dallas)' },
    { street: 'Grand Ave', city: 'Dallas', zip: '75215', label: 'Grand Ave (Dallas)' },
    { street: 'Garland Ave', city: 'Garland', zip: '75040', label: 'Garland Ave (Garland)' },
    { street: 'E 11th St', city: 'Dallas', zip: '75203', label: 'E 11th St (Dallas)' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <span>Search DCAD Residential Properties</span>
          <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            Dallas Central Appraisal District
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Searches <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded">https://www.dallascad.org/SearchAddr.aspx</code>,
          inspects each property detail page for <span className="font-semibold text-emerald-700">$0 / N/A improvement value &amp; vacant land use</span>, and enables 2026 map cross-checking.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Street Name input */}
          <div className="md:col-span-5">
            <label htmlFor="streetName" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Street Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="streetName"
                type="text"
                value={streetName}
                onChange={(e) => setStreetName(e.target.value)}
                placeholder="e.g. Pennsylvania, Malcolm X, Grand, Elm"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 text-sm placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          {/* City input */}
          <div className="md:col-span-4">
            <label htmlFor="city" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              City <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="city"
                type="text"
                list="dallas-cities"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Dallas, Garland, Irving, etc."
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 text-sm font-medium"
              />
              <datalist id="dallas-cities">
                {cities.map((c) => (
                  <option key={c.code || 'all'} value={c.name} />
                ))}
              </datalist>
            </div>
            {city.trim().toUpperCase() === 'DALLAS' && (
              <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <span>✓ Dallas only:</span>
                <span className="font-normal text-slate-500">Excludes neighboring municipalities (Garland, Irving, etc.)</span>
              </p>
            )}
          </div>

          {/* Search Button */}
          <div className="md:col-span-3 flex gap-2">
            <button
              type="submit"
              disabled={isLoading || !streetName.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-medium text-sm transition-colors shadow-sm disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </>
              )}
            </button>

            {isLoading && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
                title="Cancel Search"
              >
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Optional Zip Code filter & Advanced options toggle */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 font-medium cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>{showAdvanced ? 'Hide Optional Zip & Filters' : 'Optional Zip Code Filter & Limits'}</span>
            </button>

            <span className="hidden sm:inline-block text-slate-300">|</span>

            {/* Quick preset chips */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1 text-slate-400">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Quick test:
              </span>
              {sampleStreets.slice(0, 3).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setStreetName(item.street);
                    setCity(item.city);
                    setZipFilter('');
                  }}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer text-xs"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showAdvanced && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label htmlFor="zipFilter" className="block font-medium text-slate-700 mb-1">
                Zip Code (Post-Search Filter)
              </label>
              <input
                id="zipFilter"
                type="text"
                value={zipFilter}
                onChange={(e) => setZipFilter(e.target.value)}
                placeholder="e.g. 75215"
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1 flex items-start gap-1">
                <Info className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                <span>DCAD form filters by street &amp; city; zip is post-filtered from property records.</span>
              </p>
            </div>

            <div>
              <label htmlFor="maxResults" className="block font-medium text-slate-700 mb-1">
                Scan Limit (Max Properties)
              </label>
              <select
                id="maxResults"
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500"
              >
                <option value={20}>20 properties</option>
                <option value={50}>50 properties (recommended)</option>
                <option value={100}>100 properties</option>
                <option value={200}>200 properties</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Limits number of residential parcels inspected for this street.
              </p>
            </div>

            <div className="sm:col-span-2 md:col-span-1">
              <label className="block font-medium text-slate-700 mb-1">
                Quick Preset Streets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {sampleStreets.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setStreetName(item.street);
                      setCity(item.city);
                      setZipFilter(item.zip);
                    }}
                    className="px-2 py-1 rounded bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-600 text-xs font-medium transition-colors"
                  >
                    {item.street} ({item.city})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
