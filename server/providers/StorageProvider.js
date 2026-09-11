/**
 * StorageProvider — the interface every concrete storage backend implements.
 *
 * TRIPHORIA never lets the *database* row be the only record of where a file
 * lives on a temporary/signed URL: the canonical reference for an asset is
 * always { bucket, path/storageKey, metadata } persisted in Postgres
 * (order_files.storage_key, output_versions.storage_key). A signed URL is
 * generated on demand from that canonical reference and expires — it is
 * never the thing stored.
 *
 * Raw customer footage is explicitly out of scope for this interface: it
 * stays a Google Drive shareable URL (see server/routes/orders.routes.js,
 * which validates it's a drive.google.com link). This interface exists for
 * FINAL DELIVERABLES (editor output versions) and any other asset TRIPHORIA
 * itself is responsible for storing durably.
 *
 * @typedef {Object} StorageObjectMetadata
 * @property {string} storageKey   - canonical path/key within the bucket
 * @property {number} sizeBytes
 * @property {string} mimeType
 * @property {string} checksum     - sha256 hex
 * @property {string} uploadedAt   - ISO timestamp
 */
export class StorageProvider {
  /** Human-readable name for logs/diagnostics (e.g. "local-fs", "supabase"). */
  get name() {
    throw new Error('StorageProvider.name must be implemented');
  }

  /** True once this provider has everything it needs (credentials, bucket) to operate. */
  get isConfigured() {
    throw new Error('StorageProvider.isConfigured must be implemented');
  }

  /**
   * Upload a readable stream to the given storageKey.
   * @param {NodeJS.ReadableStream} stream
   * @param {string} storageKey
   * @returns {Promise<StorageObjectMetadata>}
   */
  async upload(_stream, _storageKey) {
    throw new Error(`${this.name}: upload() not implemented`);
  }

  /**
   * Delete an object. Must be idempotent (deleting a missing key is not an error).
   * @param {string} storageKey
   * @returns {Promise<void>}
   */
  async delete(_storageKey) {
    throw new Error(`${this.name}: delete() not implemented`);
  }

  /**
   * Produce a time-limited signed URL for reading the object.
   * @param {string} storageKey
   * @param {number} expiresInSeconds
   * @returns {Promise<string>} a URL the client can fetch directly
   */
  async getSignedUrl(_storageKey, _expiresInSeconds = 900) {
    throw new Error(`${this.name}: getSignedUrl() not implemented`);
  }

  /**
   * @param {string} storageKey
   * @returns {Promise<boolean>}
   */
  async exists(_storageKey) {
    throw new Error(`${this.name}: exists() not implemented`);
  }

  /**
   * @param {string} storageKey
   * @returns {Promise<StorageObjectMetadata|null>}
   */
  async metadata(_storageKey) {
    throw new Error(`${this.name}: metadata() not implemented`);
  }
}

export default StorageProvider;
