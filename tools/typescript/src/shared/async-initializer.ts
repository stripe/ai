/**
 * A reusable utility for async initialization with promise locking.
 * Ensures initialization runs only once, even if called concurrently.
 */
export class AsyncInitializer {
  private _initialized = false;
  private _initPromise: Promise<void> | null = null;

  /**
   * Initialize using the provided function.
   * - If already initialized, returns immediately
   * - If initialization in progress, returns existing promise
   * - If initialization fails, allows retry on next call
   */
  initialize(doInitialize: () => Promise<void>): Promise<void> {
    if (this._initPromise) {
      return this._initPromise;
    }

    if (this._initialized) {
      return Promise.resolve();
    }

    this._initPromise = this.doInit(doInitialize);
    return this._initPromise;
  }

  private async doInit(doInitialize: () => Promise<void>): Promise<void> {
    try {
      await doInitialize();
      this._initialized = true;
    } catch (error) {
      // Reset promise on failure so retry is possible
      this._initPromise = null;
      throw error;
    }
  }

  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Reset the initializer state. Used during close/cleanup.
   */
  reset(): void {
    this._initialized = false;
    this._initPromise = null;
  }
}

export default AsyncInitializer;
