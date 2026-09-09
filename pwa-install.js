(function () {
  "use strict";
  var deferredPrompt = null;
  var dismissedKey = "ilchats-install-dismissed";

  function standalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function dismissedRecently() {
    var saved = Number(localStorage.getItem(dismissedKey) || 0);
    return saved && Date.now() - saved < 7 * 24 * 60 * 60 * 1000;
  }

  function createBanner() {
    var old = document.querySelector(".il-pwa-install");
    if (old) return old;
    var banner = document.createElement("aside");
    banner.className = "il-pwa-install";
    banner.hidden = true;
    banner.setAttribute("aria-label", "Instalar IL Chats");
    banner.innerHTML =
      '<span class="il-pwa-install-text"></span>' +
      '<button class="il-pwa-install-action" type="button">INSTALAR</button>' +
      '<button class="il-pwa-install-close" type="button" aria-label="Fechar aviso">×</button>';
    banner.querySelector(".il-pwa-install-close").addEventListener("click", function () {
      localStorage.setItem(dismissedKey, String(Date.now()));
      banner.hidden = true;
    });
    banner.querySelector(".il-pwa-install-action").addEventListener("click", async function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      banner.hidden = true;
    });
    document.body.appendChild(banner);
    return banner;
  }

  function showAndroid() {
    if (standalone() || dismissedRecently()) return;
    var banner = createBanner();
    banner.querySelector(".il-pwa-install-text").textContent = "Instale o IL Chats no seu celular.";
    banner.querySelector(".il-pwa-install-action").hidden = false;
    banner.hidden = false;
  }

  function showIOS() {
    if (!isIOS() || standalone() || dismissedRecently()) return;
    var banner = createBanner();
    banner.querySelector(".il-pwa-install-text").textContent =
      "No Safari: toque em Compartilhar e depois em Adicionar à Tela de Início.";
    banner.querySelector(".il-pwa-install-action").hidden = true;
    banner.hidden = false;
  }

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredPrompt = event;
    showAndroid();
  });
  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    var banner = document.querySelector(".il-pwa-install");
    if (banner) banner.hidden = true;
  });
  window.addEventListener("load", showIOS);
})();

