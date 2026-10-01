import { createClient } from '@supabase/supabase-js';
import { StorageProvider } from './StorageProvider.js';
import { createHash } from 'node:crypto';

/**
 * SupabaseStorageProvider — durable production storage via Supabase Storage.
 *
 * Required env vars (add to .env and Vercel):
 *   SUPABASE_URL              = https://atzbpherzmcojennenng.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = <service role key from Supabase → Settings → API>
 *   SUPABASE_STORAGE_BUCKET   = triphoria-media
 *
 * Create bucket first: Supabase dashboard → Storage → New bucket
 *   Name: triphoria-media   Public: ON   File size limit: 500 MB
 */
export class SupabaseStorageProvider extends StorageProvider {
  #client = null;
  #bucket = null;

  get name() { return 'supabase-storage'; }

  get isConfigured() {
    return Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SUPABASE_STORAGE_BUCKET &&
      (process.env.SUPABASE_URL ||
       process.env.NEXT_PUBLIC_SUPABASE_URL ||
       process.env.VITE_SUPABASE_URL)
    );
  }

  #init() {
    if (this.#client) return;
    const url =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      `https://atzbpherzmcojennenng.supabase.co`;
    this.#client = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });
    this.#bucket = process.env.SUPABASE_STORAGE_BUCKET;
  }

  /** Upload a Node readable stream or Buffer. Returns { storageKey, sizeBytes, checksum, publicUrl }. */
  async upload(stream, storageKey) {
    this.#init();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const checksum = createHash('sha256').update(buffer).digest('hex');
    const contentType = stream.headers?.['content-type'] || 'video/mp4';

    const { error } = await this.#client.storage
      .from(this.#bucket)
      .upload(storageKey, buffer, { contentType, upsert: true, cacheControl: '3600' });

    if (error) {
      const err = new Error(`Supabase storage upload failed: ${error.message}`);
      err.status = 500; err.code = 'STORAGE_UPLOAD_FAILED';
      throw err;
    }

    const { data: urlData } = this.#client.storage
      .from(this.#bucket)
      .getPublicUrl(storageKey);

    return { storageKey, sizeBytes: buffer.length, checksum, publicUrl: urlData?.publicUrl || null };
  }

  async delete(storageKey) {
    this.#init();
    const { error } = await this.#client.storage.from(this.#bucket).remove([storageKey]);
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
  }

  async getSignedUrl(storageKey, expiresInSeconds = 900) {
    this.#init();
    const { data, error } = await this.#client.storage
      .from(this.#bucket)
      .createSignedUrl(storageKey, expiresInSeconds);
    if (error) throw new Error(`Supabase signed URL failed: ${error.message}`);
    return data.signedUrl;
  }

  async exists(storageKey) {
    this.#init();
    const folder = storageKey.split('/').slice(0, -1).join('/');
    const file = storageKey.split('/').pop();
    const { data } = await this.#client.storage.from(this.#bucket).list(folder, { search: file });
    return Boolean(data?.length);
  }

  async metadata(storageKey) {
    this.#init();
    const { data } = this.#client.storage.from(this.#bucket).getPublicUrl(storageKey);
    return { publicUrl: data?.publicUrl };
  }
}

export default SupabaseStorageProvider;
