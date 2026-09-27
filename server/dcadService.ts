import type { CityOption, PropertyRecord } from '../src/types/property.ts';

export const DALLAS_COUNTY_CITIES: CityOption[] = [
  { code: '', name: 'ALL DALLAS COUNTY' },
  { code: '12', name: 'DALLAS' },
  { code: '20', name: 'GARLAND' },
  { code: '31', name: 'IRVING' },
  { code: '34', name: 'MESQUITE' },
  { code: '24', name: 'GRAND PRAIRIE' },
  { code: '39', name: 'RICHARDSON' },
  { code: '3', name: 'CARROLLTON' },
  { code: '40', name: 'ROWLETT' },
  { code: '15', name: 'DESOTO' },
  { code: '6', name: 'CEDAR HILL' },
  { code: '32', name: 'LANCASTER' },
  { code: '17', name: 'FARMERS BRANCH' },
  { code: '10', name: 'COPPELL' },
  { code: '16', name: 'DUNCANVILLE' },
  { code: '1', name: 'ADDISON' },
  { code: '2', name: 'BALCH SPRINGS' },
  { code: '43', name: 'SEAGOVILLE' },
  { code: '42', name: 'SACHSE' },
  { code: '46', name: 'UNIVERSITY PARK' },
  { code: '29', name: 'HIGHLAND PARK' },
  { code: '22', name: 'GLENN HEIGHTS' },
  { code: '30', name: 'HUTCHINS' },
  { code: '45', name: 'SUNNYVALE' },
  { code: '48', name: 'WILMER' },
  { code: '7', name: 'COCKRELL HILL' },
  { code: '9', name: 'COMBINE' },
  { code: '18', name: 'FERRIS' },
  { code: '28', name: 'GRAPEVINE' },
  { code: '33', name: 'LEWISVILLE' },
  { code: '38', name: 'OVILLA' },
  { code: '49', name: 'WYLIE' },
];

export function normalizeStreetName(rawStreet: string): { rootName: string; cleanFullName: string } {
  let cleaned = rawStreet.trim().toUpperCase();
  // Remove directional prefixes if standard
  // Remove standard street type suffixes to get the core root for DCAD SearchAddr
  const suffixes = [
    'AVENUE', 'AVE', 'STREET', 'ST', 'ROAD', 'RD', 'BOULEVARD', 'BLVD',
    'DRIVE', 'DR', 'LANE', 'LN', 'COURT', 'CT', 'WAY', 'TERRACE', 'TER',
    'PLACE', 'PL', 'PARKWAY', 'PKWY', 'CIRCLE', 'CIR', 'TRAIL', 'TRL',
    'HIGHWAY', 'HWY', 'EXPRESSWAY', 'EXPY'
  ];
  
  const regexSuffix = new RegExp(`\\b(${suffixes.join('|')})\\.?$`, 'i');
  const rootName = cleaned.replace(regexSuffix, '').trim();

  return {
    rootName: rootName || cleaned,
    cleanFullName: cleaned,
  };
}

export function findCityCode(cityName: string): { code: string; matchedName: string } {
  const normalized = cityName.trim().toUpperCase();
  if (!normalized || normalized === 'ALL' || normalized === 'DALLAS COUNTY') {
    return { code: '', matchedName: 'ALL' };
  }
  const match = DALLAS_COUNTY_CITIES.find(
    c => c.name === normalized || c.name.startsWith(normalized) || normalized.includes(c.name)
  );
  if (match) {
    return { code: match.code, matchedName: match.name };
  }
  // Default to DALLAS if not matched
  return { code: '12', matchedName: normalized };
}

/**
 * Query official DCAD ArcGIS Parcel Server (https://maps.dcad.org/prdwa/rest/services/Property/ParcelQuery/MapServer/4)
 * Provides comprehensive appraisal attributes, improvement values, and geometry.
 */
export async function queryDCADParcelServer(options: {
  streetName: string;
  city?: string;
  parcelId?: string;
  limit?: number;
}): Promise<PropertyRecord[]> {
  const { streetName, city, parcelId, limit = 50 } = options;
  const whereClauses: string[] = [];

  if (parcelId) {
    whereClauses.push(`PARCELID = '${parcelId}'`);
  } else {
    const { rootName } = normalizeStreetName(streetName);
    whereClauses.push(`UPPER(SITEADDRESS) LIKE '%${rootName.replace(/'/g, "''")}%'`);
    
    if (city && city.toUpperCase() !== 'ALL' && city.toUpperCase() !== 'DALLAS COUNTY') {
      const cityClean = city.trim().toUpperCase();
      if (cityClean === 'DALLAS') {
        // User requested: "if dallas is added on city make sure it searches dallas only"
        whereClauses.push(`UPPER(PSTLCITY) = 'DALLAS'`);
      } else {
        whereClauses.push(`UPPER(PSTLCITY) LIKE '%${cityClean.replace(/'/g, "''")}%'`);
      }
    }

    // Filter residential accounts (USECD = '1' or class contains residential or vacant)
    whereClauses.push(`(USECD = '1' OR CLASSDSCRP LIKE '%RESID%' OR CLASSDSCRP LIKE '%SFR%' OR CLASSDSCRP LIKE '%VAC%' OR USEDSCRP LIKE '%VAC%')`);
  }

  const queryParams = new URLSearchParams({
    where: whereClauses.join(' AND '),
    outFields: 'PARCELID,LOWPARCELID,SITEADDRESS,PSTLCITY,PSTLZIP5,USEDSCRP,CLASSDSCRP,IMPVALUE,LNDVALUE,CNTASSDVAL,RESYRBLT,BLDGAREA,OWNERNME1,CNVYNAME',
    returnGeometry: 'true',
    f: 'json',
  });

  // DCAD ParcelPublishing layer (public query/popup layer) - matches the outFields above
  const url = `https://maps.dcad.org/prdwa/rest/services/Property/ParcelQuery/MapServer/4/query?${queryParams.toString()}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`DCAD GIS Query failed with HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`DCAD GIS Error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const rawFeatures = data.features || [];
  const features = rawFeatures.slice(0, limit);
  const records: PropertyRecord[] = [];

  for (const f of features) {
    const attrs = f.attributes || {};
    const parcelIdVal = (attrs.PARCELID || '').trim();
    const addressVal = (attrs.SITEADDRESS || '').trim();
    const cityVal = (attrs.PSTLCITY || '').trim();

    // User requirement: "if dallas is added on city make sure it searches dallas only"
    if (city && city.trim().toUpperCase() === 'DALLAS') {
      if (cityVal.toUpperCase() !== 'DALLAS') {
        continue; // Strictly Dallas only
      }
    } else if (city && city.toUpperCase() !== 'ALL' && city.toUpperCase() !== 'DALLAS COUNTY') {
      if (!cityVal.toUpperCase().includes(city.trim().toUpperCase())) {
        continue;
      }
    }

    const zipVal = (attrs.PSTLZIP5 || '').trim();

    // Parse improvement value - handle N/A, null, empty, or 0
    let impVal = 0;
    let isImpNA = false;
    const rawImp = attrs.IMPVALUE;
    if (rawImp === null || rawImp === undefined) {
      impVal = 0;
      isImpNA = true;
    } else if (typeof rawImp === 'string' && (
      rawImp.trim().toUpperCase() === 'N/A' ||
      rawImp.trim() === '' ||
      rawImp.trim() === '--' ||
      rawImp.trim().toUpperCase().includes('N/A') ||
      rawImp.trim().toUpperCase() === 'NONE'
    )) {
      impVal = 0;
      isImpNA = true;
    } else {
      const parsed = Number(rawImp);
      if (isNaN(parsed)) {
        impVal = 0;
        isImpNA = true;
      } else {
        impVal = parsed;
      }
    }

    const lndVal = Number(attrs.LNDVALUE ?? 0);
    const totalVal = Number(attrs.CNTASSDVAL ?? (impVal + lndVal));
    const classVal = (attrs.CLASSDSCRP || '').trim();
    const useVal = (attrs.USEDSCRP || '').trim();
    const yearBuilt = attrs.RESYRBLT ? Number(attrs.RESYRBLT) : null;
    const bldgArea = attrs.BLDGAREA ? Number(attrs.BLDGAREA) : null;

    // Check if lot is vacant (include $0 and N/A improvement values)
    const isImpZero = impVal === 0 || isImpNA;
    const isClassVacant = classVal.toUpperCase().includes('VACANT');
    const isUseVacant = useVal.toUpperCase().includes('VACANT');
    const isLikelyVacant = isImpZero || isClassVacant || isUseVacant;

    let vacantReason = '';
    if (isImpNA && isClassVacant) {
      vacantReason = `N/A improvement value & classified as "${classVal}"`;
    } else if (isImpNA) {
      vacantReason = 'N/A improvement value (no structures assessed)';
    } else if (isImpZero && isClassVacant) {
      vacantReason = `$0 improvement value & classified as "${classVal}"`;
    } else if (isImpZero) {
      vacantReason = '$0 improvement value (no structures assessed)';
    } else if (isClassVacant) {
      vacantReason = `Classified as "${classVal}"`;
    }

    let aerialImageUrl: string | undefined;
    let coordinates: { x: number; y: number } | null = null;
    if (f.geometry && f.geometry.rings && f.geometry.rings[0]) {
      const ring = f.geometry.rings[0];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const pt of ring) {
        if (pt[0] < minX) minX = pt[0];
        if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] < minY) minY = pt[1];
        if (pt[1] > maxY) maxY = pt[1];
      }
      const padX = Math.max((maxX - minX) * 0.45, 35);
      const padY = Math.max((maxY - minY) * 0.45, 35);
      const bbox = `${minX - padX},${minY - padY},${maxX + padX},${maxY + padY}`;
      // Official DCAD 2026 Aerial Photography
      aerialImageUrl = `/api/dcad-aerial-2026?bbox=${encodeURIComponent(bbox)}&size=900,600`;
      coordinates = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    }

    const ownerNameVal = (attrs.OWNERNME1 || attrs.CNVYNAME || '').trim();

    records.push({
      accountNumber: parcelIdVal,
      address: addressVal,
      city: cityVal,
      zip: zipVal,
      ownerName: ownerNameVal || undefined,
      improvementValue: impVal,
      improvementValueDisplay: isImpNA ? 'N/A' : `$${impVal.toLocaleString()}`,
      landValue: lndVal,
      totalValue: totalVal,
      propertyClass: classVal,
      useDescription: useVal,
      yearBuilt,
      buildingArea: bldgArea,
      legalDescription: attrs.CNVYNAME ? attrs.CNVYNAME.trim() : undefined,
      dcadLink: `https://www.dallascad.org/AcctDetailRes.aspx?ID=${parcelIdVal}`,
      mapLink: `/api/dcad-map?parcelid=${parcelIdVal}`,
      isLikelyVacant,
      vacantReason,
      mapCheck: 'Pending MapCheck' as const,
      aerialImageUrl,
      coordinates,
      source: 'dcad_gis' as const,
    });
  }

  return records;
}

/**
 * Fetch and parse a property's DCAD Detail Page (https://www.dallascad.org/AcctDetailRes.aspx?ID=...)
 * Confirms exact certified improvement and land values, main improvement notes, and links.
 */
export async function fetchDCADDetailPage(accountNumber: string): Promise<{
  impVal: number | null;
  isNAImp: boolean;
  impDisplay?: string;
  landVal: number | null;
  totalVal: number | null;
  address: string | null;
  ownerName?: string | null;
  neighborhood: string | null;
  mapsco: string | null;
  mainImpMsg: string | null;
  isVacant: boolean;
  vacantReason?: string;
}> {
  const url = `https://www.dallascad.org/AcctDetailRes.aspx?ID=${accountNumber}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  });

  if (!res.ok) {
    return {
      impVal: null,
      isNAImp: false,
      landVal: null,
      totalVal: null,
      address: null,
      neighborhood: null,
      mapsco: null,
      mainImpMsg: null,
      isVacant: false,
    };
  }

  const html = await res.text();

  const parseCurrency = (str: string | undefined | null): number | null => {
    if (!str) return null;
    const cleaned = str.replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const impText = html.match(/id="ValueSummary1_lblImpVal"[^>]*>([^<]+)/i)?.[1]?.trim();
  const landText = html.match(/id="ValueSummary1_pnlValue_lblLandVal"[^>]*>([^<]+)/i)?.[1]?.trim();
  const totalText = html.match(/id="ValueSummary1_pnlValue_lblTotalVal"[^>]*>([^<]+)/i)?.[1]?.trim();
  const addrText = html.match(/id="PropAddr1_lblPropAddr"[^>]*>([^<]+)/i)?.[1]?.replace(/&nbsp;/g, ' ').trim();
  const nbhdText = html.match(/id="lblNbhd"[^>]*>([^<]+)/i)?.[1]?.trim();
  const mapscoText = html.match(/id="lblMapsco"[^>]*>([^<]+)/i)?.[1]?.trim();
  const mainImpMsg = html.match(/id="MainImpRes1_lblMsg"[^>]*>([^<]+)/i)?.[1]?.trim();

  const rawImp = (impText || '').trim();
  const isNAImp = !rawImp ||
    rawImp.toUpperCase() === 'N/A' ||
    rawImp.toUpperCase() === 'NA' ||
    rawImp.toUpperCase().includes('N/A') ||
    rawImp === '--' ||
    rawImp === '-' ||
    rawImp.toUpperCase() === 'NONE' ||
    rawImp.toUpperCase().includes('NO DATA') ||
    rawImp.toUpperCase().includes('NOT APPLICABLE');

  const parsedImp = parseCurrency(rawImp);
  const impVal = isNAImp ? 0 : parsedImp;
  const landVal = parseCurrency(landText);
  const totalVal = parseCurrency(totalText);

  // Parse Owner Name
  const ownerMatch = html.match(/id="lblOwner"[^>]*>([\s\S]*?)<\/span>([\s\S]*?)<br\s*\/?>/i);
  let ownerName: string | null = null;
  if (ownerMatch) {
    const raw = ownerMatch[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (raw && !raw.toLowerCase().includes('no data')) {
      ownerName = raw;
    }
  }

  const isZeroImp = impVal === 0 || isNAImp;
  const hasNoImpMsg = mainImpMsg?.toLowerCase().includes('no main improvement') ?? false;
  const isVacant = isZeroImp || isNAImp || hasNoImpMsg;

  const vacantReason = isNAImp
    ? 'N/A Improvement Value confirmed on DCAD certified detail page'
    : (isZeroImp ? '$0 Improvement Value confirmed on DCAD certified detail page' : undefined);

  return {
    impVal: isNAImp ? 0 : impVal,
    isNAImp,
    impDisplay: isNAImp ? 'N/A' : (impVal !== null ? `$${impVal.toLocaleString()}` : '$0'),
    landVal,
    totalVal,
    address: addrText || null,
    ownerName: ownerName || undefined,
    neighborhood: nbhdText || null,
    mapsco: mapscoText || null,
    mainImpMsg: mainImpMsg || null,
    isVacant,
    vacantReason,
  };
}

/**
 * Searches DCAD SearchAddr.aspx directly using WebForms POST request.
 * Paginates through ALL result pages until every single property is collected.
 */
export async function searchDCADWebAddrAllPages(
  streetName: string,
  cityCode: string,
  onPageGathered?: (page: number, totalPages: number, gatheredCount: number) => void
): Promise<PropertyRecord[]> {
  const { rootName } = normalizeStreetName(streetName);

  // 1. GET search page to acquire session cookie and ViewState
  const getRes = await fetch('https://www.dallascad.org/SearchAddr.aspx', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  });

  const cookie = getRes.headers.get('set-cookie') || '';
  let html = await getRes.text();

  let viewState = html.match(/name="__VIEWSTATE" id="__VIEWSTATE" value="([^"]+)"/)?.[1] || '';
  let viewStateGen = html.match(/name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="([^"]+)"/)?.[1] || '';
  let eventVal = html.match(/name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="([^"]+)"/)?.[1] || '';

  const params = new URLSearchParams();
  params.append('__VIEWSTATE', viewState);
  params.append('__VIEWSTATEGENERATOR', viewStateGen);
  params.append('__EVENTVALIDATION', eventVal);
  params.append('txtAddrNum', '');
  params.append('listStDir', '');
  params.append('txtStName', rootName);
  params.append('txtBldgID', '');
  params.append('txtUnitID', '');
  params.append('listCity', cityCode);
  params.append('AcctTypeCheckList1:chkAcctType:0', 'on'); // Residential only
  params.append('cmdSubmit', 'Search');

  const postRes = await fetch('https://www.dallascad.org/SearchAddr.aspx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Cookie': cookie,
    },
    body: params.toString(),
  });

  html = await postRes.text();
  const records: PropertyRecord[] = [];
  let pageNum = 1;
  const maxPagesLimit = 50; // Safeguard against infinite loops

  while (pageNum <= maxPagesLimit) {
    const pageMatch = html.match(/Page (\d+) of (\d+)/i);
    const totalPages = pageMatch ? parseInt(pageMatch[2], 10) : 1;
    const curPage = pageMatch ? parseInt(pageMatch[1], 10) : pageNum;

    // Parse results from DataGrid SearchResults1_dgResults
    const dgMatch = html.match(/<table[^>]*id="SearchResults1_dgResults"[^>]*>([\s\S]*?)<\/table>/i);
    if (!dgMatch) {
      break;
    }

    const rows = [...dgMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    let pageCount = 0;

    for (const row of rows) {
      const linkMatch = row[1].match(/href=['"](AcctDetailRes\.aspx\?ID=([^'"]+))['"][^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;

      const id = linkMatch[2].trim();
      const address = linkMatch[3].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      const tds = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(td => td[1].replace(/<[^>]+>/g, '').trim());

      // Row format: #, Property Address, City, Owner Name, Total Value, Type
      const city = tds[2] || '';
      const ownerName = (tds[3] || '').trim();
      const totalValStr = tds[4] || '0';
      const totalValue = parseFloat(totalValStr.replace(/[$,]/g, '')) || 0;

      // Avoid duplicate accounts
      if (!records.some(r => r.accountNumber === id)) {
        records.push({
          accountNumber: id,
          address,
          city,
          zip: '', // To be filled from detail page or GIS
          ownerName: ownerName || undefined,
          improvementValue: 0,
          landValue: totalValue,
          totalValue,
          propertyClass: 'Residential',
          useDescription: 'Residential',
          yearBuilt: null,
          buildingArea: null,
          dcadLink: `https://www.dallascad.org/AcctDetailRes.aspx?ID=${id}`,
          mapLink: `/api/dcad-map?parcelid=${id}`,
          isLikelyVacant: false,
          mapCheck: 'Pending MapCheck',
          source: 'dcad_search',
        });
        pageCount++;
      }
    }

    onPageGathered?.(curPage, totalPages, records.length);

    if (curPage >= totalPages) {
      break;
    }

    // Check for NEXT button
    const nextTargetMatch = html.match(/<a href="javascript:__doPostBack\(&#39;([^&]+)&#39;,&#39;&#39;\)">NEXT &gt;<\/a>/i);
    if (!nextTargetMatch) {
      break;
    }

    const nextTarget = nextTargetMatch[1];
    viewState = html.match(/name="__VIEWSTATE" id="__VIEWSTATE" value="([^"]+)"/)?.[1] || '';
    viewStateGen = html.match(/name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="([^"]+)"/)?.[1] || '';
    eventVal = html.match(/name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="([^"]+)"/)?.[1] || '';

    const nextParams = new URLSearchParams();
    nextParams.append('__VIEWSTATE', viewState);
    nextParams.append('__VIEWSTATEGENERATOR', viewStateGen);
    nextParams.append('__EVENTVALIDATION', eventVal);
    nextParams.append('__EVENTTARGET', nextTarget);
    nextParams.append('__EVENTARGUMENT', '');

    const nextRes = await fetch('https://www.dallascad.org/SearchAddr.aspx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Cookie': cookie,
      },
      body: nextParams.toString(),
    });

    html = await nextRes.text();
    pageNum++;
  }

  return records;
}

/**
 * Fetch 2026 Hybrid Map screenshot data and parcel boundary geometry for a specific account.
 */
export async function fetchParcelSnapshot(
  accountNumber: string,
  optionalAddress?: string
): Promise<import('../src/types/property.ts').ParcelSnapshotData | null> {
  const cleanAcc = (accountNumber || '').trim();

  // Helper to query DCAD ParcelQuery MapServer 4 (ParcelPublishing layer)
  const queryGIS = async (whereClause: string) => {
    const queryParams = new URLSearchParams({
      where: whereClause,
      returnGeometry: 'true',
      f: 'json',
      outFields: 'PARCELID,LOWPARCELID,SITEADDRESS,PSTLCITY,PSTLZIP5,IMPVALUE,LNDVALUE,CNTASSDVAL,OWNERNME1,CNVYNAME,CLASSDSCRP,USEDSCRP',
    });
    const url = `https://maps.dcad.org/prdwa/rest/services/Property/ParcelQuery/MapServer/4/query?${queryParams.toString()}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.features?.[0] || null;
  };

  try {
    let feature: any = null;

    // 1. Try querying by PARCELID or LOWPARCELID
    if (cleanAcc) {
      feature = await queryGIS(`(PARCELID = '${cleanAcc.replace(/'/g, "''")}' OR LOWPARCELID = '${cleanAcc.replace(/'/g, "''")}')`);
    }

    // 2. If not found and address is available, try querying by SITEADDRESS
    if (!feature && optionalAddress && optionalAddress.trim()) {
      const { rootName } = normalizeStreetName(optionalAddress);
      feature = await queryGIS(`UPPER(SITEADDRESS) LIKE '%${rootName.replace(/'/g, "''")}%'`);
    }

    const attrs = feature?.attributes || {};
    let rings: [number, number][][] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    if (feature?.geometry && feature.geometry.rings) {
      rings = feature.geometry.rings;
      for (const ring of rings) {
        for (const pt of ring) {
          if (pt[0] < minX) minX = pt[0];
          if (pt[0] > maxX) maxX = pt[0];
          if (pt[1] < minY) minY = pt[1];
          if (pt[1] > maxY) maxY = pt[1];
        }
      }
    }

    // Default centered bounds in Dallas if geometry is missing
    if (!isFinite(minX)) {
      minX = -10772200; maxX = -10772030;
      minY = 3864300; maxY = 3864430;
    }

    const padX = Math.max((maxX - minX) * 0.55, 45);
    const padY = Math.max((maxY - minY) * 0.55, 45);
    const bMinX = minX - padX;
    const bMinY = minY - padY;
    const bMaxX = maxX + padX;
    const bMaxY = maxY + padY;

    const bboxStr = `${bMinX},${bMinY},${bMaxX},${bMaxY}`;
    // Official DCAD 2026 Aerial Photography
    const aerialImageUrl = `/api/dcad-aerial-2026?bbox=${encodeURIComponent(bboxStr)}&size=900,600`;
    const parcelOverlayUrl = `/api/dcad-parcel-overlay?bbox=${encodeURIComponent(bboxStr)}&size=900,600`;

    return {
      accountNumber: (attrs.PARCELID || cleanAcc).trim(),
      address: (attrs.SITEADDRESS || optionalAddress || '').trim(),
      city: (attrs.PSTLCITY || 'DALLAS').trim(),
      zip: (attrs.PSTLZIP5 || '').trim(),
      ownerName: (attrs.OWNERNME1 || attrs.CNVYNAME || '').trim() || undefined,
      landValue: Number(attrs.LNDVALUE ?? 0),
      improvementValue: Number(attrs.IMPVALUE ?? 0),
      totalValue: Number(attrs.CNTASSDVAL ?? 0),
      propertyClass: attrs.CLASSDSCRP?.trim(),
      useDescription: attrs.USEDSCRP?.trim(),
      legalDescription: attrs.CNVYNAME?.trim(),
      bbox: { minX: bMinX, minY: bMinY, maxX: bMaxX, maxY: bMaxY },
      center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
      aerialImageUrl,
      parcelOverlayUrl,
      rings,
    };
  } catch (err) {
    console.warn(`Failed to fetch parcel snapshot for ${cleanAcc}:`, err);
    // Robust fallback: Return snapshot with standard Dallas bounding box so aerial photo still loads
    const bMinX = -10772200;
    const bMaxX = -10772030;
    const bMinY = 3864300;
    const bMaxY = 3864430;
    const bboxStr = `${bMinX},${bMinY},${bMaxX},${bMaxY}`;
    return {
      accountNumber: cleanAcc,
      address: optionalAddress || 'DALLAS PROPERTY',
      city: 'DALLAS',
      zip: '',
      landValue: 0,
      improvementValue: 0,
      totalValue: 0,
      bbox: { minX: bMinX, minY: bMinY, maxX: bMaxX, maxY: bMaxY },
      center: { x: (bMinX + bMaxX) / 2, y: (bMinY + bMaxY) / 2 },
      aerialImageUrl: `/api/dcad-aerial-2026?bbox=${encodeURIComponent(bboxStr)}&size=900,600`,
      parcelOverlayUrl: `/api/dcad-parcel-overlay?bbox=${encodeURIComponent(bboxStr)}&size=900,600`,
      rings: [],
    };
  }
}
