import {AsyncInitializer} from '@/shared/async-initializer';

describe('AsyncInitializer', () => {
  let initializer: AsyncInitializer;

  beforeEach(() => {
    initializer = new AsyncInitializer();
  });

  it('should start uninitialized', () => {
    expect(initializer.isInitialized).toBe(false);
  });

  it('should initialize successfully', async () => {
    let called = 0;
    await initializer.initialize(() => {
      called += 1;
      return Promise.resolve();
    });

    expect(initializer.isInitialized).toBe(true);
    expect(called).toBe(1);
  });

  it('should not re-initialize if already initialized', async () => {
    let called = 0;
    await initializer.initialize(() => {
      called += 1;
      return Promise.resolve();
    });
    await initializer.initialize(() => {
      called += 1;
      return Promise.resolve();
    });

    expect(called).toBe(1);
  });

  it('should handle concurrent initialization calls', async () => {
    let called = 0;
    let resolveInit: () => void;
    const initPromise = new Promise<void>((resolve) => {
      resolveInit = resolve;
    });

    const doInit = async () => {
      called += 1;
      await initPromise;
    };

    // Start multiple concurrent initializations
    const p1 = initializer.initialize(doInit);
    const p2 = initializer.initialize(doInit);
    const p3 = initializer.initialize(doInit);

    // Resolve the init
    resolveInit!();
    await Promise.all([p1, p2, p3]);

    expect(called).toBe(1); // Only called once despite 3 calls
    expect(initializer.isInitialized).toBe(true);
  });

  it('should allow retry after failure', async () => {
    let attempts = 0;
    const doInit = () => {
      attempts += 1;
      if (attempts === 1) {
        return Promise.reject(new Error('First attempt fails'));
      }
      return Promise.resolve();
    };

    // First attempt fails
    await expect(initializer.initialize(doInit)).rejects.toThrow(
      'First attempt fails'
    );
    expect(initializer.isInitialized).toBe(false);

    // Second attempt succeeds
    await initializer.initialize(doInit);
    expect(initializer.isInitialized).toBe(true);
    expect(attempts).toBe(2);
  });

  it('should reset state correctly', async () => {
    await initializer.initialize(() => Promise.resolve());
    expect(initializer.isInitialized).toBe(true);

    initializer.reset();
    expect(initializer.isInitialized).toBe(false);
  });

  it('should allow re-initialization after reset', async () => {
    let called = 0;
    await initializer.initialize(() => {
      called += 1;
      return Promise.resolve();
    });
    expect(called).toBe(1);

    initializer.reset();

    await initializer.initialize(() => {
      called += 1;
      return Promise.resolve();
    });
    expect(called).toBe(2);
    expect(initializer.isInitialized).toBe(true);
  });
});
