# Dallas County Vacant Residential Lot Finder

Find and verify vacant residential lots in Dallas County using live Dallas Central
Appraisal District (DCAD) public records and DCAD's official aerial/parcel map layers.

The app runs an Express + Vite server that queries DCAD's public `SearchAddr.aspx`
portal and GIS parcel services directly (no API key required), cross-checks each
result's certified improvement value / building footprint, and flags likely-vacant
lots.

## Prerequisites

- Node.js 22.x

## Run Locally

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
3. Open the printed local URL in your browser.

## Build for production

`npm run build` outputs a production bundle to `dist/`. Run the server with
`NODE_ENV=production npm start` to serve it.

No environment variables are required to run this app.
