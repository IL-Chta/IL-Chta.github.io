(() => {
  "use strict";
  let audioContext = null, timer = null, vibrationTimer = null, ringing = false;
  const unlockAudio = () => {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    audioContext ||= new C();
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  };
  const playPattern = () => {
    unlockAudio();
    if (!audioContext || audioContext.state !== "running") return;
    const start = audioContext.currentTime;
    [0, .22, .70, .92].forEach((offset, index) => {
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = index % 2 === 0 ? 740 : 920;
      gain.gain.setValueAtTime(.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(.22, start + offset + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, start + offset + .18);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start + offset); oscillator.stop(start + offset + .20);
    });
  };
  const vibrate = () => { if (navigator.vibrate) navigator.vibrate([700,300,700,300,900]); };
  const startRinging = () => {
    if (ringing) return;
    ringing = true; playPattern(); vibrate();
    timer = setInterval(playPattern, 2100);
    vibrationTimer = setInterval(vibrate, 3100);
  };
  const stopRinging = () => {
    ringing = false;
    if (timer) clearInterval(timer); if (vibrationTimer) clearInterval(vibrationTimer);
    timer = vibrationTimer = null;
    if (navigator.vibrate) navigator.vibrate(0);
  };
  const check = () => document.querySelector(".incoming-call") ? startRinging() : (!window.__ilIncomingCallRealtime && stopRinging());
  window.ILChatsRingtone = { start: () => { window.__ilIncomingCallRealtime = true; startRinging(); }, stop: () => { window.__ilIncomingCallRealtime = false; stopRinging(); }, unlock: unlockAudio };
  document.addEventListener("pointerdown", unlockAudio, { passive:true });
  document.addEventListener("keydown", unlockAudio);
  new MutationObserver(check).observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener("pagehide", stopRinging);
  check();
})();
