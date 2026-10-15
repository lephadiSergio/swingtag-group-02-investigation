(() => {
  const byId = id => document.getElementById(id);
  const gameStart = byId("gameStart");
  const experimentControls = byId("experimentControls");
  const playerName = byId("playerName");
  const nameError = byId("nameError");
  const startButton = byId("startGameBtn");
  const slider = byId("distanceSlider");
  const distanceOutput = byId("distanceOutput");
  const testButton = byId("testDistanceBtn");
  const lifelineButton = byId("lifelineBtn");
  const lifelineHint = byId("lifelineHint");
  const scoreValue = byId("scoreValue");
  const attemptsValue = byId("attemptsValue");
  const lifelinesValue = byId("lifelinesValue");
  const stateValue = byId("stateValue");
  const activePlayer = byId("activePlayer");
  const result = byId("gameResult");
  const earnedResult = byId("earnedResult");
  const resultDistance = byId("resultDistance");
  const resultVoltage = byId("resultVoltage");
  const resultStorage = byId("resultStorage");
  const resultOutcome = byId("resultOutcome");
  const notebookBody = byId("notebookBody");
  const leaderboardBody = byId("leaderboardBody");
  const stage = byId("gameStage");
  const fieldSpark = byId("fieldSpark");
  const energyPath = byId("energyPath");
  const capacitorFill = byId("capacitorFill");
  const displayState = byId("displayState");
  const processNodes = [...document.querySelectorAll(".process-node")];
  const challengeCard = byId("challengeCard");
  const challengeChoices = byId("challengeChoices");
  const submitChallengeButton = byId("submitChallengeBtn");
  const skipChallengeButton = byId("skipChallengeBtn");
  const challengeFeedback = byId("challengeFeedback");
  const takeawayCard = byId("takeawayCard");
  const playAgainButton = byId("playAgainBtn");
  const tagReveal = byId("tagReveal");
  const tagRevealClose = byId("tagRevealClose");
  const tagEngineerName = byId("tagEngineerName");
  const roastReveal = byId("roastReveal");
  const roastHeading = byId("roastHeading");
  const roastCopy = byId("roastCopy");
  const roastAttempt = byId("roastAttempt");

  if (!slider || !testButton || !leaderboardBody) return;

  const MAX_DISTANCE_CM = 8;
  const STARTING_SCORE = 1000;
  const MAX_LIFELINES = 3;
  const SCORE_KEY = "swingtag-investigation-leaderboard-v1";
  const SUCCESS_THRESHOLD_V = 3.3;
  const MODEL = [
    { voltage: 4.80, spread: 0.10 },
    { voltage: 4.50, spread: 0.10 },
    { voltage: 4.15, spread: 0.15 },
    { voltage: 3.60, spread: 0.20 },
    { voltage: 3.00, spread: 0.20 },
    { voltage: 2.25, spread: 0.25 },
    { voltage: 1.45, spread: 0.25 },
    { voltage: 0.65, spread: 0.25 },
    { voltage: 0.10, spread: 0.10 }
  ];
  const HINTS = [
    "NFC magnetic coupling generally becomes weaker as separation increases.",
    "Watch how quickly the energy-storage element charges after each attempt.",
    "The useful operating region occurs before coupling becomes too weak to sustain the required energy."
  ];
  const ROASTS = [
    ["THE CAPACITOR FILED AN EMPTY REPORT ⚡", "Interesting result. The reservoir would like the next experiment to be more persuasive."],
    ["THE E-PAPER SAID ‘I’LL WAIT’ 🧪", "No refresh this time. Record the evidence and choose the next test condition."],
    ["ENERGY BUDGET: AUDITION UNSUCCESSFUL ⚡", "The update did not pass the energy gate, but the failed test is still useful evidence."],
    ["THE ELECTRONS REQUESTED BETTER WORKING CONDITIONS 🧪", "This trial is now in the notebook. Your next decision remains classified."],
    ["STM32 STATUS: POLITELY UNIMPRESSED ⚡", "The system stayed off. That result belongs in the investigation, not in the bin."]
  ];

  const state = {
    player: "",
    startedAt: 0,
    attempts: 0,
    unsuccessful: 0,
    lifelinesRemaining: MAX_LIFELINES,
    tests: [],
    won: false,
    busy: false,
    challengeBonus: 0,
    challengeAnswered: false,
    leaderboardSubmitted: false,
    lockedTimePenalty: null,
    revealTimer: null,
    roastTimer: null,
    scoreTimer: null
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const delay = ms => new Promise(resolve => window.setTimeout(resolve, reducedMotion ? Math.min(40, ms) : ms));

  function cleanName(value) {
    return value.trim().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} .'-]/gu, "").slice(0, 20);
  }

  function nameKey(value) {
    return cleanName(value).toLocaleLowerCase();
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
      // Browser storage is optional; the game still works without it.
    }
  }

  function elapsedPenalty() {
    if (Number.isFinite(state.lockedTimePenalty)) return state.lockedTimePenalty;
    if (!state.startedAt) return 0;
    return Math.min(100, Math.floor((Date.now() - state.startedAt) / 30000) * 5);
  }

  function currentScore() {
    return Math.max(0, STARTING_SCORE - state.unsuccessful * 50 - (MAX_LIFELINES - state.lifelinesRemaining) * 100 - elapsedPenalty() + state.challengeBonus);
  }

  function updateHud() {
    scoreValue.textContent = String(currentScore());
    attemptsValue.textContent = String(state.attempts);
    lifelinesValue.textContent = state.lifelinesRemaining > 0 ? Array(state.lifelinesRemaining).fill("💡").join(" ") : "NONE";
    lifelinesValue.setAttribute("aria-label", `${state.lifelinesRemaining} lifelines remaining`);
    stateValue.textContent = !state.player ? "NOT STARTED" : state.busy ? "TESTING" : state.won ? "UPDATE COMPLETE" : "INVESTIGATING";
  }

  function setResult(kind, label, heading, copy) {
    result.className = `game-result ${kind}`;
    result.querySelector("span").textContent = label;
    result.querySelector("strong").textContent = heading;
    result.querySelector("p").textContent = copy;
  }

  function hashUnit(seed) {
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return ((hash >>> 0) % 2001) / 1000 - 1;
  }

  function simulateReading(distance, attempt) {
    const model = MODEL[distance];
    const variation = hashUnit(`${nameKey(state.player)}|${distance}|${attempt}`);
    const voltage = Math.max(0, model.voltage + model.spread * variation);
    const storage = Math.max(0, Math.min(100, Math.round(voltage / 3.6 * 100)));
    const outcome = voltage >= SUCCESS_THRESHOLD_V && storage >= 90 ? "Successful" : voltage >= 2.6 ? "Partial" : "Failed";
    return { voltage, storage, outcome, success: outcome === "Successful" };
  }

  function updatePhonePosition() {
    const distance = Number(slider.value);
    const left = 4 + ((MAX_DISTANCE_CM - distance) / MAX_DISTANCE_CM) * 44;
    stage.style.setProperty("--sergio-left", `${left}%`);
    distanceOutput.textContent = `${distance} cm`;
  }

  function resetProcess() {
    processNodes.forEach(node => node.classList.remove("active", "done", "failed"));
    energyPath.classList.remove("running", "success", "failure");
    stage.classList.remove("testing", "celebrate");
    stage.style.setProperty("--field-strength", ".28");
    fieldSpark.textContent = "?";
    capacitorFill.style.transitionDuration = "0ms";
    capacitorFill.style.width = "0%";
    displayState.textContent = "Waiting";
  }

  async function animateProcess(distance, reading) {
    resetProcess();
    state.busy = true;
    testButton.disabled = true;
    lifelineButton.disabled = true;
    updateHud();
    setResult("idle", "RUNNING NFC TEST", `${distance} cm experiment in progress…`, "Observe the energy path and storage element. Results remain hidden until the sequence finishes.");
    energyPath.classList.add("running");
    stage.classList.add("testing");
    const visibleStrength = Math.max(.05, reading.voltage / 4.9);
    stage.style.setProperty("--field-strength", String(visibleStrength));
    fieldSpark.textContent = "⚡";

    for (const node of processNodes) {
      node.classList.add("active");
      if (node.dataset.step === "storage") {
        const chargeDuration = 650 + distance * 125;
        capacitorFill.style.transitionDuration = `${reducedMotion ? 50 : chargeDuration}ms`;
        capacitorFill.style.width = `${reading.storage}%`;
        await delay(chargeDuration);
      } else {
        await delay(360);
      }
      node.classList.remove("active");
      node.classList.add("done");
    }

    const displayNode = processNodes.find(node => node.dataset.step === "display");
    if (reading.success) {
      displayState.textContent = "Refreshing";
      energyPath.classList.add("success");
      await delay(420);
      displayState.textContent = "Updated";
    } else {
      displayState.textContent = "No update";
      displayNode?.classList.add("failed");
      energyPath.classList.add("failure");
    }
    state.busy = false;
    testButton.disabled = state.won;
    lifelineButton.disabled = state.won || state.lifelinesRemaining === 0;
    updateHud();
  }

  function addNotebookEntry(distance, reading) {
    if (state.tests.length === 1) notebookBody.replaceChildren();
    const row = document.createElement("tr");
    const values = [state.tests.length, `${distance} cm`, `${reading.voltage.toFixed(2)} V`, `${reading.storage}%`, reading.outcome];
    values.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      if (index === 4) cell.dataset.outcome = reading.outcome.toLowerCase();
      row.appendChild(cell);
    });
    notebookBody.appendChild(row);
  }

  function showEarnedResult(distance, reading) {
    earnedResult.hidden = false;
    resultDistance.textContent = `${distance} cm`;
    resultVoltage.textContent = `${reading.voltage.toFixed(2)} V`;
    resultStorage.textContent = `${reading.storage}%`;
    resultOutcome.textContent = reading.outcome.toUpperCase();
    resultOutcome.dataset.outcome = reading.outcome.toLowerCase();
  }

  function hideRoast() {
    if (state.roastTimer) window.clearTimeout(state.roastTimer);
    document.body.classList.remove("roast-showcase");
    roastReveal.setAttribute("aria-hidden", "true");
  }

  function showRoast() {
    hideRoast();
    const [heading, copy] = ROASTS[(state.attempts - 1) % ROASTS.length];
    roastHeading.textContent = heading;
    roastCopy.textContent = copy;
    roastAttempt.textContent = `Experiment ${state.attempts} recorded`;
    roastReveal.setAttribute("aria-hidden", "false");
    document.body.classList.add("roast-showcase");
    state.roastTimer = window.setTimeout(hideRoast, 2800);
  }

  function hideTagReveal() {
    if (state.revealTimer) window.clearTimeout(state.revealTimer);
    document.body.classList.remove("tag-showcase");
    tagReveal.setAttribute("aria-hidden", "true");
  }

  function showTagReveal() {
    hideRoast();
    hideTagReveal();
    tagEngineerName.textContent = state.player;
    tagReveal.setAttribute("aria-hidden", "false");
    document.body.classList.add("tag-showcase");
    tagRevealClose?.focus();
    state.revealTimer = window.setTimeout(hideTagReveal, 7200);
  }

  function cleanLeaderboard() {
    const raw = readJson(SCORE_KEY, []);
    if (!Array.isArray(raw)) return [];
    const unique = new Map();
    raw.forEach(entry => {
      const player = cleanName(String(entry.player || ""));
      const score = Number(entry.score);
      const attempts = Number(entry.attempts);
      const lifelinesUsed = Number(entry.lifelinesUsed);
      if (!player || !Number.isFinite(score) || !Number.isFinite(attempts) || !Number.isFinite(lifelinesUsed)) return;
      const key = nameKey(player);
      const safe = { player, score: Math.max(0, Math.round(score)), attempts: Math.max(1, Math.round(attempts)), lifelinesUsed: Math.max(0, Math.min(3, Math.round(lifelinesUsed))), updatedAt: Number(entry.updatedAt) || 0 };
      const previous = unique.get(key);
      if (!previous || safe.score > previous.score || (safe.score === previous.score && safe.attempts < previous.attempts)) unique.set(key, safe);
    });
    return [...unique.values()].sort((a, b) => b.score - a.score || a.attempts - b.attempts || a.lifelinesUsed - b.lifelinesUsed || b.updatedAt - a.updatedAt).slice(0, 10);
  }

  function writeLeaderboard(entries) {
    writeJson(SCORE_KEY, entries.slice(0, 10));
  }

  function submitLeaderboard() {
    const key = nameKey(state.player);
    const entries = cleanLeaderboard().filter(entry => nameKey(entry.player) !== key);
    entries.push({ player: state.player, score: currentScore(), attempts: state.attempts, lifelinesUsed: MAX_LIFELINES - state.lifelinesRemaining, updatedAt: Date.now() });
    writeLeaderboard(entries.sort((a, b) => b.score - a.score || a.attempts - b.attempts || a.lifelinesUsed - b.lifelinesUsed || b.updatedAt - a.updatedAt));
    state.leaderboardSubmitted = true;
    renderLeaderboard();
  }

  function renderLeaderboard() {
    const entries = cleanLeaderboard();
    writeLeaderboard(entries);
    leaderboardBody.replaceChildren();
    if (!entries.length) {
      const row = document.createElement("tr");
      row.className = "leaderboard-empty";
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "No completed investigations yet. The first successful engineer takes the crown.";
      row.appendChild(cell);
      leaderboardBody.appendChild(row);
      return;
    }
    entries.forEach((entry, index) => {
      const row = document.createElement("tr");
      if (index === 0) row.className = "leaderboard-champion";
      const values = [index + 1, entry.player, entry.score, `${entry.attempts} ${entry.attempts === 1 ? "attempt" : "attempts"}`, `${entry.lifelinesUsed} ${entry.lifelinesUsed === 1 ? "hint" : "hints"}`];
      values.forEach((value, columnIndex) => {
        const cell = document.createElement("td");
        if (index === 0 && columnIndex === 1) {
          const crown = document.createElement("span");
          crown.className = "leaderboard-crown";
          crown.setAttribute("aria-label", "Leaderboard champion");
          crown.textContent = "♛";
          const name = document.createElement("strong");
          name.textContent = String(value);
          cell.append(crown, name);
        } else {
          cell.textContent = String(value);
        }
        row.appendChild(cell);
      });
      leaderboardBody.appendChild(row);
    });
  }

  async function runTest() {
    if (!state.player || state.busy || state.won) return;
    const distance = Number(slider.value);
    state.attempts += 1;
    const reading = simulateReading(distance, state.attempts);
    state.tests.push({ distance, ...reading });
    updateHud();
    await animateProcess(distance, reading);
    addNotebookEntry(distance, reading);
    showEarnedResult(distance, reading);

    if (reading.success) {
      state.lockedTimePenalty = elapsedPenalty();
      state.won = true;
      window.clearInterval(state.scoreTimer);
      testButton.disabled = true;
      lifelineButton.disabled = true;
      stage.classList.add("celebrate");
      setResult("win", "SWINGTAG UPDATE SUCCESSFUL", `${distance} cm experiment completed the update.`, "The storage threshold was reached, the regulator activated, the STM32 powered and the e-paper refreshed.");
      challengeCard.hidden = false;
      challengeCard.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
      submitLeaderboard();
      showTagReveal();
    } else {
      state.unsuccessful += 1;
      setResult(reading.outcome === "Partial" ? "partial" : "miss", reading.outcome === "Partial" ? "PARTIAL ENERGY" : "INSUFFICIENT ENERGY", `${distance} cm experiment recorded.`, "Use the evidence in your notebook to choose the next test condition.");
      showRoast();
    }
    updateHud();
  }

  function useLifeline() {
    if (!state.player || state.busy || state.won || state.lifelinesRemaining === 0) return;
    const hintIndex = MAX_LIFELINES - state.lifelinesRemaining;
    state.lifelinesRemaining -= 1;
    lifelineHint.hidden = false;
    lifelineHint.innerHTML = "";
    const label = document.createElement("strong");
    label.textContent = `Lifeline ${hintIndex + 1}`;
    const copy = document.createElement("p");
    copy.textContent = HINTS[hintIndex];
    lifelineHint.append(label, copy);
    if (state.lifelinesRemaining === 0) {
      const exhausted = document.createElement("span");
      exhausted.textContent = "NO LIFELINES REMAINING";
      lifelineHint.appendChild(exhausted);
      lifelineButton.disabled = true;
      lifelineButton.textContent = "No lifelines remaining";
    }
    updateHud();
  }

  function startGame() {
    const cleaned = cleanName(playerName.value);
    if (!cleaned || cleaned.length < 2) {
      nameError.textContent = "Enter a valid engineer name with at least two characters.";
      playerName.focus();
      return;
    }
    playerName.value = cleaned;
    state.player = cleaned;
    state.startedAt = Date.now();
    nameError.textContent = "";
    gameStart.hidden = true;
    experimentControls.hidden = false;
    activePlayer.textContent = cleaned;
    state.scoreTimer = window.setInterval(updateHud, 1000);
    updateHud();
    slider.focus();
  }

  function finishChallenge(skipped = false) {
    challengeChoices.disabled = true;
    submitChallengeButton.disabled = true;
    skipChallengeButton.disabled = true;
    if (skipped) challengeFeedback.textContent = "Bonus skipped. Your experimental result remains on the leaderboard.";
    takeawayCard.hidden = false;
    submitLeaderboard();
    updateHud();
  }

  function submitChallenge() {
    if (state.challengeAnswered) return;
    const selected = document.querySelector('input[name="interpretation"]:checked');
    if (!selected) {
      challengeFeedback.textContent = "Choose one interpretation before submitting.";
      return;
    }
    state.challengeAnswered = true;
    if (selected.value === "c") {
      state.challengeBonus = 100;
      challengeFeedback.textContent = "Correct — 100 bonus points awarded.";
      challengeFeedback.className = "challenge-feedback correct";
    } else {
      challengeFeedback.textContent = "Not quite. Compare the tested distances and stored-energy results in your notebook.";
      challengeFeedback.className = "challenge-feedback incorrect";
    }
    finishChallenge(false);
  }

  function resetGame() {
    window.clearInterval(state.scoreTimer);
    hideTagReveal();
    hideRoast();
    Object.assign(state, {
      player: "", startedAt: 0, attempts: 0, unsuccessful: 0, lifelinesRemaining: MAX_LIFELINES,
      tests: [], won: false, busy: false, challengeBonus: 0, challengeAnswered: false,
      leaderboardSubmitted: false, lockedTimePenalty: null, revealTimer: null, roastTimer: null, scoreTimer: null
    });
    gameStart.hidden = false;
    experimentControls.hidden = true;
    playerName.value = "";
    nameError.textContent = "";
    slider.value = "4";
    earnedResult.hidden = true;
    testButton.disabled = false;
    lifelineHint.hidden = true;
    lifelineHint.replaceChildren();
    lifelineButton.disabled = false;
    lifelineButton.textContent = "Use a lifeline";
    challengeCard.hidden = true;
    takeawayCard.hidden = true;
    challengeFeedback.textContent = "";
    challengeFeedback.className = "challenge-feedback";
    challengeChoices.disabled = false;
    submitChallengeButton.disabled = false;
    skipChallengeButton.disabled = false;
    document.querySelectorAll('input[name="interpretation"]').forEach(input => { input.checked = false; });
    notebookBody.innerHTML = '<tr class="notebook-empty"><td colspan="5">No experiments recorded yet.</td></tr>';
    setResult("idle", "CHOOSE DISTANCE", "The system is ready.", "Select an untested or previously tested distance, then run the NFC experiment.");
    resetProcess();
    updatePhonePosition();
    updateHud();
    playerName.focus();
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }

  slider.addEventListener("input", updatePhonePosition);
  startButton.addEventListener("click", startGame);
  playerName.addEventListener("keydown", event => { if (event.key === "Enter") startGame(); });
  testButton.addEventListener("click", runTest);
  lifelineButton.addEventListener("click", useLifeline);
  submitChallengeButton.addEventListener("click", submitChallenge);
  skipChallengeButton.addEventListener("click", () => { if (!state.challengeAnswered) { state.challengeAnswered = true; finishChallenge(true); } });
  playAgainButton.addEventListener("click", resetGame);
  tagRevealClose?.addEventListener("click", hideTagReveal);
  tagReveal?.addEventListener("click", event => { if (event.target === tagReveal) hideTagReveal(); });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && tagReveal.getAttribute("aria-hidden") === "false") hideTagReveal(); });

  resetProcess();
  updatePhonePosition();
  updateHud();
  renderLeaderboard();
})();
