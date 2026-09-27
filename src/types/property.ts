export type MapCheckValue =
  | 'MapCheck - Vacant Lot'
  | 'MapCheck - Had Structures'
  | 'MapCheck - Unclear'
  | 'Pending MapCheck';

export interface PropertyRecord {
  accountNumber: string;
  address: string;
  city: string;
  zip: string;
  ownerName?: string;
  improvementValue: number;
  improvementValueDisplay?: string;
  landValue: number;
  totalValue: number;
  propertyClass: string;
  useDescription: string;
  yearBuilt: number | null;
  buildingArea: number | null;
  legalDescription?: string;
  dcadLink: string;
  mapLink: string;
  isLikelyVacant: boolean;
  vacantReason?: string;
  mapCheck: MapCheckValue;
  mapCheckNotes?: string;
  mapCheckExplanation?: string;
  autoChecked?: boolean;
  aerialImageUrl?: string;
  mapLoadError?: boolean;
  coordinates?: { x: number; y: number } | null;
  source: 'dcad_search' | 'dcad_gis';
}

export interface CityOption {
  code: string;
  name: string;
}

export interface SearchProgress {
  stage: 'idle' | 'searching' | 'inspecting' | 'filtering' | 'completed' | 'error';
  message: string;
  percent: number;
  current?: number;
  total?: number;
  foundVacant?: number;
}

export interface SearchParams {
  streetName: string;
  city: string;
  zipFilter?: string;
  maxResults?: number;
  vacantOnly?: boolean;
}

export interface ParcelSnapshotData {
  accountNumber: string;
  address: string;
  city: string;
  zip: string;
  ownerName?: string;
  landValue: number;
  improvementValue: number;
  totalValue: number;
  propertyClass?: string;
  useDescription?: string;
  legalDescription?: string;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  center: { x: number; y: number };
  aerialImageUrl: string;
  parcelOverlayUrl: string;
  rings: [number, number][][];
}
