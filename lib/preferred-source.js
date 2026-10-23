// Google's documented deeplink opens the reader's own source preferences.
// It does not select the site, subscribe the reader or claim a ranking benefit.
export const PREFERRED_SOURCE_URL='https://www.google.com/preferences/source?q=brainilabgames.com';
const promotion=`<div class="preferred-source" data-preferred-source><a class="preferred-source__link" href="${PREFERRED_SOURCE_URL}" target="_blank" rel="noopener noreferrer" aria-describedby="preferred-source-note"><span>Choose BrainiLab on Google</span><span aria-hidden="true">↗</span><span class="preferred-source__sr"> (opens in a new tab)</span></a><p id="preferred-source-note">Add us to your preferred sources.</p></div>`;

// Use the existing shared footer, never article text, navigation or game UI.
// Both generated HTML and CMS responses can safely pass through this helper.
export function preferredSourceFooter(html){
 if(/\bdata-preferred-source(?:\s|=|>)/i.test(html))return html;
 return html.split(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->)/gi).map((part,i)=>i%2?part:part.replace(/<footer\b[^>]*\bclass=["']footer["'][^>]*>[\s\S]*?<\/footer>/gi,footer=>{
  const withSocials=footer.replace(/(<div\b[^>]*\bclass=["']socials["'][^>]*>[\s\S]*?<\/div>)(?:\s*<div class="footer-copy"[^>]*>Follow BrainiLab across platforms\.<\/div>)?/i,(_,socials)=>socials+promotion);
  if(withSocials!==footer)return withSocials;
  // Compact community/profile footers have no social row. Add one grid item.
  return footer.replace(/<\/div>\s*(?=<div class="wrap footer-contact")/,()=>promotion+'</div>');
 })).join('');
}
