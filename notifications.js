(function () {
  "use strict";
  var URL = "https://ngidsolvxegpyrprlbex.supabase.co";
  var KEY = "sb_publishable_-8u67PtkHJj1yRVWtOIkog_2skdsDcz";
  var db, user, channel, registration;
  var seen = new Set();

  function client() {
    if (db) return db;
    db = window.__ilToolsClient || (window.supabase && window.supabase.createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    }));
    if (db) window.__ilToolsClient = db;
    return db;
  }

  async function show(title, body, isCall, tag) {
    if (Notification.permission !== "granted" || !registration) return;
    await registration.showNotification(title, {
      body: body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: tag,
      renotify: true,
      requireInteraction: isCall,
      vibrate: isCall ? [700, 300, 700, 300, 900] : [250, 120, 250],
      data: { url: "/" }
    });
  }

  async function senderName(id) {
    var result = await client().from("profiles").select("display_name").eq("id", id).maybeSingle();
    return result.data && result.data.display_name || "Alguém";
  }

  async function onMessage(row) {
    if (!row || row.sender_id === user.id || seen.has("m:" + row.id)) return;
    seen.add("m:" + row.id);
    var name = await senderName(row.sender_id);
    var text = row.content || row.text || "Você recebeu uma nova mensagem.";
    await show("Mensagem de " + name, String(text).slice(0, 140), false, "message-" + row.id);
    if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
  }

  async function onCall(row) {
    if (!row || row.recipient_id !== user.id || row.signal_type !== "offer" || seen.has("c:" + row.call_id)) return;
    seen.add("c:" + row.call_id);
    var name = await senderName(row.sender_id);
    var mode = row.payload && row.payload.mode === "video" ? "vídeo" : "voz";
    await show("Ligação de " + mode + " no IL Chats", name + " está ligando para você.", true, "call-" + row.call_id);
    if (navigator.vibrate) navigator.vibrate([700, 300, 700, 300, 900]);
  }

  function button() {
    if (Notification.permission !== "default" || document.querySelector(".il-enable-notifications")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "il-enable-notifications";
    b.textContent = "🔔 Ativar avisos";
    b.onclick = async function () {
      var permission = await Notification.requestPermission();
      if (permission === "granted") {
        b.remove();
        await show("Avisos ativados", "O IL Chats poderá avisar sobre mensagens e ligações.", false, "notifications-ready");
      } else b.textContent = "Avisos bloqueados";
    };
    document.body.appendChild(b);
  }

  async function start() {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
    registration = await navigator.serviceWorker.register("/sw.js?v=1");
    var c = client();
    if (!c) return;
    var auth = await c.auth.getUser();
    user = auth.data && auth.data.user;
    if (!user) return;
    button();
    channel = c.channel("il-notifications-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, function (event) { onMessage(event.new); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_signals", filter: "recipient_id=eq." + user.id }, function (event) { onCall(event.new); })
      .subscribe();
  }

  window.addEventListener("load", function () { setTimeout(function () { start().catch(function () {}); }, 1400); });
})();
