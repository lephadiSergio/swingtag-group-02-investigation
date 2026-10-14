(() => {
  const slider = document.getElementById("distanceSlider");
  const testButton = document.getElementById("testDistanceBtn");
  const resetButton = document.getElementById("resetGameBtn");
  const result = document.getElementById("gameResult");
  const playerName = document.getElementById("playerName");
  const attemptHint = document.getElementById("attemptHint");
  const stage = document.getElementById("gameStage");
  const fieldSpark = document.getElementById("fieldSpark");
  const leaderboardBody = document.getElementById("leaderboardBody");
  const tagReveal = document.getElementById("tagReveal");
  const tagEngineerName = document.getElementById("tagEngineerName");
  const tagRevealClose = document.getElementById("tagRevealClose");
  const roastReveal = document.getElementById("roastReveal");
  const roastHeading = document.getElementById("roastHeading");
  const roastCopy = document.getElementById("roastCopy");
  const roastAttempt = document.getElementById("roastAttempt");
  const energyReadout = document.getElementById("energyReadout");
  const revealedCoupling = document.getElementById("revealedCoupling");
  const revealedVoltage = document.getElementById("revealedVoltage");
  const revealedEnergy = document.getElementById("revealedEnergy");
  const revealedChargeRate = document.getElementById("revealedChargeRate");
  const revealedThresholdTime = document.getElementById("revealedThresholdTime");
  const revealedLatency = document.getElementById("revealedLatency");
  const revealedSuccess = document.getElementById("revealedSuccess");
  const energyTarget = document.getElementById("energyTarget");
  const energyFactTitle = document.getElementById("energyFactTitle");
  const energyFacts = document.getElementById("energyFacts");
  const perfectScoreReveal = document.getElementById("perfectScoreReveal");
  const perfectScoreName = document.getElementById("perfectScoreName");
  const perfectScoreVideo = document.getElementById("perfectScoreVideo");
  const perfectScoreClose = document.getElementById("perfectScoreClose");

  if (!slider || !testButton || !leaderboardBody) return;

  const SCORE_KEY_V1 = "swingtag-nfc-leaderboard-v1";
  const SCORE_KEY_V2 = "swingtag-nfc-leaderboard-v2";
  const SCORE_KEY_V3 = "swingtag-nfc-leaderboard-v3";
  const ATTEMPT_KEY = "swingtag-nfc-attempts-v3";
  const MAX_DISTANCE_CM = 8;
  const MAX_ATTEMPTS = 2;
  const CAPACITANCE_F = 0.0047;
  const TARGET_MIN_V = 3.3;
  const REPRESENTATIVE_MODEL = [
    { field:100, voltage:4.85, chargeRate:410, thresholdTime:7, latency:11, success:99, band:"very strong" },
    { field:96, voltage:4.55, chargeRate:340, thresholdTime:9, latency:13, success:98, band:"very strong" },
    { field:88, voltage:4.15, chargeRate:260, thresholdTime:12, latency:16, success:94, band:"very strong" },
    { field:77, voltage:3.65, chargeRate:180, thresholdTime:20, latency:25, success:85, band:"moderate" },
    { field:63, voltage:3.00, chargeRate:105, thresholdTime:40, latency:46, success:70, band:"moderate" },
    { field:45, voltage:2.25, chargeRate:55, thresholdTime:95, latency:105, success:48, band:"moderate" },
    { field:27, voltage:1.45, chargeRate:22, thresholdTime:240, latency:260, success:24, band:"weak" },
    { field:11, voltage:0.70, chargeRate:7, thresholdTime:650, latency:690, success:7, band:"weak" },
    { field:1, voltage:0.10, chargeRate:0.5, thresholdTime:null, latency:null, success:1, band:"near failure" }
  ];
  const TAG_REVEAL_MS = 10000;
  const ROAST_REVEAL_MS = 4300;
  let roundStartedAt = Date.now();
  let roundWon = false;
  let revealTimer = null;
  let roastTimer = null;

  const roasts = {
    strong: [
      ["THE FIELD HAD ONE JOB 😂", "You chose the strongest region and still rolled the tiny failure chance. Even Maxwell is confused."],
      ["NFC PLOT TWIST 🤣", "Excellent distance, terrible luck. Keep the phone aligned and try that strong 0–2 cm region again."],
      ["THE ANTENNAS SNEEZED 😂", "That spacing was strong, but this simulated attempt glitched at the finish line. One retry should rescue it."]
    ],
    moderate: [
      ["ENERGY IS TAKING THE SCENIC ROUTE 😂", "At 3–5 cm the capacitor needs patience, alignment and a motivational speech."],
      ["THE TAG FELT A VIBE 🤣", "A vibe is not yet a reliable e-paper update. Move toward 0–2 cm for stronger coupling."],
      ["CHARGING… EMOTIONALLY 😂", "The field is present, but the reservoir is collecting energy one dramatic electron at a time."],
      ["MEDIUM DISTANCE, MAXIMUM SUSPENSE 🤣", "The update probability is dropping. Bring Sergio's phone closer to Masixole's tag."]
    ],
    weak: [
      ["THE MAGNETIC FIELD NEEDS BINOCULARS 😂", "At 6–7 cm the tag can barely see the phone. Move closer before the capacitor retires."],
      ["WIRELESS POWER, VERY WIRELESS RESULTS 🤣", "The spacing is impressive. The harvested energy is not."],
      ["MASIXOLE IS STILL WAITING 😂", "The tag saw the phone in the distance, waved politely and received almost no useful energy."],
      ["THAT CHARGE TIME HAS A BIRTHDAY 😂", "Weak coupling means a painfully slow reservoir. Try the strong 0–2 cm region."]
    ],
    failure: [
      ["EIGHT CENTIMETRES OF OPTIMISM 😂", "The field has left the chat. Move the phone much closer if you want that e-paper to refresh."],
      ["NFC SAID: WHO ARE YOU? 🤣", "At 8 cm the harvested voltage is almost zero. The tag is basically receiving a postcard."],
      ["UPDATE STATUS: ABSOLUTELY NOT 😂", "The capacitor collected hopes and dreams, but almost no energy. Try 0–2 cm."]
    ],
    final: [
      ["TWO ATTEMPTS. BOTH COOKED. 😂🤣", "This engineer has been temporarily banned from estimating distances by eye."],
      ["GAME OVER, PROFESSOR NFC 🤣😂", "The tag remains unchanged, but the laboratory has gained a fantastic cautionary tale."],
      ["THE MAGNETIC FIELD HAS LEFT THE CHAT 😂", "Two guesses used. Please hand the phone to the next brave engineer."],
      ["QUALIFICATIONS UNDER REVIEW 🤣", "The antennas requested a second opinion. This name has used both attempts."]
    ]
  };

  function randomRoast(group) {
    const options = roasts[group];
    return options[Math.floor(Math.random() * options.length)];
  }

  function normaliseName(value) {
    return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  }

  function displayName() {
    return playerName.value.trim().replace(/\s+/g, " ").slice(0, 18);
  }

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // The game remains playable if browser storage is unavailable.
    }
  }

  function readAttempts() {
    const data = readJson(ATTEMPT_KEY, {});
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  }

  function attemptsUsed(nameKey) {
    return Math.min(MAX_ATTEMPTS, Number(readAttempts()[nameKey]) || 0);
  }

  function recordAttempt(nameKey) {
    const ledger = readAttempts();
    ledger[nameKey] = Math.min(MAX_ATTEMPTS, (Number(ledger[nameKey]) || 0) + 1);
    writeJson(ATTEMPT_KEY, ledger);
    return ledger[nameKey];
  }

  function modelFor(distanceCm) {
    const safeDistance = Math.max(0, Math.min(MAX_DISTANCE_CM, Math.round(distanceCm)));
    return REPRESENTATIVE_MODEL[safeDistance];
  }

  function deterministicRoll(nameKey, distanceCm, attempt) {
    const seed = `${nameKey}|${distanceCm}|${attempt}`;
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (Math.abs(hash) % 100) + 1;
  }

  function energyMillijoules(voltage) {
    return 0.5 * CAPACITANCE_F * voltage * voltage * 1000;
  }

  function updateScene() {
    const distanceCm = Number(slider.value);
    const model = modelFor(distanceCm);
    const left = 4 + ((MAX_DISTANCE_CM - distanceCm) / MAX_DISTANCE_CM) * 44;
    stage.style.setProperty("--sergio-left", `${left}%`);
    stage.style.setProperty("--field-strength", String(Math.max(.03, model.field / 100)));
    fieldSpark.textContent = "?";
  }

  function setResult(state, label, heading, copy) {
    result.className = `game-result ${state}`;
    result.querySelector("span").textContent = label;
    result.querySelector("strong").textContent = heading;
    result.querySelector("p").textContent = copy;
  }

  function refreshAttemptState() {
    const name = displayName();
    const key = normaliseName(name);
    if (!key) {
      attemptHint.textContent = "Enter your name to unlock two attempts.";
      testButton.disabled = false;
      testButton.textContent = "Test this distance";
      return;
    }

    const used = attemptsUsed(key);
    const remaining = MAX_ATTEMPTS - used;
    attemptHint.textContent = remaining > 0
      ? `${name} has ${remaining} ${remaining === 1 ? "attempt" : "attempts"} remaining on this browser.`
      : `${name} has used both attempts. Enter the next engineer's name.`;
    testButton.disabled = remaining === 0 || roundWon;
    testButton.textContent = remaining === 0 ? "Two attempts used" : "Test this distance";
  }

  function readScores() {
    const current = readJson(SCORE_KEY_V3, null);
    if (Array.isArray(current)) {
      const unique = new Map();
      current
        .filter(entry => Number(entry.attempts) <= MAX_ATTEMPTS)
        .forEach(entry => {
          const key = normaliseName(String(entry.name || ""));
          const previous = unique.get(key);
          if (key && (!previous || Number(entry.score) > Number(previous.score))) unique.set(key, entry);
        });
      const cleaned = [...unique.values()];
      if (cleaned.length !== current.length) writeJson(SCORE_KEY_V3, cleaned);
      return cleaned;
    }

    const millimetreScores = readJson(SCORE_KEY_V2, null);
    const legacy = Array.isArray(millimetreScores) ? millimetreScores : readJson(SCORE_KEY_V1, []);
    if (!Array.isArray(legacy)) return [];
    const migrated = legacy
      .filter(entry => Number(entry.attempts) <= MAX_ATTEMPTS)
      .map(entry => ({
        name: entry.name,
        score: entry.score,
        distanceCm: Number.isFinite(Number(entry.distanceMm)) ? Number(entry.distanceMm) / 10 : Number(entry.distance),
        attempts: entry.attempts,
        timestamp: entry.timestamp,
        unit: "cm"
      }));
    writeJson(SCORE_KEY_V3, migrated);
    return migrated;
  }

  function writeScores(scores) {
    writeJson(SCORE_KEY_V3, scores.slice(0, 8));
  }

  function renderLeaderboard() {
    const scores = readScores();
    leaderboardBody.replaceChildren();
    if (!scores.length) {
      const row = document.createElement("tr");
      row.className = "leaderboard-empty";
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "No champions yet. Be the first engineer to complete an update across the 0–8 cm investigation range.";
      row.appendChild(cell);
      leaderboardBody.appendChild(row);
      return;
    }

    scores.forEach((entry, index) => {
      const row = document.createElement("tr");
      if (index === 0) row.className = "leaderboard-champion";
      const distanceCm = Number.isFinite(Number(entry.distanceCm)) ? Number(entry.distanceCm) : Number(entry.distanceMm) / 10;
      [index + 1, entry.name, entry.score, `${distanceCm.toFixed(1)} cm`, entry.attempts].forEach((value, columnIndex) => {
        const cell = document.createElement("td");
        if (index === 0 && columnIndex === 1) {
          const crown = document.createElement("span");
          crown.className = "leaderboard-crown";
          crown.setAttribute("aria-label", "Leaderboard champion");
          crown.textContent = "♛";
          const championName = document.createElement("strong");
          championName.textContent = String(value);
          cell.append(crown, championName);
        } else {
          cell.textContent = String(value);
        }
        row.appendChild(cell);
      });
      leaderboardBody.appendChild(row);
    });
  }

  function saveWin(distanceCm, name, used, model) {
    const elapsedSeconds = Math.floor((Date.now() - roundStartedAt) / 1000);
    const distanceScore = distanceCm === 0 ? 100 : Math.round(model.success * .72 + model.field * .28);
    const score = Math.max(25, Math.min(100, distanceScore - (used - 1) * 15 - Math.floor(elapsedSeconds / 15)));
    const scores = readScores().filter(entry => normaliseName(String(entry.name || "")) !== normaliseName(name));
    scores.push({ name, score, distanceCm, attempts: used, timestamp: Date.now(), unit: "cm" });
    scores.sort((a, b) => b.score - a.score || a.attempts - b.attempts || a.timestamp - b.timestamp);
    writeScores(scores);
    renderLeaderboard();
    return score;
  }

  function showEnergy(distanceCm, model) {
    const voltage = model.voltage;
    const energyMj = energyMillijoules(voltage);
    const ledSeconds = energyMj / 10;
    const sensorSeconds = energyMj / 5;
    const mcuSeconds = energyMj / 20;
    const displayScreeningMj = 31.5;

    energyReadout.hidden = false;
    revealedCoupling.textContent = `${model.field}%`;
    revealedVoltage.textContent = `${voltage.toFixed(2)} V`;
    revealedEnergy.textContent = `${energyMj.toFixed(1)} mJ`;
    revealedChargeRate.textContent = model.chargeRate >= 1 ? `${model.chargeRate.toFixed(0)} mV/s` : `<1 mV/s`;
    revealedThresholdTime.textContent = model.thresholdTime === null ? "Not reached" : `${model.thresholdTime} s`;
    revealedLatency.textContent = model.latency === null ? "Incomplete" : `${model.latency} s`;
    revealedSuccess.textContent = `${model.success}%`;
    energyTarget.className = `energy-target ${voltage >= TARGET_MIN_V ? "target-reached" : "target-low"}`;
    energyTarget.textContent = distanceCm <= 2
      ? `${distanceCm} cm: very strong coupling, fastest charging and the highest update reliability.`
      : distanceCm <= 5
        ? `${distanceCm} cm: moderate coupling, reduced voltage and a longer update cycle.`
        : distanceCm <= 7
          ? `${distanceCm} cm: weak coupling, slow accumulation and a low success probability.`
          : `8 cm: near-failure region; the reservoir normally cannot support a reliable update.`;
    energyFactTitle.textContent = `${energyMj.toFixed(1)} mJ is small—but not useless.`;

    const comparisons = [
      `Ideally power a 10 mW LED for about ${ledSeconds.toFixed(1)} s.`,
      `Ideally power a 5 mW sensor for about ${sensorSeconds.toFixed(1)} s.`,
      `Ideally run a 20 mW MCU task for about ${mcuSeconds.toFixed(1)} s.`,
      `Representative update-success probability at ${distanceCm} cm: ${model.success}%.`,
      energyMj >= displayScreeningMj
        ? `It exceeds the earlier 31.5 mJ display-only screening estimate—but the MCU and conversion losses still need energy.`
        : `It is below the earlier 31.5 mJ display-only screening estimate before MCU and conversion losses.`
    ];
    energyFacts.replaceChildren();
    comparisons.forEach(copy => {
      const item = document.createElement("li");
      item.textContent = copy;
      energyFacts.appendChild(item);
    });
  }

  function hideTagReveal() {
    if (revealTimer) window.clearTimeout(revealTimer);
    revealTimer = null;
    document.body.classList.remove("tag-showcase");
    tagReveal.setAttribute("aria-hidden", "true");
  }

  function showTagReveal(name) {
    hideRoast();
    hideTagReveal();
    tagEngineerName.textContent = name;
    tagReveal.setAttribute("aria-hidden", "false");
    document.body.classList.add("tag-showcase");
    tagRevealClose?.focus();
    revealTimer = window.setTimeout(hideTagReveal, TAG_REVEAL_MS);
  }

  function hideRoast() {
    if (roastTimer) window.clearTimeout(roastTimer);
    roastTimer = null;
    document.body.classList.remove("roast-showcase");
    roastReveal.setAttribute("aria-hidden", "true");
  }

  function showRoast(group, used) {
    hideTagReveal();
    hideRoast();
    const [heading, copy] = randomRoast(group);
    roastHeading.textContent = heading;
    roastCopy.textContent = copy;
    roastAttempt.textContent = used >= MAX_ATTEMPTS ? "Both attempts used" : `Attempt ${used} of ${MAX_ATTEMPTS}`;
    roastReveal.setAttribute("aria-hidden", "false");
    document.body.classList.add("roast-showcase");
    roastTimer = window.setTimeout(hideRoast, ROAST_REVEAL_MS);
  }

  function hidePerfectScore() {
    if (!perfectScoreReveal) return;
    perfectScoreReveal.hidden = true;
    perfectScoreReveal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("perfect-score-showcase");
    if (perfectScoreVideo) {
      perfectScoreVideo.pause();
      perfectScoreVideo.currentTime = 0;
    }
  }

  function showPerfectScore(name) {
    if (!perfectScoreReveal || !perfectScoreName) return;
    perfectScoreName.textContent = name;
    perfectScoreReveal.hidden = false;
    perfectScoreReveal.setAttribute("aria-hidden", "false");
    document.body.classList.add("perfect-score-showcase");
    perfectScoreClose?.focus();
    perfectScoreVideo?.play().catch(() => {
      // Autoplay policies may require the visitor to press play; controls stay visible.
    });
  }

  function testDistance() {
    const name = displayName();
    const nameKey = normaliseName(name);
    if (!nameKey) {
      setResult("miss", "NAME REQUIRED", "Who is brave enough to play?", "Enter an engineer name first. The two-attempt limit is tracked by name on this browser.");
      playerName.focus();
      return;
    }

    if (roundWon) {
      setResult("win", "ROUND COMPLETE", "The tag has already refreshed.", "Select New round for another engineer. Attempts remain restricted by name.");
      return;
    }

    const previousUsed = attemptsUsed(nameKey);
    if (previousUsed >= MAX_ATTEMPTS) {
      refreshAttemptState();
      setResult("miss", "ATTEMPTS USED", `${name}, your two guesses are gone.`, "Enter the next engineer's name to continue.");
      showRoast("final", MAX_ATTEMPTS);
      return;
    }

    const used = recordAttempt(nameKey);
    const distanceCm = Number(slider.value);
    const model = modelFor(distanceCm);
    const roll = deterministicRoll(nameKey, distanceCm, used);
    const updateSucceeded = roll <= model.success;
    showEnergy(distanceCm, model);
    stage.style.setProperty("--field-strength", String(Math.max(.03, model.field / 100)));
    fieldSpark.textContent = model.field >= 60 ? "⚡" : "×";

    if (updateSucceeded) {
      roundWon = true;
      const score = saveWin(distanceCm, name, used, model);
      setResult("win", "3D TAG UNLOCKED", `${distanceCm} cm · ${model.field}% representative field`, `The simulated e-paper update completed in ${used} ${used === 1 ? "try" : "tries"}. Score: ${score}/100. Estimated update latency: ${model.latency ?? "incomplete"} s.`);
      stage.classList.remove("celebrate");
      void stage.offsetWidth;
      stage.classList.add("celebrate");
      showTagReveal(name);
      if (score === 100) showPerfectScore(name);
      refreshAttemptState();
      return;
    }

    const remaining = MAX_ATTEMPTS - used;
    setResult(
      "miss",
      remaining ? "NOT ENOUGH HARVESTED ENERGY" : "TWO ATTEMPTS USED",
      `${distanceCm} cm · ${model.voltage.toFixed(2)} V · ${model.success}% representative success`,
      remaining ? `One attempt remains for ${name}. Move closer for a stronger field, faster charging and a more reliable update.` : `${name} has used both attempts. The next engineer must enter a new name.`
    );

    let group = distanceCm <= 2 ? "strong" : distanceCm <= 5 ? "moderate" : distanceCm <= 7 ? "weak" : "failure";
    if (!remaining) group = "final";
    showRoast(group, used);
    refreshAttemptState();
  }

  function resetRound() {
    roundWon = false;
    roundStartedAt = Date.now();
    slider.value = "4";
    stage.classList.remove("celebrate");
    hideTagReveal();
    hideRoast();
    hidePerfectScore();
    energyReadout.hidden = true;
    fieldSpark.textContent = "?";
    setResult("idle", "READY", "Your result is still classified.", "Choose 0–8 cm and test. Field strength, voltage, charging and update behaviour appear only after the attempt.");
    updateScene();
    refreshAttemptState();
  }

  slider.addEventListener("input", updateScene);
  playerName.addEventListener("input", () => {
    roundWon = false;
    roundStartedAt = Date.now();
    refreshAttemptState();
  });
  testButton.addEventListener("click", testDistance);
  resetButton.addEventListener("click", resetRound);
  tagRevealClose?.addEventListener("click", hideTagReveal);
  tagReveal?.addEventListener("click", event => {
    if (event.target === tagReveal) hideTagReveal();
  });
  perfectScoreClose?.addEventListener("click", hidePerfectScore);
  perfectScoreReveal?.addEventListener("click", event => {
    if (event.target === perfectScoreReveal) hidePerfectScore();
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!perfectScoreReveal?.hidden) hidePerfectScore();
    else if (tagReveal.getAttribute("aria-hidden") === "false") hideTagReveal();
  });
  updateScene();
  refreshAttemptState();
  renderLeaderboard();
})();
