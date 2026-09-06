(function () {
  "use strict";

  var NativePeerConnection = window.RTCPeerConnection;
  if (!NativePeerConnection || window.__ilInternationalCallConfig) return;
  window.__ilInternationalCallConfig = true;

  var publishableKey = "pk_live_ed5bf52cfa10ce1ea8af0e00834a8da0ad17c655";
  var iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.relay.metered.ca:80" }
  ];
  var activeConnections = new Set();

  function applyIceServers(servers) {
    if (!Array.isArray(servers) || !servers.length) return;
    iceServers = servers;
    activeConnections.forEach(function (connection) {
      if (!connection || connection.connectionState === "closed") {
        activeConnections.delete(connection);
        return;
      }
      try {
        connection.setConfiguration(Object.assign({}, connection.getConfiguration(), {
          iceServers: iceServers,
          iceCandidatePoolSize: 10
        }));
        if (typeof connection.restartIce === "function") connection.restartIce();
      } catch (_) {}
    });
  }

  function ILPeerConnection(configuration) {
    var connection = new NativePeerConnection(Object.assign({}, configuration || {}, {
      iceServers: iceServers,
      iceCandidatePoolSize: 10
    }));
    activeConnections.add(connection);
    connection.addEventListener("connectionstatechange", function () {
      if (connection.connectionState === "closed") activeConnections.delete(connection);
    });
    return connection;
  }

  ILPeerConnection.prototype = NativePeerConnection.prototype;
  if (NativePeerConnection.generateCertificate) {
    ILPeerConnection.generateCertificate = NativePeerConnection.generateCertificate.bind(NativePeerConnection);
  }
  window.RTCPeerConnection = ILPeerConnection;

  window.__ilTurnReady = import("https://cdn.jsdelivr.net/npm/@metered-ca/realtime@1.2.0/dist/index.mjs")
    .then(function (sdk) {
      var signalling = new sdk.SignallingClient({ apiKey: publishableKey });
      window.__ilTurnSignalling = signalling;
      signalling.on("connected", function (event) {
        applyIceServers(event && event.iceServers);
      });
      signalling.on("server-error", function () {});
      return signalling.connect().then(function () { return true; });
    })
    .catch(function () { return false; });
})();
