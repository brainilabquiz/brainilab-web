import {JSDOM} from 'jsdom';

export function skipToContent(html) {
  const page = new JSDOM(html, {includeNodeLocations:true});
  try {
    const {document} = page.window;
    const navigation = document.querySelector('body > header.topbar');
    const mains = document.querySelectorAll('main');
    if (!navigation || mains.length !== 1) return html;

    const main = mains[0];
    const mainTag = page.nodeLocation(main).startTag;
    const target = main.id || 'main-content';
    if (!main.id && document.getElementById(target)) throw new Error('Skip link target is already in use');

    const focus = main.getAttribute('tabindex');
    const focusLocation = page.nodeLocation(main).attrs?.tabindex;
    const edits = [];
    if (focusLocation && focus !== '-1') {
      edits.push([focusLocation.startOffset,focusLocation.endOffset,'tabindex="-1"']);
    }
    const attributes = (main.id ? '' : ` id="${target}"`) + (focusLocation ? '' : ' tabindex="-1"');
    if (attributes) edits.push([mainTag.endOffset-1,mainTag.endOffset-1,attributes]);

    const destination = '#' + target;
    const skip = [...document.querySelectorAll('body > a[href^="#"]')].some(link =>
      link.getAttribute('href') === destination && /^skip\s+to\b/i.test(link.textContent.trim()));
    if (!skip) {
      const start = page.nodeLocation(document.body).startTag.endOffset;
      edits.push([start,start,`\n<a class="content-skip" href="#${encodeURIComponent(target)}">Skip to main content</a>`]);
    }
    return edits.sort(([a],[b])=>b-a).reduce((text,[start,end,value])=>text.slice(0,start)+value+text.slice(end),html);
  } finally {
    page.window.close();
  }
}
