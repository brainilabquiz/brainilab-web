const retry=document.querySelector('[data-offline-retry]');
retry?.addEventListener('click',()=>location.reload());
window.addEventListener('online',()=>{
  document.querySelector('[data-offline-status]').textContent='Your connection is back. Tap Try again to continue.';
});
