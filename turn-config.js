(function () {
  "use strict";
  var NativePeerConnection = window.RTCPeerConnection;
  if (!NativePeerConnection || window.__ilInternationalCallConfig) return;
  window.__ilInternationalCallConfig = true;
  var iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.relay.metered.ca:80" },
    { urls: "turn:global.relay.metered.ca:80", username: "a5c3184b4a4836923cf6bd96", credential: "mcOUQqUdXie7PTd1" },
    { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "a5c3184b4a4836923cf6bd96", credential: "mcOUQqUdXie7PTd1" },
    { urls: "turn:global.relay.metered.ca:443", username: "a5c3184b4a4836923cf6bd96", credential: "mcOUQqUdXie7PTd1" },
    { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: "a5c3184b4a4836923cf6bd96", credential: "mcOUQqUdXie7PTd1" }
  ];
  function ILPeerConnection(configuration) {
    return new NativePeerConnection(Object.assign({}, configuration || {}, {
      iceServers: iceServers,
      iceCandidatePoolSize: 10
    }));
  }
  ILPeerConnection.prototype = NativePeerConnection.prototype;
  if (NativePeerConnection.generateCertificate) ILPeerConnection.generateCertificate = NativePeerConnection.generateCertificate.bind(NativePeerConnection);
  window.RTCPeerConnection = ILPeerConnection;
})();
