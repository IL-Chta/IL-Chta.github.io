self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (event) { event.waitUntil(self.clients.claim()); });
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {
    data = { body: event.data ? event.data.text() : "Você tem uma novidade no IL Chats." };
  }
  var isCall = data.type === "call";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windows) {
    if (windows.some(function (client) { return client.visibilityState === "visible"; })) return;
    return self.registration.showNotification(data.title || (isCall ? "Ligação no IL Chats" : "Nova mensagem no IL Chats"), {
    body: data.body || (isCall ? "Alguém está ligando para você." : "Você recebeu uma mensagem."),
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: data.tag || (isCall ? "ilchats-call" : "ilchats-message"),
    renotify: true,
    requireInteraction: isCall,
    vibrate: isCall ? [700, 300, 700, 300, 900] : [250, 120, 250],
    data: { url: data.url || "/", type: data.type || "message" },
    actions: isCall ? [
      { action: "open", title: "Atender" },
      { action: "dismiss", title: "Recusar" }
    ] : [{ action: "open", title: "Abrir" }]
    });
  }));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  if (event.action === "dismiss") return;
  var target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windows) {
    for (var i = 0; i < windows.length; i += 1) {
      if (windows[i].url.indexOf(self.location.origin) === 0) {
        windows[i].navigate(target);
        return windows[i].focus();
      }
    }
    return self.clients.openWindow(target);
  }));
});
