from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
JS=ROOT/'assets/js'
BUNDLES={
 'consent.bundle.js':['site-analytics.js','meta-pixel.js'],
 'shell.bundle.js':['link-policy.js','icon-system.js','build.js','daily-rules.js','data.js','friend-challenge.js','try-first-runtime.js','daily-choice-guard.js','daily-completion-guard.js','ui.js','progression-ui.js','continuity.js','perf-loader.js','monetization-config.js','monetization.js','ads.js','account-menu.js','mobile-ui.js'],
 'cloud.bundle.js':['supabase-config.js','supabase-auth.js','supabase-profile.js','supabase-games.js','supabase-progression.js','supabase-runtime.js','supabase-monetization.js','auth.js'],
 'quiz.bundle.js':['share.js','post-game.js','supabase-content.js','quiz.js'],
 'daily.bundle.js':['share.js','supabase-daily.js','daily-hub.js','daily-journey.js','daily-games.js'],
 'daily-overview.bundle.js':['supabase-daily.js','daily-hub.js','daily-countdown.js','daily-games.js','daily-journey.js','daily-overview.js','anytime-browser.js'],
 'home.bundle.js':['share.js','post-game.js','supabase-content.js','supabase-daily.js','daily-hub.js','daily-countdown.js','daily-journey.js','home-daily.js','daily-games.js','quiz.js','home-entry.js'],
 'games.bundle.js':['games-library.js','game-discovery.js'],
 'social.bundle.js':['supabase-friends.js','supabase-groups.js','social.js'],
 'rankings.bundle.js':['supabase-friends.js','supabase-groups.js','supabase-rankings.js','rankings.js'],
 'profile.bundle.js':['supabase-analytics.js','stats-ui.js','profile-sections.js'],
 'profile-social.bundle.js':['supabase-friends.js','supabase-groups.js','supabase-rankings.js','social.js'],
 'suggestions.bundle.js':['supabase-feedback.js','suggestions-ui.js'],
}
for out,parts in BUNDLES.items():
    chunks=[]
    for part in parts:
        chunks.append(f'/* ===== {part} ===== */\n\n'+(JS/part).read_text(encoding="utf-8").rstrip()+'\n')
    (JS/out).write_text('\n'.join(chunks), encoding='utf-8')
    print(out, sum((JS/p).stat().st_size for p in parts), 'bytes source')
