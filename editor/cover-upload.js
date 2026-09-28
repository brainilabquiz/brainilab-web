// Keep full, card and thumbnail crops identical. CSS controls the focal point.
export async function uploadCover(file,storage,{decode=createImageBitmap,canvas=()=>document.createElement('canvas'),uuid=()=>crypto.randomUUID()}={}){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw Error('Choose a JPG, PNG or WebP smaller than 20 MB.');
 const bitmap=await decode(file),id=uuid(),prepared=[];
 try{
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>80000000)throw Error('This image is too large. Resize it before uploading.');
  for(const [field,width,quality] of [['src',1600,.84],['small',640,.8],['thumbnail',320,.78]]){
   const scale=Math.min(1,width/bitmap.width,1600/bitmap.height),surface=canvas();
   surface.width=Math.max(1,Math.round(bitmap.width*scale));surface.height=Math.max(1,Math.round(bitmap.height*scale));
   surface.getContext('2d').drawImage(bitmap,0,0,surface.width,surface.height);
   const blob=await new Promise(resolve=>surface.toBlob(resolve,'image/webp',quality));
   if(!blob||blob.type!=='image/webp'||blob.size>3145728)throw Error('Please choose a smaller image or use a browser that supports WebP.');
   prepared.push({field,blob,path:id+(field==='src'?'':'-'+width)+'.webp'});
  }
 }finally{bitmap.close();}
 const result={};
 // Only return the new cover after all three uploads succeed. A failure leaves
 // the editor's existing cover intact; no partial URLs reach a published page.
 for(const item of prepared){
  const {error}=await storage.upload(item.path,item.blob,{contentType:'image/webp',cacheControl:'31536000',upsert:false});
  if(error)throw error;
  result[item.field]=storage.getPublicUrl(item.path).data.publicUrl;
 }
 return result;
}
