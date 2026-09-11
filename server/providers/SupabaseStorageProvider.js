import { StorageProvider } from './StorageProvider.js';

/**
 * SupabaseStorageProvider — the intended durable production storage backend.
 *
 * STATUS: BLOCKED — not usable yet. This class documents exactly what is
 * missing rather than pretending to work. Every method throws a clear,
 * typed error identifying the missing configuration; nothing here ever
 * fabricates a successful upload or a fake signed URL.
 *
 * What is missing:
 *   1. SUPABASE_SERVICE_ROLE_KEY (or an equivalent server-side key with
 *      Storage write access) — NOT currently present in this environment.
 *      Only VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY exist,
 *      which are the client-side/publishable credentials used for nothing
 *      storage-related today; they cannot authorize server-side uploads.
 *   2. SUPABASE_STORAGE_BUCKET — the bucket name to write deliverables
 *      into (e.g. "triphoria-deliverables"). Not yet created/decided.
 *   3. The @supabase/supabase-js (or @supabase/storage-js) package —
 *      not yet added as a dependency, deliberately, until the above
 *      credentials exist (no point importing an SDK that can't do
 *      anything with a build that runs everywhere including places
 *      without those env vars set).
 *
 * How to unblock (once credentials exist):
 *   - Set SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET as server
 *     (never VITE_-prefixed / never client-exposed) environment variables.
 *   - `npm install @supabase/supabase-js`
 *   - Implement each method below using
 *     `supabase.storage.from(bucket).upload/remove/createSignedUrl/list`.
 *   - Update server/providers/index.js's selectStorageProvider() to return
 *     this provider once isConfigured is true — no other call site needs
 *     to change, because everything upstream (upload.routes.js,
 *     orders.routes.js) is already written against the StorageProvider
 *     interface, not against a concrete provider.
 *   - The canonical DB reference stays { storageKey (bucket-relative path),
 *     sizeBytes, mimeType, checksum } in order_files / output_versions —
 *     never store a signed URL as the persisted value, only the key.
 */
export class SupabaseStorageProvider extends StorageProvider {
  get name() {
    return 'supabase-storage (BLOCKED — missing credentials)';
  }

  get isConfigured() {
    return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_STORAGE_BUCKET);
  }

  #unavailable(method) {
    const err = new Error(
      `SupabaseStorageProvider.${method}() is not usable: missing SUPABASE_SERVICE_ROLE_KEY and/or ` +
      'SUPABASE_STORAGE_BUCKET. See server/providers/SupabaseStorageProvider.js for what is required. ' +
      'This is a genuine infrastructure gap, not a bug — do not work around it by faking a result.'
    );
    err.status = 503;
    err.code = 'STORAGE_NOT_CONFIGURED';
    return err;
  }

  async upload() { throw this.#unavailable('upload'); }
  async delete() { throw this.#unavailable('delete'); }
  async getSignedUrl() { throw this.#unavailable('getSignedUrl'); }
  async exists() { throw this.#unavailable('exists'); }
  async metadata() { throw this.#unavailable('metadata'); }
}

export default SupabaseStorageProvider;
