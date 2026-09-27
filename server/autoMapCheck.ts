import type { PropertyRecord, MapCheckValue } from '../src/types/property.ts';

/**
 * Automatically inspects a property parcel using DCAD GIS building footprint,
 * physical improvements ($0), and land-use records.
 */
export async function runAutoMapCheck(lot: PropertyRecord): Promise<{
  mapCheck: MapCheckValue;
  explanation: string;
  confidence: number;
}> {
  // Official DCAD GIS structural rules
  const impZero = lot.improvementValue === 0 || lot.improvementValueDisplay === 'N/A';
  const noBldg = lot.buildingArea === 0 || lot.buildingArea === null;
  const noYear = lot.yearBuilt === null || lot.yearBuilt === 0;
  const classVacant = (lot.propertyClass || '').toUpperCase().includes('VACANT');
  const useVacant = (lot.useDescription || '').toUpperCase().includes('VACANT');

  const impLabel = lot.improvementValueDisplay === 'N/A' ? 'N/A' : '$0';

  if (impZero && noBldg && (classVacant || useVacant || noYear)) {
    return {
      mapCheck: 'MapCheck - Vacant Lot',
      explanation: `App auto-verified: DCAD certified ${impLabel} improvement value and zero recorded building footprint.`,
      confidence: 0.95,
    };
  }

  if ((lot.improvementValue > 0 && lot.improvementValueDisplay !== 'N/A') || (lot.buildingArea && lot.buildingArea > 0)) {
    return {
      mapCheck: 'MapCheck - Had Structures',
      explanation: `App auto-flagged: Assessed improvements of $${lot.improvementValue.toLocaleString()} or building footprint of ${lot.buildingArea} sq ft.`,
      confidence: 0.9,
    };
  }

  return {
    mapCheck: 'MapCheck - Vacant Lot',
    explanation: `App auto-verified: ${impLabel} structural improvement assessed on DCAD public record.`,
    confidence: 0.88,
  };
}
