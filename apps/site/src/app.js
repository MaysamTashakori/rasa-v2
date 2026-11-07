// app.js — بوت: اول دیتا، بعد روتر
(async function boot(){
  if (location.search.includes('static=1')) document.documentElement.classList.add('static');
  renderFoot();
  await Promise.allSettled([loadMe(), loadPricing()]);
  route();
})();
