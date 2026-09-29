(function () {
  "use strict";

  var context = null;
  var timer = null;
  var active = false;

  function unlock() {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!context) context = new AudioContext();
    if (context.state === "suspended") context.resume().catch(function () {});
  }

  function tone(start, duration) {
    if (!context || context.state !== "running") return;
    var oscillator = context.createOscillator();
    var gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 425;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
    gain.gain.setValueAtTime(0.08, start + duration - 0.03);
    gain.gain.linearRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  function play() {
    unlock();
    if (!active || !context || context.state !== "running") return;
    var now = context.currentTime;
    tone(now, 0.32);
    tone(now + 0.65, 0.32);
  }

  function stop() {
    active = false;
    if (timer !== null) clearInterval(timer);
    timer = null;
    // Silencia imediatamente os osciladores já iniciados.
    if (context && context.state === "running") context.suspend().catch(function () {});
  }

  function check() {
    var screen = document.querySelector(".call-screen");
    var status = screen && screen.querySelector(".call-person p");
    var calling = !!(status && status.textContent.trim() === "Chamando…");
    if (!calling) { if (active) stop(); return; }
    if (active) return;
    active = true;
    play();
    timer = setInterval(play, 3500);
  }

  document.addEventListener("pointerdown", unlock, { passive: true });
  document.addEventListener("keydown", unlock);
  new MutationObserver(check).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener("pagehide", stop);
  check();
})();
