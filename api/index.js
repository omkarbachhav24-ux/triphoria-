// Vercel Serverless Function entrypoint for the TRIPHORIA Express API.
//
// Vercel builds every file in /api as a serverless function. Exporting the
// Express app as the default handler lets Vercel invoke it for each request
// routed here by vercel.json (`/api/*` and `/uploads/*`).
//
// The app is fully self-contained: `server/app.js` runs schema init lazily on
// the first request (memoised), so no boot step is required here.
import app from '../server/app.js';

export default app;
