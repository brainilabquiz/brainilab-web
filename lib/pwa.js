import {createHash} from 'node:crypto';

// CMS templates inherit the same app identity as static pages.
export function pwaHtml(html){
  if(!/<head\b/i.test(html)||/http-equiv\s*=\s*["']refresh/i.test(html))return html;
  html=html.replace(/<link\b[^>]*\brel=["'](?:manifest|apple-touch-icon)["'][^>]*>\r?\n?/gi,'');
  html=html.replace(/<meta\b[^>]*\bname=["'](?:theme-color|apple-mobile-web-app-capable|apple-mobile-web-app-title|apple-mobile-web-app-status-bar-style)["'][^>]*>\r?\n?/gi,'');
  const tags='<link rel="manifest" href="/manifest.webmanifest"/>\n<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/app/apple-touch-icon.png"/>\n<meta name="theme-color" content="#2D296E"/>\n<meta name="apple-mobile-web-app-capable" content="yes"/>\n<meta name="apple-mobile-web-app-title" content="BrainiLab"/>\n<meta name="apple-mobile-web-app-status-bar-style" content="default"/>\n<link rel="stylesheet" href="/assets/css/pwa.css"/>\n';
  // Idempotent when a template already has the offline stylesheet.
  html=html.replace(/<link\b[^>]*href=["']\/assets\/css\/pwa\.css(?:\?[^"']*)?["'][^>]*>\r?\n?/gi,'');
  html=html.replace(/<\/head>/i,tags+'</head>');
  if(!html.includes('data-pwa-install-link'))html=html.replace(/(<(?:div|nav)\b[^>]*class=["'][^"']*\bfooter-links\b[^"']*["'][^>]*>)/i,'$1<a href="/install/" data-pwa-install-link>Install BrainiLab</a>');
  return html;
}

export function pwaWorker(source,offlineHtml,versions){
  const assets=['/offline/index.html','/assets/brand/app/icon-192.png','/assets/brand/app/icon-512.png','/assets/brand/app/icon-maskable-512.png','/assets/brand/app/apple-touch-icon.png'];
  for(const name of ['assets/css/pwa.css','assets/js/offline.js']){
    if(!versions.has(name))throw new Error('Missing offline asset: '+name);
    assets.push('/'+name+'?v='+versions.get(name));
  }
  const iconVersions=[...versions].filter(([name])=>name.startsWith('assets/brand/app/'));
  const version=createHash('sha256').update(source+offlineHtml+JSON.stringify(assets)+JSON.stringify(iconVersions)).digest('hex').slice(0,16);
  return source.replace('__BRAINI_PWA_VERSION__',version).replace('/* pwa-precache */ []',JSON.stringify(assets));
}
