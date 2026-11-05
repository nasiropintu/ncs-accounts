// Expose to window for v10 Sync engine and database
window.save = save;
window.persist = persist;
window.render = render;
window.homeUI = homeUI;
window.redrawActiveView = typeof redrawActiveView === 'function' ? redrawActiveView : null;
window.calc = typeof calc === 'function' ? calc : null;
window.animateCounts = typeof animateCounts === 'function' ? animateCounts : null;
window.POS = POS;
window.ledUI = ledUI;
window.setSt = setSt;
window.push = push;
window.pull = pull;
window.S = S;
window.NcsDB = NcsDB;

applyLang();
start();
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
// Show a small refresh prompt when a newer PWA build is waiting to activate.
if ('serviceWorker' in navigator) {
  var updatePromptShown = false;
  function offerPwaUpdate(reg) {
    if (updatePromptShown || !reg || !reg.waiting || !navigator.serviceWorker.controller) return;
    updatePromptShown = true;
    var bar = document.createElement('div');
    bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 78px);z-index:2147483600;display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--card);color:var(--ink);box-shadow:0 12px 34px rgba(15,35,55,.24);font:14px/1.4 system-ui,sans-serif';
    var message = document.createElement('span');
    message.textContent = 'An update is available.';
    message.style.flex = '1';
    var refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.textContent = 'Refresh';
    refresh.style.cssText = 'border:0;border-radius:9px;padding:8px 12px;background:var(--acc);color:#fff;font-weight:700';
    refresh.onclick = function () {
      refresh.disabled = true;
      sessionStorage.setItem('ncs-pwa-refreshing', '1');
      navigator.serviceWorker.addEventListener('controllerchange', function () { location.reload(); }, { once: true });
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    };
    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss update notice');
    close.textContent = '\u00d7';
    close.style.cssText = 'border:0;background:transparent;color:inherit;font-size:22px;padding:0 3px';
    close.onclick = function () { bar.remove(); };
    bar.append(message, refresh, close);
    document.body.appendChild(bar);
  }
  navigator.serviceWorker.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'UPDATE_READY') offerPwaUpdate(event.data.registration);
  });
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (sessionStorage.getItem('ncs-pwa-refreshing') === '1') {
      sessionStorage.removeItem('ncs-pwa-refreshing');
      location.reload();
    }
  });
  addEventListener('load', function () {
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) return;
      offerPwaUpdate(reg);
      reg.addEventListener('updatefound', function () {
        var installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', function () {
          if (installing.state === 'installed') offerPwaUpdate(reg);
        });
      });
      reg.update().catch(function () {});
    }).catch(function () {});
  });
}
