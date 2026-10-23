import {homeLogoAVIF} from './home-images.js';

const BASE='https://build.invalid/';
const publicSection=/^(?:games|learn|daily-quiz|geography|science|history|sports|general-knowledge|reasoning|halloween|breaking-news)\//;
const attribute=(tag,name)=>tag.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(["\'])(.*?)\\1','i'))?.[2];
const localPath=(value,file)=>{
 if(!value||/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value))return null;
 try{const u=new URL(value,new URL(file,BASE));return u.origin===new URL(BASE).origin&&!u.search&&!u.hash?u.pathname:null;}catch{return null;}
};

// Reuse the already reviewed homepage derivatives. Only exact existing logo
// identities qualify; future replacements and other pictures keep their sources.
// Keep the complete WebP/PNG fallback, sizes, layout, loading and alt text.
export function brandLogoAVIF(html,file){
 if(file==='index.html')return homeLogoAVIF(html,file);
 if(!publicSection.test(file))return html;
 return html.split(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->)/gi).map((part,index)=>{
  if(index%2)return part;
  return part.replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi,picture=>{
   const sources=picture.match(/<source\b[^>]*>/gi)||[];
   if(sources.some(source=>attribute(source,'type')?.toLowerCase()==='image/avif'))return picture;
   const image=picture.match(/<img\b[^>]*>/i)?.[0];
   if(localPath(attribute(image||'','src'),file)!=='/assets/brand/brainilab-logo.png')return picture;
   for(const source of sources){
    if(attribute(source,'type')?.toLowerCase()!=='image/webp')continue;
    const srcset=attribute(source,'srcset');
    const candidates=srcset?.split(',').map(item=>item.trim().split(/\s+/));
    if(candidates?.length!==2||candidates.some(item=>item.length!==2))continue;
    const [small,large]=candidates;
    if(small[1]!=='200w'||large[1]!=='450w'||localPath(small[0],file)!=='/assets/brand/brainilab-logo-200.webp'||localPath(large[0],file)!=='/assets/brand/brainilab-logo.webp')continue;
    const avif=source.replace(/(\stype\s*=\s*)(["'])image\/webp\2/i,'$1$2image/avif$2')
     .replace(/(\ssrcset\s*=\s*)(["'])(.*?)\2/i,(_,prefix,quote,value)=>prefix+quote+value.replace('brainilab-logo-200.webp','brainilab-logo-200-home.avif').replace('brainilab-logo.webp','brainilab-logo-450-home.avif')+quote);
    return picture.replace(source,()=>avif+source);
   }
   return picture;
  });
 }).join('');
}
