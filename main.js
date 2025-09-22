// ===== Countdown =====
const TARGET_DATE = "Sep 26, 2025 09:00:00";

(function initCountdown(){
  const target = new Date(TARGET_DATE).getTime();
  const $d = id => document.getElementById(id);

  // cache last values to trigger flip only when changed
  let last = { days: null, hours: null, minutes: null, seconds: null };

  setInterval(() => {
    const now = Date.now();
    const dist = target - now;

    if (dist <= 0){
      ["days","hours","minutes","seconds"].forEach(k => {
        const el = document.getElementById(k);
        if (el) el.textContent = "00";
      });
      return;
    }

    const days = Math.floor(dist / (1000*60*60*24));
    const hours = Math.floor((dist % (1000*60*60*24))/(1000*60*60));
    const minutes = Math.floor((dist % (1000*60*60))/(1000*60));
    const seconds = Math.floor((dist % (1000*60))/1000);

    const next = {
      days: String(days).padStart(2,"0"),
      hours: String(hours).padStart(2,"0"),
      minutes: String(minutes).padStart(2,"0"),
      seconds: String(seconds).padStart(2,"0")
    };

    // apply values + flip animation if changed
    ["days","hours","minutes","seconds"].forEach(k => {
      const el = $d(k);
      if (!el) return;
      if (last[k] !== next[k]){
        el.textContent = next[k];
        el.classList.remove("flip");
        // force reflow to restart animation
        void el.offsetWidth;
        el.classList.add("flip");
        last[k] = next[k];
      }
    });
  }, 1000);
})();

// ===== NEW: Auto-assign reveal to hero content children =====
(function initialHeroReveal(){
  const hero = document.querySelector(".hero .content");
  if (!hero) return;
  [...hero.children].forEach((el, i) => {
    // skip elements that already have entrance animation via keyframes
    const hasAnim = window.getComputedStyle(el).animationName !== "none";
    if (!hasAnim) {
      el.classList.add("reveal");
      // small stagger on load
      setTimeout(() => el.classList.add("reveal-visible"), 180 + i*90);
    }
  });
})();

// ===== NEW: Scroll reveal (IntersectionObserver) =====
(function scrollReveal(){
  const els = [
    ...document.querySelectorAll(".ceremony-wrap > *"),
    ...document.querySelectorAll(".ceremony-block > *"),
    ...document.querySelectorAll(".map-card")
  ];

  // add base class
  els.forEach(el => el.classList.add("reveal"));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting){
        e.target.classList.add("reveal-visible");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });

  els.forEach(el => io.observe(el));
})();

// ===== Generate daun jatuh tanpa bentrok =====
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".leaf-fall");
  if (!container) return;

  const COUNT = 20; // jumlah partikel
  for (let i = 0; i < COUNT; i++){
    const el = document.createElement("span");
    el.className = "leaf-drop";

    // posisi & gerak acak
    const left = Math.random() * 100;                 // 0–100 vw
    const duration = 6 + Math.random() * 6;           // 6–12s
    const delay = Math.random() * 10;                 // 0–10s
    const xMove = (Math.random() * 200 - 100) + "px"; // -100–100px
    const scale = 0.7 + Math.random() * 0.7;          // 0.7–1.4 (ukuran variasi)
    const opacity = 0.6 + Math.random() * 0.35;       // 0.6–0.95

    el.style.left = left + "vw";
    el.style.animationDuration = duration + "s";
    el.style.animationDelay = delay + "s";
    el.style.setProperty("--x-move", xMove);
    el.style.transform = `scale(${scale})`;
    el.style.opacity = opacity.toFixed(2);

    container.appendChild(el);
  }
});

// ===== Autoplay musik tanpa klik: play muted -> coba unmute otomatis =====
(function initBgMusic(){
  const audioEl = document.getElementById("bg-music");
  if (!audioEl) return;

  const src = audioEl.dataset.src;   // ex: music/lagu.dat
  let loaded = false;
  let unmuted = false;

  async function loadAndStartMuted(){
    if (loaded) return;
    loaded = true;
    try {
      // Ambil file (ekstensi .dat agar tidak disamber IDM)
      const res = await fetch(src, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const blob = new Blob([buf], { type: "audio/mpeg" });
      const url  = URL.createObjectURL(blob);

      audioEl.src = url;
      audioEl.muted = true;            // wajib: agar autoplay lolos
      audioEl.volume = 0.8;            // target volume setelah unmute
      await audioEl.play();            // mulai muted
      // Coba unmute otomatis
      tryAutoUnmute();
    } catch (e) {
      console.error("Gagal load/play audio:", e);
    }
  }

  // Coba unmute beberapa kali: saat pageshow/visible/loaded
  function tryAutoUnmute(){
    if (unmuted) return;
    // beberapa percobaan beruntun (selama ~2 detik)
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      try {
        audioEl.muted = false;   // kalau policy mengizinkan, suara langsung muncul
        if (!audioEl.muted) {
          // fade-in halus
          const target = 0.8; audioEl.volume = 0;
          const iv = setInterval(() => {
            audioEl.volume = Math.min(target, audioEl.volume + 0.05);
            if (audioEl.volume >= target) clearInterval(iv);
          }, 40);
          unmuted = true;
          clearInterval(t);
        }
      } catch {}
      if (tries > 50) clearInterval(t); // stop percobaan setelah 2s
    }, 40);
  }

  // Start secepatnya begitu DOM siap
  document.addEventListener("DOMContentLoaded", loadAndStartMuted);

  // Saat kembali ke tab/halaman, pastikan tetap play & coba unmute lagi
  window.addEventListener("pageshow", async () => {
    try { await audioEl.play(); } catch {}
    tryAutoUnmute();
  });
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "hidden") {
      audioEl.pause();
    } else {
      try { await audioEl.play(); } catch {}
      tryAutoUnmute();
    }
  });
  window.addEventListener("focus", async () => { try { await audioEl.play(); } catch {}; tryAutoUnmute(); });

  // Fallback: kalau browser tetap melarang unmute tanpa gesture,
  // kita “nyalakan suara” pada interaksi pertama (musik sudah berjalan muted).
  const liftMute = () => {
    try { audioEl.muted = false; audioEl.play(); } catch {}
    unmuted = !audioEl.muted;
    window.removeEventListener("pointerdown", liftMute);
    window.removeEventListener("touchstart", liftMute);
    window.removeEventListener("keydown", liftMute);
  };
  window.addEventListener("pointerdown", liftMute, { once:true });
  window.addEventListener("touchstart", liftMute, { once:true });
  window.addEventListener("keydown", liftMute, { once:true });
})();
