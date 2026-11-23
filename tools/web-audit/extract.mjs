import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {HtmlChecker}=require('broken-link-checker');

// The published legacy checker is used strictly as a parser. Its old HTTP,
// robots and form transports never receive a URL; current Node fetch handles
// our bounded public reads. Both classes of links must stay excluded here.
export function extractLinks(html,baseURL){
 return new Promise((resolve,reject)=>{
  const links=[];
  const checker=new HtmlChecker({filterLevel:3,excludeInternalLinks:true,excludeExternalLinks:true,
   excludeLinksToSamePage:false,honorRobotExclusions:false,userAgent:'BrainiLabOwnerAudit/1.0'},
   {junk:link=>{if(link.url?.resolved)links.push({url:link.url.resolved,tag:link.html.tagName,attribute:link.html.attrName,text:link.html.text||''});},
    link:()=>reject(Error('Legacy HTTP transport must never be used')),error:reject,complete:()=>resolve(links)});
  checker.urlChecker.enqueue=()=>{throw Error('Legacy HTTP transport is disabled')};
  checker.scan(html,baseURL);
 });
}
