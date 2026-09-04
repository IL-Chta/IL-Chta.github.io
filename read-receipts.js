(function () {
  "use strict";

  var SUPABASE_URL = "https://ngidsolvxegpyrprlbex.supabase.co";
  var SUPABASE_KEY = "sb_publishable_-8u67PtkHJj1yRVWtOIkog_2skdsDcz";
  var client = null;
  var userId = "";
  var conversationMap = {};
  var lastConversationId = "";

  function getClient() {
    if (client) return client;
    if (window.__ilToolsClient) client = window.__ilToolsClient;
    else if (window.supabase && window.supabase.createClient) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
      window.__ilToolsClient = client;
    }
    return client;
  }

  function normalize(value) {
    return String(value || "").trim().toLocaleLowerCase("pt-BR");
  }

  async function loadConversations() {
    var db = getClient();
    if (!db) return;
    var auth = await db.auth.getUser();
    var user = auth.data && auth.data.user;
    if (!user) return;
    userId = user.id;

    var mine = await db.from("conversation_members")
      .select("conversation_id")
      .eq("user_id", userId);
    var ids = (mine.data || []).map(function (row) { return row.conversation_id; });
    if (!ids.length) return;

    var members = await db.from("conversation_members")
      .select("conversation_id,user_id")
      .in("conversation_id", ids)
      .neq("user_id", userId);
    var peerIds = (members.data || []).map(function (row) { return row.user_id; });
    if (!peerIds.length) return;

    var profiles = await db.from("profiles")
      .select("id,display_name,username")
      .in("id", peerIds);
    var byId = {};
    (profiles.data || []).forEach(function (profile) { byId[profile.id] = profile; });
    conversationMap = {};
    (members.data || []).forEach(function (member) {
      var profile = byId[member.user_id];
      if (!profile) return;
      conversationMap[normalize(profile.display_name)] = member.conversation_id;
      conversationMap[normalize(profile.username)] = member.conversation_id;
    });

    ids.forEach(function (id) {
      Promise.resolve(db.rpc("mark_messages_delivered", { p_conversation_id: id })).catch(function () {});
    });
  }

  function activeConversationId() {
    var selected = document.querySelector(".chat-list button.selected");
    var heading = document.querySelector(".conversation-head strong");
    var text = normalize((heading && heading.textContent) || (selected && selected.textContent));
    if (!text) return "";
    if (conversationMap[text]) return conversationMap[text];
    var key = Object.keys(conversationMap).find(function (name) {
      return name && (text.includes(name) || name.includes(text));
    });
    return key ? conversationMap[key] : "";
  }

  function paint(rows) {
    var outgoing = (rows || []).filter(function (row) { return row.sender_id === userId; });
    document.querySelectorAll(".messages .message.me").forEach(function (bubble, index) {
      var time = bubble.querySelector(":scope > span");
      if (!time) return;
      var mark = time.querySelector(".il-read-receipt");
      if (!mark) {
        mark = document.createElement("b");
        mark.className = "il-read-receipt";
        time.appendChild(mark);
      }
      var row = outgoing[index] || {};
      mark.textContent = row.read_at || row.delivered_at ? "✓✓" : "✓";
      mark.classList.toggle("is-read", Boolean(row.read_at));
      mark.title = row.read_at ? "Lida" : row.delivered_at ? "Entregue" : "Enviada";
    });
  }

  async function refresh() {
    var db = getClient();
    if (!db || !userId) return;
    var conversationId = activeConversationId();
    if (!conversationId) return;
    lastConversationId = conversationId;
    if (document.visibilityState === "visible") {
      await db.rpc("mark_messages_read", { p_conversation_id: conversationId });
    }
    var result = await db.from("messages")
      .select("id,sender_id,delivered_at,read_at,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at");
    if (!result.error) paint(result.data || []);
  }

  async function start() {
    await loadConversations();
    await refresh();
    setInterval(refresh, 3500);
    setInterval(loadConversations, 30000);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && lastConversationId) refresh();
  });
  window.addEventListener("load", function () { setTimeout(start, 1000); });
})();
