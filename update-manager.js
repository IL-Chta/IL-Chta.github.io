(function () {
  "use strict";
  if (!("serviceWorker" in navigator)) return;

  var refreshing = false;
  var skipRepeatedNotice = sessionStorage.getItem("ilchats-update-reloaded") === "1";
  sessionStorage.removeItem("ilchats-update-reloaded");
  function showUpdate() {
    if (document.querySelector(".il-update-ready")) return;
    var box = document.createElement("div");
    box.className = "il-update-ready";
    box.innerHTML = '<span><b>IL Chats atualizado</b><small>Toque para usar as melhorias.</small></span><button type="button">Atualizar agora</button>';
    var style = document.createElement("style");
    style.textContent = ".il-update-ready{position:fixed;z-index:26000;left:50%;bottom:84px;transform:translateX(-50%);width:min(440px,calc(100vw - 24px));padding:10px;display:flex;align-items:center;gap:10px;background:#101b2b;color:#fff;border:1px solid #17d8ff88;border-radius:16px;box-shadow:0 12px 36px #000a;box-sizing:border-box}.il-update-ready span{flex:1;min-width:0}.il-update-ready b,.il-update-ready small{display:block}.il-update-ready small{margin-top:3px;color:#a9b7c8}.il-update-ready button{width:auto!important;min-width:0!important;height:40px!important;padding:0 12px!important;border:0!important;border-radius:11px!important;background:#17d8ff!important;color:#041017!important;font-weight:900!important}";
    box.querySelector("button").addEventListener("click", function () {
      sessionStorage.setItem("ilchats-update-reloaded", "1");
      box.remove();
      location.reload();
    });
    document.head.appendChild(style);
    document.body.appendChild(box);
  }

  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (refreshing) return;
    refreshing = true;
    if (skipRepeatedNotice) return;
    showUpdate();
  });

  navigator.serviceWorker.ready.then(function (registration) {
    registration.update().catch(function () {});
    setInterval(function () { registration.update().catch(function () {}); }, 30 * 60 * 1000);
  });
})();
