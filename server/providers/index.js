import { LocalStorageProvider } from './LocalStorageProvider.js';
import { SupabaseStorageProvider } from './SupabaseStorageProvider.js';

export { StorageProvider } from './StorageProvider.js';
export { LocalStorageProvider } from './LocalStorageProvider.js';
export { SupabaseStorageProvider } from './SupabaseStorageProvider.js';

let cachedProvider = null;

/**
 * selectStorageProvider — chooses the active StorageProvider for this
 * process. Memoised (the choice can't change mid-process without a
 * restart, which is fine — env vars are read once at boot everywhere
 * else in this codebase too).
 *
 * Rule: SupabaseStorageProvider only when it is actually configured
 * (has real credentials). LocalStorageProvider is refused outright when
 * running on Vercel (`process.env.VERCEL` is set) because its writes are
 * not durable there — returning it would let the app *think* it has
 * storage when every write is silently lost on the next cold start.
 *
 * When neither is available, this returns null. Callers must treat a
 * null provider as "durable storage is not configured" and respond
 * honestly (503 STORAGE_NOT_CONFIGURED) rather than pretending to
 * succeed — see server/routes/upload.routes.js.
 */
export function selectStorageProvider() {
  if (cachedProvider !== null) return cachedProvider;

  const supabase = new SupabaseStorageProvider();
  if (supabase.isConfigured) {
    cachedProvider = supabase;
    return cachedProvider;
  }

  if (process.env.VERCEL) {
    // No durable provider configured, and local disk is not usable here.
    cachedProvider = null;
    return cachedProvider;
  }

  cachedProvider = new LocalStorageProvider();
  return cachedProvider;
}
