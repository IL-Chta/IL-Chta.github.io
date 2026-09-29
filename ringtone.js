(() => {
  let audioContext = null;
  let timer = null;
  let ringing = false;
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
  const startRinging = () => {
    if (ringing) return;
    ringing = true;
    playPattern();
    timer = window.setInterval(playPattern, 2100);
    if (navigator.vibrate) navigator.vibrate([600, 300, 600, 600]);
  };
  const stopRinging = () => {
    if (!ringing) return;
    ringing = false;
    if (timer) window.clearInterval(timer);
    timer = null;
    if (navigator.vibrate) navigator.vibrate(0);
  };
  const check = () => {
    if (document.querySelector(".incoming-call")) startRinging();
    else stopRinging();
  };
  document.addEventListener("pointerdown", unlockAudio, { passive: true });
  document.addEventListener("keydown", unlockAudio);
  new MutationObserver(check).observe(document.documentElement, { childList: true, subtree: true });
  check();
})();
