const fs = require('node:fs');
const {loader}=require('../tests/load-typescript.cjs');
const env=fs.readFileSync(require('node:path').join(__dirname,'../.env'),'utf8');
const key=env.match(/^EXPO_PUBLIC_YOUTUBE_API_KEY\s*=\s*(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g,'');
const yt=loader({'@/src/lib/env':{env:{youtubeApiKey:key}}})('src/lib/youtube.ts');
const sources=[
 ['DSA','PLfqMhTWNBTe137I_EPQd34TsgV6IO55pt'],
 ['System Design','PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX'],
 ['System Design Practice','PLinedj3B30sBlBWRox2V2tg9QJ2zr4M3o'],
 ['JavaScript','PLbtI3_MArDOnNvk8CCCSR01CQ8B8iNh-A'],
 ['Networking','PLd1s-PEC5Pio'],
 ['SQL','hlGoQC332VM',true],
 ['JavaScript','a-wVHL0lpb0',true],
];
(async()=>{
 const result=[];
 for(const [area,id,video] of sources){
  const url=video?`https://www.youtube.com/watch?v=${id}`:`https://www.youtube.com/playlist?list=${id}`;
  let items=[],error;
  try { items=video?await yt.fetchVideoChunks(id,url,30):await yt.fetchPlaylistItems(id,url); }
  catch(e){error=String(e.message).replaceAll(key||'__missing__','[REDACTED]');}
  result.push({area,id,url,type:video?'youtube-video':'youtube-playlist',items,error});
  console.log(area,video?'video':'playlist',items.length,error||'OK');
 }
 if(result.some(source=>source.error)){process.exitCode=1;return;}
 fs.writeFileSync(require('node:path').join(__dirname,'../supabase/routine-video-catalog.json'),JSON.stringify(result,null,2)+'\n');
})();
