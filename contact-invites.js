(function () {
  "use strict";
  var URL = "https://ngidsolvxegpyrprlbex.supabase.co";
  var KEY = "sb_publishable_-8u67PtkHJj1yRVWtOIkog_2skdsDcz";
  var db, userId = "", busy = false, sharedBusy = false;

  function client() {
    if (db) return db;
    db = window.__ilToolsClient || (window.supabase && window.supabase.createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    }));
    if (db) window.__ilToolsClient = db;
    return db;
  }

  function clear() {
    document.querySelectorAll(".il-contact-invite").forEach(function (item) { item.remove(); });
  }

  function sharedUsername() {
    return (new URLSearchParams(location.search).get("contato") || "")
      .trim().replace(/^@/, "");
  }

  async function addSharedContact() {
    var username = sharedUsername();
    if (!username || sharedBusy) return;
    sharedBusy = true;
    try {
      var c = client();
      if (!c) return;
      var auth = await c.auth.getUser();
      var user = auth.data && auth.data.user;
      if (!user) return;

      var profile = await c.from("profiles")
        .select("id,display_name,username")
        .ilike("username", username)
        .maybeSingle();
      if (profile.error || !profile.data || profile.data.id === user.id) return;

      var target = profile.data;
      var relations = await c.from("friendships")
        .select("requester_id,addressee_id,status")
        .or("and(requester_id.eq." + user.id + ",addressee_id.eq." + target.id + "),and(requester_id.eq." + target.id + ",addressee_id.eq." + user.id + ")");
      if (relations.error) return;

      var accepted = (relations.data || []).find(function (item) { return item.status === "accepted"; });
      if (accepted) return;
      var pending = (relations.data || []).find(function (item) { return item.status === "pending"; });

      clear();
      var box = document.createElement("div");
      box.className = "il-contact-invite il-shared-contact";
      var name = target.display_name || ("@" + target.username);
      box.innerHTML = '<span><b>👤 ' + escapeText(name) + '</b><small>enviou o link de contato</small></span>' +
        '<button type="button">Adicionar contato</button><button type="button" class="later">Depois</button>';
      var buttons = box.querySelectorAll("button");
      buttons[0].onclick = async function () {
        buttons[0].disabled = true;
        buttons[0].textContent = "Adicionando…";
        var result;
        if (pending) {
          result = await c.from("friendships")
            .update({ status: "accepted", updated_at: new Date().toISOString() })
            .eq("requester_id", pending.requester_id)
            .eq("addressee_id", pending.addressee_id)
            .eq("status", "pending");
        } else {
          result = await c.from("friendships").insert({
            requester_id: user.id,
            addressee_id: target.id,
            status: "accepted"
          });
        }
        if (result.error) {
          buttons[0].disabled = false;
          buttons[0].textContent = "Adicionar contato";
          alert("Não foi possível adicionar agora: " + result.error.message);
          return;
        }
        localStorage.removeItem("ilchats-pending-contact");
        history.replaceState(null, "", location.pathname + location.hash);
        clear();
        location.reload();
      };
      buttons[1].onclick = function () { box.remove(); };
      document.body.appendChild(box);
    } finally {
      sharedBusy = false;
    }
  }

  async function accept(invite, button) {
    button.disabled = true;
    button.textContent = "Aceitando…";
    var result = await client().from("friendships")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("requester_id", invite.requester_id)
      .eq("addressee_id", userId)
      .eq("status", "pending");
    if (result.error) {
      button.disabled = false;
      button.textContent = "Aceitar";
      alert("Não foi possível aceitar agora: " + result.error.message);
      return;
    }
    clear();
    location.reload();
  }

  function escapeText(value) {
    return String(value || "").replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function render(invite, profile) {
    clear();
    var box = document.createElement("div");
    box.className = "il-contact-invite";
    var name = profile && (profile.display_name || profile.username) || "Uma pessoa";
    box.innerHTML = '<span><b>👤 ' + escapeText(name) + '</b><small>quer adicionar você</small></span>' +
      '<button type="button">Aceitar</button><button type="button" class="later">Depois</button>';
    var buttons = box.querySelectorAll("button");
    buttons[0].onclick = function () { accept(invite, buttons[0]); };
    buttons[1].onclick = function () { box.remove(); };
    document.body.appendChild(box);
  }

  async function check() {
    if (busy) return;
    busy = true;
    try {
      var c = client();
      if (!c) return;
      var auth = await c.auth.getUser();
      var user = auth.data && auth.data.user;
      if (!user) { userId = ""; clear(); return; }
      userId = user.id;
      var pending = await c.from("friendships")
        .select("requester_id,created_at")
        .eq("addressee_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (pending.error || !pending.data) { clear(); return; }
      var profile = await c.from("profiles")
        .select("display_name,username")
        .eq("id", pending.data.requester_id)
        .maybeSingle();
      render(pending.data, profile.data);
    } finally { busy = false; }
  }

  window.addEventListener("load", function () {
    setTimeout(addSharedContact, 1200);
    setTimeout(check, 1800);
    setInterval(check, 12000);
  });
})();
