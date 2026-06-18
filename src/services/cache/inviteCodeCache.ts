import { cacheManager } from "@/services/cache/CacheManager";

const INVITE_CODE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const inviteCodeCache = {
  getOrSet(therapistId: string, fetcher: () => Promise<string | null>) {
    return cacheManager.getOrSet<string | null>(
      `invite_code:${therapistId}`,
      fetcher,
      INVITE_CODE_TTL
    );
  },
  set(therapistId: string, code: string | null) {
    cacheManager.set<string | null>(
      `invite_code:${therapistId}`,
      code,
      INVITE_CODE_TTL
    );
  },
  invalidate(therapistId: string) {
    return cacheManager.delete(`invite_code:${therapistId}`);
  },
};
