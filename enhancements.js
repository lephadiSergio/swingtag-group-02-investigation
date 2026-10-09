const menuButton = document.getElementById("menuBtn");
const siteNav = document.getElementById("siteNav");

if (menuButton && siteNav) {
  menuButton.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.textContent = isOpen ? "Close" : "Menu";
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.textContent = "Menu";
    });
  });
}

document.querySelectorAll(".stage-card, .evidence-card, .truth-card").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(900px) rotateX(${y * -2.4}deg) rotateY(${x * 2.4}deg) translateY(-2px)`;
  });
  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
});

(() => {
  const story = document.getElementById("powerStory");
  if (!story) return;

  const replay = document.getElementById("powerReplay");
  const fill = document.getElementById("reservoirFill");
  const percent = document.getElementById("reservoirPercent");
  const vstore = document.getElementById("vstoreReadout");
  const needle = document.getElementById("thresholdNeedle");
  const switchState = document.getElementById("switchState");
  const status = document.getElementById("powerStatusText");
  const rail = document.getElementById("railReadout");
  const steps = [...story.querySelectorAll("[data-flow-step]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cycleMs = 12000;
  let startedAt = 0;
  let frame = null;
  let lastPaint = 0;

  function paint({ voltage, powered, activeStep, phase, message, complete = false }) {
    const charge = Math.max(0, Math.min(100, (voltage / 3.3) * 100));
    story.dataset.phase = phase;
    story.classList.toggle("load-enabled", powered);
    fill.style.height = `${charge.toFixed(1)}%`;
    percent.textContent = `${Math.round(charge)}%`;
    vstore.textContent = `${voltage.toFixed(2)} V`;
    needle.style.setProperty("--needle", `${Math.max(2, Math.min(96, charge)).toFixed(1)}%`);
    switchState.querySelector("span").textContent = powered ? "ON · LOAD ENABLED" : "OFF · CHARGING";
    status.textContent = message;
    rail.textContent = powered ? "3.3 V" : "OFF";
    steps.forEach((step) => step.classList.toggle("is-active", Number(step.dataset.flowStep) === activeStep));
    replay.textContent = complete ? "Replay energy flow" : "Restart animation";
  }

  function stateAt(elapsed) {
    if (elapsed < 1800) return { voltage: .2, powered: false, activeStep: 1, phase: "coupling", message: "Phone approaching: the NFC magnetic field is forming." };
    if (elapsed < 2800) return { voltage: .35, powered: false, activeStep: 2, phase: "antenna", message: "The passive antenna is coupling energy from the phone field." };
    if (elapsed < 3800) return { voltage: .55, powered: false, activeStep: 3, phase: "harvest", message: "The ST25 energy-harvesting output is feeding the storage path." };
    if (elapsed < 8200) {
      const progress = (elapsed - 3800) / 4400;
      const voltage = .55 + 2.65 * progress;
      const powered = voltage >= 2.8;
      return {
        voltage,
        powered,
        activeStep: powered ? 5 : 4,
        phase: powered ? "threshold" : "charging",
        message: powered
          ? "VSTORE has reached 2.8 V: the automatic switch enables the downstream path."
          : "The 4700 µF storage capacitor is charging while the load remains locked OFF."
      };
    }
    if (elapsed < 9300) {
      const voltage = 3.2 - .12 * ((elapsed - 8200) / 1100);
      return { voltage, powered: true, activeStep: 6, phase: "regulate", message: "The buck-boost stage converts the varying stored voltage into a stable 3.3 V rail." };
    }
    if (elapsed < 10800) {
      const voltage = 3.08 - .28 * ((elapsed - 9300) / 1500);
      return { voltage, powered: true, activeStep: 7, phase: "update", message: "Regulated 3.3 V powers the STM32 and the e-paper update event." };
    }
    return { voltage: 2.75, powered: false, activeStep: 5, phase: "recharge", message: "The load path is OFF again. Harvested energy can recharge the reservoir for the next update." };
  }

  function tick(now) {
    const elapsed = now - startedAt;
    if (now - lastPaint > 55 || elapsed >= cycleMs) {
      paint({ ...stateAt(Math.min(elapsed, cycleMs)), complete: elapsed >= cycleMs });
      lastPaint = now;
    }
    if (elapsed < cycleMs) frame = window.requestAnimationFrame(tick);
    else frame = null;
  }

  function start() {
    if (frame) window.cancelAnimationFrame(frame);
    if (reducedMotion.matches) {
      paint({ voltage: 2.8, powered: true, activeStep: 7, phase: "update", message: "VSTORE ≥ 2.8 V: the enabled buck-boost rail powers the MCU and e-paper.", complete: true });
      return;
    }
    startedAt = performance.now();
    lastPaint = 0;
    frame = window.requestAnimationFrame(tick);
  }

  replay?.addEventListener("click", start);
  reducedMotion.addEventListener?.("change", start);
  start();
})();
