// Local / standalone launcher.
// On Vercel the Express app is imported directly by `api/index.js` and this
// file is never executed.
import { app } from './app.js';
import { ensureSchema } from './db.js';

const PORT = process.env.PORT || 3001;

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[TRIPHORIA SERVER] Backend listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[TRIPHORIA SERVER] Failed to initialise database:', err);
    process.exit(1);
  });
