import {createHash} from 'node:crypto';

export const assetVersion = content => createHash('sha256').update(content).digest('hex').slice(0, 12);

// Version published local CSS/JS attributes, preserving inline code and remote URLs.
export function versionAssets(html, pageFile, versions) {
  const base = new URL(pageFile, 'https://build.invalid/');
  function versionTag(tag, kind) {
    return tag.replace(new RegExp(`(\\s${kind}\\s*=\\s*)(["'])([^"']*)\\2`, 'i'), (attribute, prefix, quote, href) => {
      if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(href)) return attribute;
      const file = new URL(href.replaceAll('&amp;', '&'), base).pathname.slice(1);
      if (!file.startsWith('assets/') || !/\.(css|js)$/.test(file)) return attribute;
      const version = versions.get(file);
      if (!version) throw new Error(`Missing published asset: ${file} in ${pageFile}`);
      const hashIndex = href.indexOf('#');
      const hash = hashIndex < 0 ? '' : href.slice(hashIndex);
      const url = hashIndex < 0 ? href : href.slice(0, hashIndex);
      const [pathname, query = ''] = url.split('?');
      const separator = query.includes('&amp;') ? '&amp;' : '&';
      const params = query.split(/&(?:amp;)?/).filter(param => param && !/^v=/.test(param));
      params.push(`v=${version}`);
      return `${prefix}${quote}${pathname}?${params.join(separator)}${hash}${quote}`;
    });
  }
  return html.split(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->)/gi)
    .map((part, index) => {
      if (index % 2) return part.replace(/^<script\b[^>]*>/i, tag => versionTag(tag, 'src'));
      return part.replace(/<link\b[^>]*>/gi, tag => {
        if (!/\brel\s*=\s*["'][^"']*\b(?:stylesheet|modulepreload|preload)\b[^"']*["']/i.test(tag)) return tag;
        return versionTag(tag, 'href');
      });
    }).join('');
}
