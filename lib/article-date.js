import {sitemapDate} from './sitemap-date.js';

// Reuse the existing calendar/offset validation, but retain the source precision
// and timezone. This changes notation only, never the stored publication time.
export function articleTimestamp(value){
 if(typeof value!=='string'||value.length<=10||!sitemapDate(value))return value;
 return value.replace(' ','T').replace(/([+-]\d{2})(\d{2})$/,'$1:$2').replace(/([+-]\d{2})$/,'$1:00');
}
