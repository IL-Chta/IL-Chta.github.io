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

  function showHelp(message) {
    var old = document.querySelector(".il-pwa-help");
    if (old) old.remove();
    var modal = document.createElement("div");
    modal.className = "il-pwa-help";
    modal.innerHTML = '<div><button type="button" aria-label="Fechar">×</button>' +
      '<span>📲</span><h3>Instalar o IL Chats</h3><p></p><strong>É grátis e leva poucos segundos.</strong></div>';
    modal.querySelector("p").textContent = message;
    modal.querySelector("button").addEventListener("click", function () { modal.remove(); });
    modal.addEventListener("click", function (event) { if (event.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  }

  async function installNow() {
    if (isIOS()) {
      showHelp("No iPhone ou iPad, abra o IL Chats no Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.");
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      return;
    }
    showHelp("No Chrome, toque no menu ⋮ e escolha Instalar app ou Adicionar à tela inicial.");
  }

  function addPermanentButton() {
    if (standalone()) {
      document.querySelectorAll(".il-pwa-install-entry").forEach(function (button) { button.remove(); });
      return;
    }
    document.querySelectorAll(".auth-card,.profile").forEach(function (area) {
      if (area.querySelector(".il-pwa-install-entry")) return;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "il-pwa-install-entry";
      button.innerHTML = '<span>📲</span><b>INSTALAR GRÁTIS NO CELULAR</b><small>Android e iPhone</small>';
      button.addEventListener("click", installNow);
      var reference = area.querySelector(".logout,.demo");
      if (reference) area.insertBefore(button, reference);
      else area.appendChild(button);
    });
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
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js?v=4").catch(function () {});
  }
  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    var banner = document.querySelector(".il-pwa-install");
    if (banner) banner.hidden = true;
    addPermanentButton();
  });
  window.addEventListener("load", function () {
    showIOS();
    addPermanentButton();
  });
  new MutationObserver(addPermanentButton).observe(document.documentElement, { childList: true, subtree: true });
  addPermanentButton();
})();

