export const CATALOGUE_BYTES=8*1024*1024;
export const DIRECTORY_BYTES=2*1024*1024;
export async function boundedText(response,limit){
 const declared=Number(response.headers.get('content-length'));
 if(Number.isFinite(declared)&&declared>limit){await response.body?.cancel();throw Error('Public response exceeds budget');}
 const reader=response.body?.getReader();if(!reader)return '';
 const decoder=new TextDecoder(),parts=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('Public response exceeds budget');}parts.push(decoder.decode(value,{stream:true}));}parts.push(decoder.decode());return parts.join('');}
 finally{reader.releaseLock();}
}
export async function publicJSON(response,limit=CATALOGUE_BYTES){return JSON.parse(await boundedText(response,limit));}
