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
  const track = story.querySelector(".power-path-track");
  const stageButtons = [...story.querySelectorAll("[data-stage-jump]")];
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
    track.style.transform = `translateX(-${(activeStep - 1) * 100}%)`;
    stageButtons.forEach((button) => button.classList.toggle("active", Number(button.dataset.stageJump) === activeStep));
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
  const stageOffsets = [0, 1800, 2800, 4300, 7600, 8400, 9500];
  stageButtons.forEach((button) => button.addEventListener("click", () => {
    if (frame) window.cancelAnimationFrame(frame);
    startedAt = performance.now() - stageOffsets[Number(button.dataset.stageJump) - 1];
    frame = window.requestAnimationFrame(tick);
  }));
  reducedMotion.addEventListener?.("change", start);
  start();
})();

(() => {
  const versionButtons = [...document.querySelectorAll("[data-version]")];
  const status = document.getElementById("versionStatus");
  if (!versionButtons.length || !status) return;
  const title = document.getElementById("versionTitle"), text = document.getElementById("versionText"), conclusion = document.getElementById("versionConclusion");
  const versions = {
    v1:["MEASURED · VERSION 1","Automatic high-side switching demonstrated","The 2N3904 already pulled the PMOS gate close to ground at relatively low VSTORE. Practical conduction was strongly influenced by IRF9530N gate-source behaviour rather than a sharp comparator-like decision.","Version 1 switched automatically, but did not yet provide a sharp threshold."],
    v2:["UNDER DEVELOPMENT · VERSION 2","Two-transistor threshold architecture","The additional transistor stage is being developed to sharpen the switching decision and reduce dependence on the particular PMOS gate-source characteristic. Component values and thresholds still require experimental verification.","Version 2 is a design under development—not a completed experimental result."]
  };
  versionButtons.forEach(button=>button.addEventListener("click",()=>{versionButtons.forEach(b=>b.classList.toggle("active",b===button));[status.textContent,title.textContent,text.textContent,conclusion.textContent]=versions[button.dataset.version];}));
})();

(() => {
  function drawChart(id, series, maxY, ideal=false) {
    const svg=document.getElementById(id); if(!svg)return;
    const x=v=>55+(v-1.5)/2.5*520, y=v=>305-v/maxY*260;
    let html='<path class="chart-grid" d="M55 45V305H575M55 240H575M55 175H575M55 110H575"/><path class="chart-axis" d="M55 45V305H575"/>';
    if(ideal) html+=`<path class="chart-ideal" d="M${x(1.5)} ${y(1.5)} L${x(4)} ${y(4)}"/>`;
    series.forEach((s,si)=>{const cls=si===1?'chart-gate':'chart-measured';html+=`<path class="${cls}" d="${s.points.map((p,i)=>`${i?'L':'M'}${x(p[0])} ${y(p[1])}`).join(' ')}"/>`;html+=s.points.map(p=>`<circle class="chart-point" cx="${x(p[0])}" cy="${y(p[1])}" r="5"/>`).join('');});
    html+='<text class="chart-label" x="260" y="342">VSTORE (V)</text><text class="chart-label" x="62" y="60">Voltage (V)</text>';svg.innerHTML=html;
  }
  drawChart('vloadChart',[{points:[[1.5,.35],[2,1.64],[2.5,2.48],[3,2.96],[3.5,3.48],[4,3.99]]}],4.2,true);
  drawChart('senseChart',[{points:[[1.5,.44],[2,.47],[2.5,.49],[3,.5],[3.5,.5],[4,.51]]},{points:[[1.5,.04],[2,.04],[2.5,.03],[3,.03],[3.5,.03],[4,.03]]}],.6);
  const fine=document.getElementById('fineChart');if(fine){const pts=[[2,1.64],[2.1,1.94],[2.2,2.17],[2.3,2.28],[2.4,2.38],[2.5,2.47]],x=v=>55+(v-2)/.5*520,y=v=>220-(v-1.5)/1.1*170;fine.innerHTML='<path class="chart-grid" d="M55 50V220H575M55 135H575"/><path class="chart-axis" d="M55 50V220H575"/>'+`<path class="chart-measured" d="${pts.map((p,i)=>`${i?'L':'M'}${x(p[0])} ${y(p[1])}`).join(' ')}"/>`+pts.map((p,i)=>`<circle class="chart-point" cx="${x(p[0])}" cy="${y(p[1])}" r="6"/><text class="chart-label" x="${x(p[0])-12}" y="${y(p[1])-12}">${i<2?'OFF':'ON'}</text>`).join('');}
})();

(() => {
  const distance=document.getElementById('distanceSimulation'), voltage=document.getElementById('vstoreSimulation'); if(!distance||!voltage)return;
  const distanceValue=document.getElementById('distanceSimulationValue'), voltageValue=document.getElementById('vstoreSimulationValue'), result=document.querySelector('.simulation-results'), state=document.getElementById('simSystemState'), metrics=document.getElementById('simMetrics');
  function update(){const d=Number(distance.value),v=Number(voltage.value),field=Math.max(5,Math.round(100-d/3*85)),enabled=v>=2.8;distanceValue.textContent=d.toFixed(1);voltageValue.textContent=v.toFixed(1);result.classList.toggle('enabled',enabled);state.textContent=enabled?'POWER PATH ENABLED':'WAITING FOR SUFFICIENT ENERGY';metrics.textContent=`Field ${field}% · ${d<1?'shorter':'longer'} illustrative charge time · regulator ${enabled?'ACTIVE':'OFF'} · MCU ${enabled?'POWERED':'OFF'} · e-paper ${enabled?'updating':'inactive'}`;}
  distance.addEventListener('input',update);voltage.addEventListener('input',update);update();
})();
