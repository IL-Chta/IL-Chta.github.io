(() => {
  let audioContext = null;
  let timer = null;
  let limitTimer = null;
  let ringing = false;
  let currentCall = null;
  const expiredCalls = new WeakSet();
  const unlockAudio = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ||= new AudioContextClass();
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  };
  const playPattern = () => {
    unlockAudio();
    if (!audioContext || audioContext.state !== "running") return;
    const start = audioContext.currentTime;
    [0, 0.22, 0.7, 0.92].forEach((offset, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = index % 2 === 0 ? 740 : 920;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.2, start + offset + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.18);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start + offset);
      oscillator.stop(start + offset + 0.2);
    });
  };
  const stopRinging = () => {
    ringing = false;
    if (timer) clearInterval(timer);
    if (limitTimer) clearTimeout(limitTimer);
    timer = null; limitTimer = null;
    if (navigator.vibrate) navigator.vibrate(0);
  };
  const startRinging = (call) => {
    if (ringing || expiredCalls.has(call)) return;
    ringing = true; currentCall = call; playPattern();
    timer = setInterval(playPattern, 2100);
    limitTimer = setTimeout(() => { expiredCalls.add(call); stopRinging(); }, 45000);
    if (navigator.vibrate) navigator.vibrate([600, 300, 600, 600]);
  };
  const check = () => {
    const call = document.querySelector(".incoming-call");
    if (!call) { currentCall = null; stopRinging(); return; }
    if (call !== currentCall) { stopRinging(); currentCall = call; }
    startRinging(call);
  };
  document.addEventListener("pointerdown", unlockAudio, { passive: true });
  document.addEventListener("keydown", unlockAudio);
  window.addEventListener("pagehide", stopRinging);
  new MutationObserver(check).observe(document.documentElement, { childList: true, subtree: true });
  check();
})();