// Exact source matching: a replacement cover must never inherit an old image.
// Original WebP assets remain the fallback, with the same crop and dimensions.
const avifCovers=new Map([
 ['/assets/images/learn/what-is-a-birdie-in-golf-thumb.webp','/assets/images/learn/what-is-a-birdie-in-golf-home.avif']
]);
export const homeCoverAVIF=source=>avifCovers.get(source)||null;
export function homeLogoAVIF(html,file){
 if(file!=='index.html')return html;
 return html.replace(/(<picture>)(<source\b[^>]*srcset="assets\/brand\/brainilab-logo-200\.webp[^>]*>)/g,'$1<source type="image/avif" srcset="assets/brand/brainilab-logo-200-home.avif 200w, assets/brand/brainilab-logo-450-home.avif 450w" sizes="(max-width: 600px) 100px, 160px"/>$2');
}
