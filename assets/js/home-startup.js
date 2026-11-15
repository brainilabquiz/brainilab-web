/* The public homepage can check today's game without opening a player session. */
window.BrainiHomeStartup = (() => {
  const config = window.BRAINI_SUPABASE;
  const sessionKey = `sb-${new URL(config.url).hostname.split('.')[0]}-auth-token`;
  const claimKey = 'brainilab_guest_claim_v1';
  const authParameters = ['code', 'access_token', 'refresh_token', 'error', 'error_code', 'error_description', 'token_hash'];

  // BrainiData persists a default state on startup, so read the existing state first.
  let returningPlayer;
  try {
    returningPlayer = localStorage.getItem('brainilab.mock.v1') !== null;
  } catch {
    returningPlayer = true;
  }

  function requiresCloud() {
    if (returningPlayer) return true;
    const search = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.slice(1));
    if (authParameters.some(key => search.has(key) || hash.has(key))) return true;
    try {
      return localStorage.getItem(sessionKey) !== null || localStorage.getItem(claimKey) !== null;
    } catch {
      return true;
    }
  }

  async function publicRead(name, args) {
    const response = await fetch(new URL(`/rest/v1/rpc/${name}`, config.url), {
      method: 'POST',
      headers: { apikey: config.publishableKey, 'content-type': 'application/json' },
      body: JSON.stringify(args),
      credentials: 'omit',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Homepage lookup failed (${response.status})`);
    return response.json();
  }

  async function ensureAvatar() {
    if (window.BrainiAvatarDesign && window.BrainiRewardCatalog) return;
    await BrainiPerf.loadFeature('home-avatar.bundle.js');
    window.BrainiAccountMenu?.hydrate();
  }

  window.addEventListener('storage', event => {
    if ((event.key === sessionKey || event.key === claimKey || event.key === null) && requiresCloud()) {
      void window.BrainiPerf.ensureCloud();
    }
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && requiresCloud()) void window.BrainiPerf.ensureCloud();
  });

  return {
    requiresCloud,
    ensureAvatar,
    runtimeFlags: () => publicRead('get_brainilab_runtime_flags', {}),
    dailyLineup: date => publicRead('get_brainilab_daily_lineup', { p_challenge_date: date }),
  };
})();
