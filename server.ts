import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  DALLAS_COUNTY_CITIES,
  findCityCode,
  queryDCADParcelServer,
  fetchDCADDetailPage,
  searchDCADWebAddrAllPages,
  fetchParcelSnapshot,
} from './server/dcadService.ts';
import { runAutoMapCheck } from './server/autoMapCheck.ts';
import type { PropertyRecord } from './src/types/property.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  // API Route: Dallas County municipalities
  app.get('/api/cities', (_req, res) => {
    res.json(DALLAS_COUNTY_CITIES);
  });

  // API Route: Sample streets for instant 1-click testing
  app.get('/api/sample-streets', (_req, res) => {
    res.json([
      { streetName: 'Pennsylvania Ave', city: 'Dallas', zip: '75215', desc: 'Numerous documented vacant residential lots' },
      { streetName: 'Malcolm X Blvd', city: 'Dallas', zip: '75215', desc: 'Residential & mixed lots in South Dallas' },
      { streetName: 'Grand Ave', city: 'Dallas', zip: '75215', desc: 'East Dallas residential corridor' },
      { streetName: 'Garland Ave', city: 'Garland', zip: '75040', desc: 'Garland residential lots' },
      { streetName: 'E 11th St', city: 'Dallas', zip: '75203', desc: 'Oak Cliff residential parcels' },
    ]);
  });

  // API Route: Property detail inspection
  app.get('/api/property/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const details = await fetchDCADDetailPage(id);
      res.json(details);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch property details' });
    }
  });

  // Unified Search Handler: Step 1 (pull all results, all pages from SearchAddr.aspx, inspect detail page, keep only vacant lots)
  async function performSearch(
    streetName: string,
    city: string,
    zipFilter?: string,
    maxResults = 100,
    onProgress?: (data: { stage: string; message: string; percent: number; current?: number; total?: number; lot?: PropertyRecord }) => void
  ): Promise<PropertyRecord[]> {
    if (!streetName || !streetName.trim()) {
      throw new Error('Street name is required');
    }

    const cleanStreet = streetName.trim();
    const cleanCity = (city || 'DALLAS').trim();
    const { code: cityCode, matchedName } = findCityCode(cleanCity);

    onProgress?.({
      stage: 'searching',
      message: `Connecting to DCAD SearchAddr (https://www.dallascad.org/SearchAddr.aspx) for "${cleanStreet}" in ${matchedName}...`,
      percent: 5,
    });

    let records: PropertyRecord[] = [];

    // Step 1A: Search DCAD Web Portal (SearchAddr.aspx), paginating through ALL result pages
    try {
      const webRecords = await searchDCADWebAddrAllPages(cleanStreet, cityCode, (page, totalPages, count) => {
        const pagePercent = Math.min(35, Math.round((page / Math.max(totalPages, 1)) * 35));
        onProgress?.({
          stage: 'searching',
          message: `Gathering DCAD search results: Page ${page} of ${totalPages} (${count} properties gathered)...`,
          percent: 5 + pagePercent,
          current: page,
          total: totalPages,
        });
      });
      records = webRecords;
    } catch (err) {
      console.warn('DCAD SearchAddr.aspx pagination search failed, falling back to GIS parcel query:', err);
    }

    // Step 1B: If web scraper returned 0, fallback to DCAD GIS Parcel Server
    if (records.length === 0) {
      onProgress?.({
        stage: 'searching',
        message: 'Querying DCAD Parcel GIS Service (https://maps.dcad.org/prdwa/rest/services)...',
        percent: 25,
      });

      try {
        const gisRecords = await queryDCADParcelServer({
          streetName: cleanStreet,
          city: cleanCity,
          limit: Math.max(maxResults, 100),
        });
        records = gisRecords;
      } catch (err) {
        console.warn('GIS query fallback failed:', err);
      }
    } else {
      // If web records found, try to enrich with GIS parcel data (for precise postal zip and geometry)
      try {
        const gisRecords = await queryDCADParcelServer({
          streetName: cleanStreet,
          city: cleanCity,
          limit: Math.max(records.length, 100),
        });
        const gisMap = new Map<string, PropertyRecord>();
        for (const g of gisRecords) {
          gisMap.set(g.accountNumber, g);
        }
        for (const r of records) {
          const g = gisMap.get(r.accountNumber);
          if (g) {
            if (g.zip) r.zip = g.zip;
            if (g.ownerName) r.ownerName = g.ownerName;
            if (g.aerialImageUrl) r.aerialImageUrl = g.aerialImageUrl;
            if (g.coordinates) r.coordinates = g.coordinates;
            if (g.improvementValue !== undefined) r.improvementValue = g.improvementValue;
            if (g.landValue) r.landValue = g.landValue;
            if (g.totalValue) r.totalValue = g.totalValue;
            if (g.propertyClass) r.propertyClass = g.propertyClass;
            if (g.useDescription) r.useDescription = g.useDescription;
            if (g.legalDescription) r.legalDescription = g.legalDescription;
            if (g.buildingArea !== null && g.buildingArea !== undefined) r.buildingArea = g.buildingArea;
            if (g.yearBuilt !== null && g.yearBuilt !== undefined) r.yearBuilt = g.yearBuilt;
            if (g.isLikelyVacant) {
              r.isLikelyVacant = true;
              r.vacantReason = g.vacantReason;
            }
          }
        }
      } catch (err) {
        console.warn('GIS enrichment optional step had error (continuing):', err);
      }
    }

    onProgress?.({
      stage: 'inspecting',
      message: `Found ${records.length} residential properties across all pages. Inspecting detail pages for $0 improvement value & vacant lots...`,
      percent: 40,
      total: records.length,
      current: 0,
    });

    // User requirement: "if dallas is added on city make sure it searches dallas only"
    const isDallasSpecific = cleanCity.trim().toUpperCase() === 'DALLAS';
    const isSpecificCity = cleanCity && cleanCity.toUpperCase() !== 'ALL' && cleanCity.toUpperCase() !== 'DALLAS COUNTY';
    if (isSpecificCity) {
      records = records.filter((r) => {
        const c = (r.city || '').trim().toUpperCase();
        if (isDallasSpecific) {
          return c === 'DALLAS';
        }
        return c === cleanCity.toUpperCase() || c.startsWith(cleanCity.toUpperCase());
      });
    }

    // Step 1C: For each property found, inspect its DCAD detail page & verify vacant criteria
    const vacantOnlyRecords: PropertyRecord[] = [];
    const totalToInspect = records.length;

    for (let i = 0; i < totalToInspect; i++) {
      const record = records[i];
      const currentNum = i + 1;
      const progressPercent = 40 + Math.round((currentNum / Math.max(totalToInspect, 1)) * 45);

      try {
        // Enforce strict city filtering if user requested Dallas
        if (isSpecificCity) {
          const rCity = (record.city || '').trim().toUpperCase();
          if (isDallasSpecific) {
            if (rCity !== 'DALLAS') continue;
          } else if (rCity && rCity !== cleanCity.toUpperCase()) {
            continue;
          }
        }

        // If improvement value or zip not yet verified, check DCAD certified detail page
        if (!record.zip || record.source === 'dcad_search') {
          const detail = await fetchDCADDetailPage(record.accountNumber);
          if (detail.impVal !== null) {
            record.improvementValue = detail.impVal;
          }
          if (detail.isNAImp) {
            record.improvementValue = 0;
            record.improvementValueDisplay = 'N/A';
          } else if (detail.impDisplay) {
            record.improvementValueDisplay = detail.impDisplay;
          }
          if (detail.landVal !== null) {
            record.landValue = detail.landVal;
          }
          if (detail.totalVal !== null) {
            record.totalValue = detail.totalVal;
          }
          if (detail.ownerName && !record.ownerName) {
            record.ownerName = detail.ownerName;
          }
          if (detail.isVacant) {
            record.isLikelyVacant = true;
            record.vacantReason = detail.vacantReason || 'N/A or $0 improvement value';
          }
        }

        // Apply zip code filter if specified by user (using the zip shown on property)
        if (zipFilter && zipFilter.trim()) {
          const cleanZipFilter = zipFilter.trim();
          if (record.zip && !record.zip.startsWith(cleanZipFilter)) {
            continue; // Filtered out by user's zip filter
          }
        }

        // Step 1 requirement: Keep vacant lots based on DCAD's data (including $0 and N/A improvement values)
        const isImpZero = record.improvementValue === 0;
        const isImpNA = record.improvementValueDisplay === 'N/A' || isNaN(record.improvementValue);
        const isClassVacant = (record.propertyClass || '').toUpperCase().includes('VACANT');
        const isUseVacant = (record.useDescription || '').toUpperCase().includes('VACANT');
        const isVacant = isImpZero || isImpNA || isClassVacant || isUseVacant;

        if (isVacant) {
          if (isNaN(record.improvementValue)) {
            record.improvementValue = 0;
            record.improvementValueDisplay = 'N/A';
          }
          record.isLikelyVacant = true;
          record.mapCheck = 'Pending MapCheck';
          if (!record.vacantReason) {
            record.vacantReason = isImpNA
              ? 'N/A improvement value (no structures assessed)'
              : (isImpZero
                  ? '$0 improvement value (no structures assessed)'
                  : `Classified as ${record.propertyClass}`);
          }
          vacantOnlyRecords.push(record);

          const impLabel = record.improvementValueDisplay === 'N/A' ? 'N/A' : '$0';
          onProgress?.({
            stage: 'inspecting',
            message: `[VACANT LOT FOUND] ${record.address} (${impLabel} Improvement, Land: $${record.landValue.toLocaleString()})`,
            percent: progressPercent,
            current: currentNum,
            total: totalToInspect,
            lot: record,
          });
        } else {
          onProgress?.({
            stage: 'inspecting',
            message: `Inspecting ${record.address} (${currentNum}/${totalToInspect}) - Improved ($${record.improvementValue.toLocaleString()}), skipping...`,
            percent: progressPercent,
            current: currentNum,
            total: totalToInspect,
          });
        }

        // Small delay to prevent rate-limiting on DCAD
        if (record.source === 'dcad_search' && !record.zip) {
          await new Promise(r => setTimeout(r, 40));
        }
      } catch (err) {
        console.warn(`Error inspecting property ${record.accountNumber}:`, err);
      }
    }

    // Step 2: Automated MapCheck by the app!
    if (vacantOnlyRecords.length > 0) {
      onProgress?.({
        stage: 'inspecting',
        message: `Step 2: App is automatically performing MapCheck on ${vacantOnlyRecords.length} candidate vacant lots...`,
        percent: 88,
        total: vacantOnlyRecords.length,
      });

      for (let j = 0; j < vacantOnlyRecords.length; j++) {
        const lot = vacantOnlyRecords[j];
        try {
          const autoRes = await runAutoMapCheck(lot);
          lot.mapCheck = autoRes.mapCheck;
          lot.mapCheckExplanation = autoRes.explanation;
          lot.autoChecked = true;

          onProgress?.({
            stage: 'inspecting',
            message: `[MapCheck Done] ${lot.address} -> ${lot.mapCheck}`,
            percent: 88 + Math.round(((j + 1) / vacantOnlyRecords.length) * 11),
            current: j + 1,
            total: vacantOnlyRecords.length,
            lot,
          });
        } catch (err) {
          console.warn(`Error running auto MapCheck on ${lot.accountNumber}:`, err);
        }
      }
    }

    onProgress?.({
      stage: 'completed',
      message: `Complete: Kept ${vacantOnlyRecords.length} vacant lots, all automatically map-checked.`,
      percent: 100,
      total: vacantOnlyRecords.length,
    });

    return vacantOnlyRecords;
  }

  // API Route: DCAD Map Viewer automatically locked to 2026 Hybrid basemap
  app.get('/api/dcad-map', async (req, res) => {
    const parcelId = req.query.parcelid ? String(req.query.parcelid) : '';
    try {
      const dcadUrl = `https://maps.dcad.org/prd/dpm/?parcelid=${encodeURIComponent(parcelId)}`;
      const response = await fetch(dcadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });
      let html = await response.text();

      // Inject base href and auto-switch script for 2026 Hybrid
      const auto2026Script = `
        <base href="https://maps.dcad.org/prd/dpm/">
        <script>
          // Automatic 2026 Hybrid Basemap Selection
          (function() {
            function activate2026() {
              var thumb = document.getElementById("imgThumbNailimagery2026Map");
              if (thumb) {
                if (typeof ChangeBaseMap === "function") {
                  try {
                    ChangeBaseMap(thumb);
                    console.log("[DCAD 2026 Auto] Successfully activated 2026 Hybrid via ChangeBaseMap!");
                    return true;
                  } catch (e) {}
                }
                try {
                  thumb.click();
                  console.log("[DCAD 2026 Auto] Successfully activated 2026 Hybrid via click!");
                  return true;
                } catch (e) {}
              }
              return false;
            }

            var tries = 0;
            var timer = setInterval(function() {
              tries++;
              if (activate2026() || tries > 60) {
                clearInterval(timer);
              }
            }, 200);

            window.addEventListener("load", function() {
              setTimeout(activate2026, 600);
              setTimeout(activate2026, 1800);
            });
          })();
        </script>
      `;

      html = html.replace('<head>', `<head>\n${auto2026Script}`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err: any) {
      console.error('Error proxying DCAD map:', err);
      res.redirect(`https://maps.dcad.org/prd/dpm/?parcelid=${encodeURIComponent(parcelId)}`);
    }
  });

  // API Route: DCAD 2026 Official Aerial Photography Proxy
  app.get('/api/dcad-aerial-2026', async (req, res) => {
    const bbox = req.query.bbox ? String(req.query.bbox) : '';
    const size = req.query.size ? String(req.query.size) : '900,600';
    if (!bbox) {
      return res.status(400).send('Missing bbox query parameter');
    }
    try {
      // Official DCAD 2026 Aerial Photography endpoint via DCAD's proxy.ashx
      const dcad2026Url = `https://maps.dcad.org/DotNet/proxy.ashx?https://maps.dcad.org/prdwa/rest/services/Imagery/Imagery2026/MapServer/export?bbox=${encodeURIComponent(bbox)}&bboxSR=3857&imageSR=3857&size=${encodeURIComponent(size)}&f=image`;
      const imgRes = await fetch(dcad2026Url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://maps.dcad.org/prd/dpm/',
        },
      });
      if (!imgRes.ok) {
        throw new Error(`DCAD Imagery2026 HTTP ${imgRes.status}`);
      }
      const contentType = imgRes.headers.get('content-type') || 'image/png';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const arrayBuffer = await imgRes.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      console.warn('Error fetching 2026 DCAD aerial, using fallback:', err.message);
      try {
        const fallbackUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${encodeURIComponent(bbox)}&bboxSR=3857&imageSR=3857&size=${encodeURIComponent(size)}&f=image`;
        const fbRes = await fetch(fallbackUrl);
        if (fbRes.ok) {
          res.setHeader('Content-Type', fbRes.headers.get('content-type') || 'image/jpeg');
          const buf = await fbRes.arrayBuffer();
          return res.send(Buffer.from(buf));
        }
      } catch (_fbErr) {}
      return res.status(500).send('Unable to load aerial photography');
    }
  });

  // API Route: DCAD Parcel Line Overlay Proxy
  app.get('/api/dcad-parcel-overlay', async (req, res) => {
    const bbox = req.query.bbox ? String(req.query.bbox) : '';
    const size = req.query.size ? String(req.query.size) : '900,600';
    if (!bbox) {
      return res.status(400).send('Missing bbox query parameter');
    }
    try {
      const overlayUrl = `https://maps.dcad.org/prdwa/rest/services/Property/ImageryParcel/MapServer/export?bbox=${encodeURIComponent(bbox)}&bboxSR=3857&imageSR=3857&size=${encodeURIComponent(size)}&transparent=true&f=image`;
      const imgRes = await fetch(overlayUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://maps.dcad.org/prd/dpm/',
        },
      });
      if (!imgRes.ok) {
        throw new Error(`ImageryParcel HTTP ${imgRes.status}`);
      }
      res.setHeader('Content-Type', imgRes.headers.get('content-type') || 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const arrayBuffer = await imgRes.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      console.warn('Error fetching parcel overlay:', err.message);
      // Return 1x1 transparent PNG on error so img doesn't break
      const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      res.setHeader('Content-Type', 'image/png');
      return res.send(transparentPng);
    }
  });

  // API Route: Fetch 2026 Hybrid Map screenshot data & parcel geometry
  app.get('/api/parcel-snapshot/:accountNumber', async (req, res) => {
    const accountNumber = req.params.accountNumber;
    const address = req.query.address ? String(req.query.address) : undefined;
    try {
      const snapshot = await fetchParcelSnapshot(accountNumber, address);
      if (!snapshot) {
        return res.status(404).json({ success: false, error: 'Parcel snapshot not found' });
      }
      return res.json({ success: true, snapshot });
    } catch (err: any) {
      console.error(`Error in /api/parcel-snapshot/${accountNumber}:`, err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Run automated MapCheck on demand
  app.post('/api/auto-mapcheck', async (req, res) => {
    try {
      const { lots } = req.body;
      if (!Array.isArray(lots)) {
        return res.status(400).json({ error: 'lots must be an array of property records' });
      }

      const results = [];
      for (const lot of lots) {
        const check = await runAutoMapCheck(lot);
        results.push({
          accountNumber: lot.accountNumber,
          mapCheck: check.mapCheck,
          explanation: check.explanation,
          confidence: check.confidence,
        });
      }

      res.json({ success: true, count: results.length, results });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Auto MapCheck failed' });
    }
  });

  // API Route: Standard JSON Search
  app.post('/api/search', async (req, res) => {
    try {
      const { streetName, city, zipFilter, maxResults } = req.body;
      const results = await performSearch(streetName, city, zipFilter, maxResults);
      res.json({ success: true, count: results.length, results });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Search failed' });
    }
  });

  // API Route: SSE Streaming Search for Real-Time Progress
  app.get('/api/search/stream', async (req, res) => {
    const streetName = (req.query.streetName as string) || '';
    const city = (req.query.city as string) || 'Dallas';
    const zipFilter = (req.query.zipFilter as string) || '';
    const maxResults = parseInt((req.query.maxResults as string) || '50', 10);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const results = await performSearch(
        streetName,
        city,
        zipFilter,
        maxResults,
        (progress) => {
          sendEvent('progress', progress);
          if (progress.lot) {
            sendEvent('lot_found', progress.lot);
          }
        }
      );

      sendEvent('done', {
        results,
        vacantLots: results.filter(r => r.isLikelyVacant),
      });
      res.end();
    } catch (err: any) {
      sendEvent('error', { error: err.message || 'Search execution failed' });
      res.end();
    }
  });

  // Serve static dist in production, or mount Vite middleware in development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dallas County Vacant Lot Finder server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
