// Use the page's stored modification time, never the time the sitemap is built.
export function sitemapDate(value){
 if(typeof value!=='string')return '';
 const m=value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}(?::?\d{2})?))?$/);
 if(!m)return '';
 const year=Number(m[1]),month=Number(m[2]),day=Number(m[3]);
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 if(year<1||month<1||month>12||day<1||day>days[month-1])return '';
 if(!m[4])return value;
 if(Number(m[4])>23||Number(m[5])>59||Number(m[6])>59)return '';
 let zone=m[8];
 if(zone!=='Z'){
  const offset=zone.slice(1).replace(':',''),hours=Number(offset.slice(0,2)),minutes=Number(offset.slice(2)||0);
  if(hours>14||minutes>59||(hours===14&&minutes!==0))return '';
  zone=zone[0]+offset.slice(0,2)+':'+(offset.slice(2)||'00');
 }
 const date=new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7]||''}${zone}`);
 if(!Number.isFinite(date.getTime()))return '';
 const result=date.toISOString().replace(/\.\d{3}Z$/,'Z');
 return /^[0-9]{4}-/.test(result)&&!result.startsWith('0000-')?result:'';
}
export function sitemapLastmod(value){const date=sitemapDate(value);return date?'<lastmod>'+date+'</lastmod>':'';}
