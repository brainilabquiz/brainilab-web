// Existing uploaded covers have immutable local derivatives. Match the complete
// source URL so a later replacement photo can never inherit an old thumbnail.
const storage='https://wvgcdlxebbybthyuajgb.supabase.co/storage/v1/object/public/learn-covers/';
const legacy={
 [storage+'b994711f-6bb8-41ab-91e9-b5d525aab2f9.webp']:'/assets/images/learn/why-canberra-is-australias-capital',
 [storage+'72a8737d-67ce-4591-9ff7-45482acd1e17.webp']:'/assets/images/learn/how-to-read-a-tennis-score'
};
const valid=url=>typeof url==='string'&&(/^\/assets\/images\/learn\/[a-z0-9-]+\.webp$/.test(url)||url.startsWith(storage)&&/^[a-zA-Z0-9_./-]+\.(webp|png|jpe?g)$/.test(url.slice(storage.length)));
export function coverImage(cover,size='card'){
 const field=size==='thumbnail'?'thumbnail':'small';
 if(valid(cover?.[field]))return cover[field];
 const src=cover?.src;
 if(!valid(src))return '/assets/images/learn/daily-or-anytime-small.webp';
 const base=legacy[src];
 if(base)return base+(size==='thumbnail'?'-thumb.webp':'-small.webp');
 return src.startsWith('/assets/')?src.replace('.webp','-small.webp'):src;
}
