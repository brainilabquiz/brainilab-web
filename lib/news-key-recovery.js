import {publicJSON} from './public-json.js';

export async function newsKeyFingerprint(key) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

// Only the scheduled refresh calls this helper. Compare the configured secret
// with the one that received the 401, entirely inside the private news object.
export async function scheduledKeyRecovery(storage, key, model, slot, fetcher) {
  const status = await storage.get('status');
  if (status?.code !== 'invalid-key' || !Number.isFinite(Date.parse(status.checkedAt))) return null;
  const fingerprint = await newsKeyFingerprint(key);
  const recovery = {failedAt: status.checkedAt};
  if (status.failedKeyFingerprint) return status.failedKeyFingerprint === fingerprint ? null : recovery;

  // Older failures lack a fingerprint. Authenticate using model metadata only.
  // Claim the check before I/O so overlapping cron deliveries cannot repeat it.
  const claimed = await storage.transaction(async tx => {
    const current = await tx.get('status');
    const diagnostic = await tx.get('api-diagnostic');
    const last = await tx.get('news-key-check');
    if (current?.code !== 'invalid-key' || current.checkedAt !== recovery.failedAt || current.failedKeyFingerprint ||
        diagnostic?.httpStatus !== 401 || diagnostic.checkedAt !== recovery.failedAt || last?.slot >= slot) return false;
    await tx.put('news-key-check', {slot});
    return true;
  });
  if (!claimed) return null;

  try {
    const response = await fetcher('https://api.openai.com/v1/models/' + model, {
      method: 'GET', headers: {Authorization: 'Bearer ' + key}, redirect: 'error', signal: AbortSignal.timeout(10000)
    });
    if (response.status === 200) {
      const metadata = await publicJSON(response, 8192);
      return metadata?.object === 'model' && metadata.id === model ? recovery : null;
    }
    await response.body?.cancel();
    if (response.status === 401) {
      await storage.transaction(async tx => {
        const current = await tx.get('status');
        if (current?.code === 'invalid-key' && current.checkedAt === recovery.failedAt && !current.failedKeyFingerprint) {
          await tx.put('status', {...current, failedKeyFingerprint: fingerprint});
        }
      });
    }
  } catch {
    // An inconclusive metadata read leaves the paid workflow paused.
  }
  return null;
}
