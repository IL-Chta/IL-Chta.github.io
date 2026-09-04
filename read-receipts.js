(function () {
  "use strict";

  var SUPABASE_URL = "https://ngidsolvxegpyrprlbex.supabase.co";
  var originalFetch = window.fetch.bind(window);
  var accessHeaders = null;
  var currentUserId = "";
  var currentConversationId = "";
  var messageRows = [];
  var pollTimer = 0;
  var deliveredTimer = 0;

  function decodeUser(authorization) {
    try {
      var token = String(authorization || "").replace(/^Bearer\s+/i, "");
      var part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(atob(part)).sub || "";
    } catch (_) {
      return "";
    }
  }

  function rememberHeaders(input, init) {
    try {
      var headers = new Headers((init && init.headers) || (input && input.headers) || {});
      var authorization = headers.get("authorization");
      var apikey = headers.get("apikey");
      if (authorization && apikey) {
        accessHeaders = { Authorization: authorization, apikey: apikey };
        currentUserId = decodeUser(authorization);
      }
    } catch (_) {}
  }

  function conversationFromUrl(url) {
    try {
      var value = new URL(url).searchParams.get("conversation_id") || "";
      return value.replace(/^eq\./, "");
    } catch (_) {
      return "";
    }
  }

  function receiptFor(row) {
    if (row && row.read_at) return { text: "✓✓", title: "Lida", read: true };
    if (row && row.delivered_at) return { text: "✓✓", title: "Entregue", read: false };
    return { text: "✓", title: "Enviada", read: false };
  }

  function paintReceipts() {
    if (!currentUserId) return;
    var outgoing = messageRows.filter(function (row) {
      return row.sender_id === currentUserId;
    });
    var bubbles = document.querySelectorAll(".messages .message.me");
    bubbles.forEach(function (bubble, index) {
      var time = bubble.querySelector(":scope > span");
      if (!time) return;
      var mark = time.querySelector(".il-read-receipt");
      if (!mark) {
        mark = document.createElement("b");
        mark.className = "il-read-receipt";
        time.appendChild(mark);
      }
      var receipt = receiptFor(outgoing[index]);
      mark.textContent = receipt.text;
      mark.title = receipt.title;
      mark.setAttribute("aria-label", receipt.title);
      mark.classList.toggle("is-read", receipt.read);
    });
  }

  async function rpc(name, conversationId) {
    if (!accessHeaders || !conversationId) return;
    await originalFetch(SUPABASE_URL + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: {
        Authorization: accessHeaders.Authorization,
        apikey: accessHeaders.apikey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ p_conversation_id: conversationId })
    });
  }

  async function refreshStatuses() {
    if (!accessHeaders || !currentConversationId) return;
    var query = SUPABASE_URL + "/rest/v1/messages?select=id,sender_id,delivered_at,read_at,created_at" +
      "&conversation_id=eq." + encodeURIComponent(currentConversationId) + "&order=created_at.asc";
    var response = await originalFetch(query, { headers: accessHeaders });
    if (!response.ok) return;
    messageRows = await response.json();
    paintReceipts();
  }

  async function markAllDelivered() {
    if (!accessHeaders || !currentUserId) return;
    var query = SUPABASE_URL + "/rest/v1/conversation_members?select=conversation_id&user_id=eq." +
      encodeURIComponent(currentUserId);
    var response = await originalFetch(query, { headers: accessHeaders });
    if (!response.ok) return;
    var memberships = await response.json();
    await Promise.all((memberships || []).map(function (membership) {
      return rpc("mark_messages_delivered", membership.conversation_id);
    }));
  }

  function startTimers() {
    clearInterval(pollTimer);
    pollTimer = setInterval(refreshStatuses, 3500);
    if (!deliveredTimer) {
      deliveredTimer = setInterval(markAllDelivered, 15000);
      setTimeout(markAllDelivered, 1200);
    }
  }

  window.fetch = async function (input, init) {
    rememberHeaders(input, init);
    var response = await originalFetch(input, init);
    try {
      var url = typeof input === "string" ? input : input.url;
      var method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
      if (response.ok && method === "GET" && url.includes("/rest/v1/messages") && url.includes("conversation_id=eq.")) {
        var rows = await response.clone().json();
        if (Array.isArray(rows)) {
          currentConversationId = conversationFromUrl(url);
          messageRows = rows;
          startTimers();
          if (document.visibilityState === "visible") {
            await rpc("mark_messages_read", currentConversationId);
            await refreshStatuses();
          }
          paintReceipts();
        }
      }
    } catch (_) {}
    return response;
  };

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && currentConversationId) {
      rpc("mark_messages_read", currentConversationId).then(refreshStatuses).catch(function () {});
    }
  });

  new MutationObserver(paintReceipts).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
