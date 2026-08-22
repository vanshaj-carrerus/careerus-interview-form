export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const globalForCleanup = globalThis as unknown as {
    _resumeFallbackCleanupStarted?: boolean;
  };
  if (globalForCleanup._resumeFallbackCleanupStarted) {
    return;
  }
  globalForCleanup._resumeFallbackCleanupStarted = true;

  const { isMongoConfigured, deleteExpiredResumeFallbacks } = await import(
    "@/lib/resume-mongo-fallback"
  );

  if (!isMongoConfigured()) {
    return;
  }

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const runCleanup = async () => {
    try {
      const deletedCount = await deleteExpiredResumeFallbacks();
      if (deletedCount > 0) {
        console.log(
          `Resume fallback cleanup: deleted ${deletedCount} expired file(s).`,
        );
      }
    } catch (error) {
      console.error("Resume fallback cleanup failed:", error);
    }
  };

  void runCleanup();
  setInterval(runCleanup, ONE_DAY_MS);
}
