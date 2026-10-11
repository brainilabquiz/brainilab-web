/* Installation is user initiated. No popups, notification requests or tracking. */
window.BrainiPWA=(()=>{
  let promptEvent=null;
  const mode=window.matchMedia('(display-mode: standalone)');
  const installed=()=>mode.matches||navigator.standalone===true;
  const embedded=window.top!==window;
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const local=['localhost','127.0.0.1','::1'].includes(location.hostname);
  function status(text){const node=document.querySelector('[data-pwa-status]');if(node)node.textContent=text;}
  function render(){
    document.querySelectorAll('[data-pwa-install]').forEach(button=>{button.hidden=!promptEvent||installed()||embedded;button.disabled=false;});
    document.documentElement.dataset.pwaMode=installed()?'standalone':'browser';
    if(installed())status('BrainiLab is already open as an app. You’re ready to play.');
  }
  window.addEventListener('beforeinstallprompt',event=>{
    if(embedded||installed())return;
    event.preventDefault();promptEvent=event;render();
    status('Ready to install. Add BrainiLab to your home screen.');
  });
  window.addEventListener('appinstalled',()=>{promptEvent=null;render();status('BrainiLab has been installed. Look for its icon on your home screen.');});
  async function install(event){
    if(!promptEvent)return;
    const saved=promptEvent;promptEvent=null;event.currentTarget.disabled=true;
    try{
      await saved.prompt();
      const choice=await saved.userChoice;
      status(choice.outcome==='accepted'?'Finish installation in your browser’s dialog.':'No problem. You can install it whenever you like.');
    }catch{status('Installation did not finish. Try your browser’s menu below.');}
    render();
  }
  function register(){
    if(embedded||!window.isSecureContext||!('serviceWorker' in navigator)||(local&&window.BRAINI_ENABLE_SW!==true))return;
    navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(()=>navigator.serviceWorker.ready).then(()=>{
      document.documentElement.dataset.pwaWorker='ready';
    }).catch(()=>{document.documentElement.dataset.pwaWorker='unavailable';});
  }
  function boot(){
    document.querySelectorAll('[data-pwa-install]').forEach(button=>button.addEventListener('click',install));
    if(ios&&!installed())status('On iPhone or iPad, use Safari’s Share menu to add BrainiLab.');
    render();register();
    if(embedded)document.querySelectorAll('[data-pwa-install-link]').forEach(link=>link.hidden=true);
  }
  mode.addEventListener?.('change',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  return {installed};
})();
