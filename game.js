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
  const roastReveal = document.getElementById("roastReveal");
  const roastHeading = document.getElementById("roastHeading");
  const roastCopy = document.getElementById("roastCopy");
  const roastAttempt = document.getElementById("roastAttempt");
  const energyReadout = document.getElementById("energyReadout");
  const revealedCoupling = document.getElementById("revealedCoupling");
  const revealedVoltage = document.getElementById("revealedVoltage");
  const revealedEnergy = document.getElementById("revealedEnergy");
  const energyTarget = document.getElementById("energyTarget");
  const energyFactTitle = document.getElementById("energyFactTitle");
  const energyFacts = document.getElementById("energyFacts");

  if (!slider || !testButton || !leaderboardBody) return;

  const SCORE_KEY_V1 = "swingtag-nfc-leaderboard-v1";
  const SCORE_KEY_V2 = "swingtag-nfc-leaderboard-v2";
  const ATTEMPT_KEY = "swingtag-nfc-attempts-v2";
  const OPTIMAL_MIN_MM = 15;
  const OPTIMAL_MAX_MM = 20;
  const COUPLING_UNLOCK = 87;
  const MAX_ATTEMPTS = 2;
  const CAPACITANCE_F = 0.0047;
  const TARGET_MIN_V = 3.3;
  const TARGET_MAX_V = 4.0;
  const TAG_REVEAL_MS = 10000;
  const ROAST_REVEAL_MS = 4300;
  let roundStartedAt = Date.now();
  let roundWon = false;
  let revealTimer = null;
  let roastTimer = null;

  const roasts = {
    contact: [
      ["BONK MODE ACTIVATED 😂", "That is NFC, not a panini press. Masixole would like his tag back in one piece."],
      ["PERSONAL SPACE, ENGINEER 🤣", "Sergio has nearly NFC-slapped the price tag. Add a few millimetres before HR gets involved."],
      ["ZERO MILLIMETRES?! 😂", "You have invented wired NFC. Revolutionary, unnecessary, and extremely clingy."],
      ["THE ANTENNAS ARE HUGGING 🤣", "Cute, but the brief said coupling—not a long-term relationship."],
      ["CONTACT SPORT DETECTED 😂", "The phone and tag have exchanged insurance details. Please separate them gently."]
    ],
    veryClose: [
      ["SO CLOSE, YET SO CHAOTIC 😂", "Give the magnetic field a tiny runway. Right now the hardware can hear each other breathing."],
      ["ENGINEERING BY CUDDLE? 🤣", "Bold technique. Unfortunately, the sweet spot is not under the phone's screen protector."],
      ["BACK IT UP, CHAMPION 😂", "Masixole is holding an e-paper tag, not accepting a contactless headbutt."],
      ["THE TAG FEELS THREATENED 🤣", "Excellent enthusiasm, questionable spacing. Move a little farther away."],
      ["TOO MUCH COMMITMENT 😂", "The antennas have skipped pairing and gone straight to marriage. Add distance."]
    ],
    near: [
      ["ALMOST. THE PAIN IS REAL 😂", "The magnetic field can see the sweet spot from here. Move closer to 15–20 mm."],
      ["NFC SAID: TRY AGAIN 🤣", "Good energy, suspicious geometry. One careful adjustment could rescue your engineering reputation."],
      ["THE TAG FELT A VIBE 😂", "Unfortunately a vibe is not a reliable update. Aim for the 15–20 mm zone."],
      ["SO NEAR, SO DRAMATIC 🤣", "The coupling is buffering emotionally. Move toward the target window."],
      ["MASIXOLE IS STILL WAITING 😂", "The tag saw the phone, waved politely and received absolutely no useful update."],
      ["THE FIELD NEEDS DIRECTIONS 🤣", "You are close enough for hope, not close enough for victory. Try 15–20 mm."]
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

  function couplingFor(distanceMm) {
    if (distanceMm < OPTIMAL_MIN_MM) {
      return Math.round(58 + (distanceMm / OPTIMAL_MIN_MM) * 34);
    }
    const centreOffset = Math.abs(distanceMm - 17.5) / 2.5;
    return Math.round(100 - Math.min(1, centreOffset) * 8);
  }

  function voltageFor(coupling) {
    return Math.min(TARGET_MAX_V, 4 * coupling / 100);
  }

  function energyMillijoules(voltage) {
    return 0.5 * CAPACITANCE_F * voltage * voltage * 1000;
  }

  function updateScene() {
    const distanceMm = Number(slider.value);
    const left = 4 + ((20 - distanceMm) / 20) * 44;
    stage.style.setProperty("--sergio-left", `${left}%`);
    stage.style.setProperty("--field-strength", ".18");
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
    const current = readJson(SCORE_KEY_V2, null);
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
      if (cleaned.length !== current.length) writeJson(SCORE_KEY_V2, cleaned);
      return cleaned;
    }

    const legacy = readJson(SCORE_KEY_V1, []);
    if (!Array.isArray(legacy)) return [];
    const migrated = legacy
      .filter(entry => Number(entry.attempts) <= MAX_ATTEMPTS)
      .map(entry => ({
        name: entry.name,
        score: entry.score,
        distanceMm: Number(entry.distance) * 10,
        attempts: entry.attempts,
        timestamp: entry.timestamp,
        unit: "mm"
      }));
    writeJson(SCORE_KEY_V2, migrated);
    return migrated;
  }

  function writeScores(scores) {
    writeJson(SCORE_KEY_V2, scores.slice(0, 8));
  }

  function renderLeaderboard() {
    const scores = readScores();
    leaderboardBody.replaceChildren();
    if (!scores.length) {
      const row = document.createElement("tr");
      row.className = "leaderboard-empty";
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "No champions yet. Be the first person to find the 15–20 mm sweet spot.";
      row.appendChild(cell);
      leaderboardBody.appendChild(row);
      return;
    }

    scores.forEach((entry, index) => {
      const row = document.createElement("tr");
      if (index === 0) row.className = "leaderboard-champion";
      const distanceMm = Number(entry.distanceMm ?? Number(entry.distance) * 10);
      [index + 1, entry.name, entry.score, `${distanceMm.toFixed(0)} mm`, entry.attempts].forEach((value, columnIndex) => {
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

  function saveWin(distanceMm, name, used) {
    const elapsedSeconds = Math.floor((Date.now() - roundStartedAt) / 1000);
    const score = Math.max(25, 100 - (used - 1) * 22 - Math.floor(elapsedSeconds / 10) * 2);
    const scores = readScores().filter(entry => normaliseName(String(entry.name || "")) !== normaliseName(name));
    scores.push({ name, score, distanceMm, attempts: used, timestamp: Date.now(), unit: "mm" });
    scores.sort((a, b) => b.score - a.score || a.attempts - b.attempts || a.timestamp - b.timestamp);
    writeScores(scores);
    renderLeaderboard();
    return score;
  }

  function showEnergy(distanceMm, coupling) {
    const voltage = voltageFor(coupling);
    const energyMj = energyMillijoules(voltage);
    const ledSeconds = energyMj / 10;
    const sensorSeconds = energyMj / 5;
    const mcuSeconds = energyMj / 20;
    const displayScreeningMj = 31.5;

    energyReadout.hidden = false;
    revealedCoupling.textContent = `${coupling}%`;
    revealedVoltage.textContent = `${voltage.toFixed(2)} V`;
    revealedEnergy.textContent = `${energyMj.toFixed(1)} mJ`;
    energyTarget.className = `energy-target ${voltage >= TARGET_MIN_V ? "target-reached" : "target-low"}`;
    energyTarget.textContent = voltage >= TARGET_MIN_V
      ? `${distanceMm} mm reaches the illustrative 3.3–4.0 V target band.`
      : `${distanceMm} mm gives less than the 3.3 V target in this illustrative model.`;
    energyFactTitle.textContent = `${energyMj.toFixed(1)} mJ is small—but not useless.`;

    const comparisons = [
      `Ideally power a 10 mW LED for about ${ledSeconds.toFixed(1)} s.`,
      `Ideally power a 5 mW sensor for about ${sensorSeconds.toFixed(1)} s.`,
      `Ideally run a 20 mW MCU task for about ${mcuSeconds.toFixed(1)} s.`,
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
    stage.classList.remove("tag-showcase");
    tagReveal.setAttribute("aria-hidden", "true");
  }

  function showTagReveal(name) {
    hideRoast();
    hideTagReveal();
    tagEngineerName.textContent = name;
    tagReveal.setAttribute("aria-hidden", "false");
    stage.classList.add("tag-showcase");
    revealTimer = window.setTimeout(hideTagReveal, TAG_REVEAL_MS);
  }

  function hideRoast() {
    if (roastTimer) window.clearTimeout(roastTimer);
    roastTimer = null;
    stage.classList.remove("roast-showcase");
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
    stage.classList.add("roast-showcase");
    roastTimer = window.setTimeout(hideRoast, ROAST_REVEAL_MS);
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
    const distanceMm = Number(slider.value);
    const coupling = couplingFor(distanceMm);
    showEnergy(distanceMm, coupling);
    stage.style.setProperty("--field-strength", String(Math.max(.08, coupling / 100)));
    fieldSpark.textContent = coupling >= COUPLING_UNLOCK ? "⚡" : "×";

    if (distanceMm >= OPTIMAL_MIN_MM && distanceMm <= OPTIMAL_MAX_MM && coupling >= COUPLING_UNLOCK) {
      roundWon = true;
      const score = saveWin(distanceMm, name, used);
      setResult("win", "3D TAG UNLOCKED", `${distanceMm} mm · ${coupling}% estimated coupling`, `You found the 15–20 mm target in ${used} ${used === 1 ? "try" : "tries"}. Score: ${score}/100. ${revealedEnergy.textContent} is the idealised stored-energy estimate.`);
      stage.classList.remove("celebrate");
      void stage.offsetWidth;
      stage.classList.add("celebrate");
      showTagReveal(name);
      refreshAttemptState();
      return;
    }

    const remaining = MAX_ATTEMPTS - used;
    setResult(
      "miss",
      remaining ? "NOT THE SWEET SPOT" : "TWO ATTEMPTS USED",
      `${distanceMm} mm · ${coupling}% estimated coupling`,
      remaining ? `One attempt remains for ${name}. Coupling and energy are now revealed below.` : `${name} has used both attempts. The next engineer must enter a new name.`
    );

    let group = distanceMm <= 3 ? "contact" : distanceMm <= 8 ? "veryClose" : "near";
    if (!remaining) group = "final";
    showRoast(group, used);
    refreshAttemptState();
  }

  function resetRound() {
    roundWon = false;
    roundStartedAt = Date.now();
    slider.value = "10";
    stage.classList.remove("celebrate");
    hideTagReveal();
    hideRoast();
    energyReadout.hidden = true;
    fieldSpark.textContent = "?";
    setResult("idle", "READY", "Your result is still classified.", "Choose 0–20 mm and test. Coupling and calculated storage energy appear only after the attempt.");
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
  updateScene();
  refreshAttemptState();
  renderLeaderboard();
})();
