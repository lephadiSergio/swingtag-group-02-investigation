(() => {
  const slider = document.getElementById("distanceSlider");
  const distanceOutput = document.getElementById("distanceOutput");
  const signalOutput = document.getElementById("signalOutput");
  const attemptOutput = document.getElementById("attemptOutput");
  const testButton = document.getElementById("testDistanceBtn");
  const resetButton = document.getElementById("resetGameBtn");
  const result = document.getElementById("gameResult");
  const playerName = document.getElementById("playerName");
  const stage = document.getElementById("gameStage");
  const sergio = document.getElementById("sergioCharacter");
  const fieldSpark = document.getElementById("fieldSpark");
  const leaderboardBody = document.getElementById("leaderboardBody");
  const tagReveal = document.getElementById("tagReveal");
  const tagEngineerName = document.getElementById("tagEngineerName");

  if (!slider || !testButton || !leaderboardBody) return;

  const STORAGE_KEY = "swingtag-nfc-leaderboard-v1";
  const OPTIMAL_MIN = 1.5;
  const OPTIMAL_MAX = 2.0;
  const COUPLING_UNLOCK = 87;
  const TAG_REVEAL_MS = 10000;
  let attempts = 0;
  let roundStartedAt = Date.now();
  let roundWon = false;
  let revealTimer = null;

  const roasts = {
    contact: [
      "Easy, chief — that is an NFC phone, not a tag-stamping machine.",
      "Sergio nearly NFC-slapped the e-paper. Masixole requests personal space.",
      "At this distance the protocol is called BONK, not NFC."
    ],
    close: [
      "So close! Literally. Back up before the phone and tag exchange insurance details.",
      "Excellent enthusiasm, questionable spacing. Give the magnetic field a tiny runway.",
      "The coupling is keen, but the hardware is now in a committed relationship. Move back a little."
    ],
    medium: [
      "The tag can feel the vibes, but the update is still buffering emotionally.",
      "Almost useful. The magnetic field sent a polite request: please move closer.",
      "Close enough for conversation, not close enough for reliable coupling."
    ],
    far: [
      "That is NFC, not Wi-Fi, legend. Bring the phone back from the next suburb.",
      "Masixole is holding a tag, not a satellite dish. Move closer.",
      "The magnetic field has filed a missing-person report for Sergio's phone."
    ]
  };

  function randomLine(group) {
    const lines = roasts[group];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function signalFor(distance) {
    if (distance < OPTIMAL_MIN) {
      return Math.round(72 + (distance / OPTIMAL_MIN) * 20);
    }
    if (distance <= OPTIMAL_MAX) {
      const centreOffset = Math.abs(distance - 1.75) / .25;
      return Math.round(100 - Math.min(1, centreOffset) * 8);
    }
    return Math.max(0, Math.round(92 - ((distance - OPTIMAL_MAX) / (15 - OPTIMAL_MAX)) * 92));
  }

  function updateScene() {
    const distance = Number(slider.value);
    const signal = signalFor(distance);
    const left = 4 + ((15 - distance) / 15) * 44;
    distanceOutput.textContent = distance.toFixed(1);
    signalOutput.textContent = `${signal}%`;
    stage.style.setProperty("--sergio-left", `${left}%`);
    stage.style.setProperty("--field-strength", String(Math.max(.08, signal / 100)));
    fieldSpark.textContent = signal >= 75 ? "⚡" : signal >= 35 ? "·" : "×";
  }

  function setResult(state, label, heading, copy) {
    result.className = `game-result ${state}`;
    result.querySelector("span").textContent = label;
    result.querySelector("strong").textContent = heading;
    result.querySelector("p").textContent = copy;
  }

  function readScores() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeScores(scores) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores.slice(0, 8)));
    } catch {
      // The game still works if browser storage is unavailable.
    }
  }

  function renderLeaderboard() {
    const scores = readScores();
    leaderboardBody.replaceChildren();
    if (!scores.length) {
      const row = document.createElement("tr");
      row.className = "leaderboard-empty";
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "No champions yet. Be the first person to find the sweet spot.";
      row.appendChild(cell);
      leaderboardBody.appendChild(row);
      return;
    }

    scores.forEach((entry, index) => {
      const row = document.createElement("tr");
      [index + 1, entry.name, entry.score, `${entry.distance.toFixed(1)} cm`, entry.attempts].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });
      leaderboardBody.appendChild(row);
    });
  }

  function saveWin(distance) {
    const elapsedSeconds = Math.floor((Date.now() - roundStartedAt) / 1000);
    const score = Math.max(10, 100 - (attempts - 1) * 15 - Math.floor(elapsedSeconds / 8) * 2);
    const name = playerName.value.trim().slice(0, 18) || "Anonymous Engineer";
    const scores = readScores();
    scores.push({ name, score, distance, attempts, timestamp: Date.now() });
    scores.sort((a, b) => b.score - a.score || a.attempts - b.attempts || a.timestamp - b.timestamp);
    writeScores(scores);
    renderLeaderboard();
    return score;
  }

  function hideTagReveal() {
    if (revealTimer) window.clearTimeout(revealTimer);
    revealTimer = null;
    stage.classList.remove("tag-showcase");
    tagReveal.setAttribute("aria-hidden", "true");
  }

  function showTagReveal(name) {
    hideTagReveal();
    tagEngineerName.textContent = name;
    tagReveal.setAttribute("aria-hidden", "false");
    stage.classList.add("tag-showcase");
    revealTimer = window.setTimeout(hideTagReveal, TAG_REVEAL_MS);
  }

  function testDistance() {
    if (roundWon) {
      setResult("win", "ROUND COMPLETE", "You already found the sweet spot.", "Start a new round if you want another place on the leaderboard.");
      return;
    }

    attempts += 1;
    attemptOutput.textContent = String(attempts);
    const distance = Number(slider.value);
    const coupling = signalFor(distance);

    if (distance >= OPTIMAL_MIN && distance <= OPTIMAL_MAX && coupling >= COUPLING_UNLOCK) {
      roundWon = true;
      const score = saveWin(distance);
      const name = playerName.value.trim().slice(0, 18) || "Anonymous Engineer";
      setResult("win", "3D TAG UNLOCKED", `${distance.toFixed(1)} cm · ${coupling}% — SwingTag says yes!`, `You found the measured 1.5–2.0 cm window in ${attempts} ${attempts === 1 ? "try" : "tries"}. Score: ${score}/100. Your name is refreshing on the tag for 10 seconds.`);
      stage.classList.remove("celebrate");
      void stage.offsetWidth;
      stage.classList.add("celebrate");
      fieldSpark.textContent = "⚡";
      showTagReveal(name);
      return;
    }

    if (distance < .5) {
      setResult("miss", "TOO CLOSE", `${distance.toFixed(1)} cm — hardware cuddle detected.`, randomLine("contact"));
    } else if (distance < OPTIMAL_MIN) {
      setResult("miss", "A LITTLE TOO CLOSE", `${distance.toFixed(1)} cm — back up slightly.`, randomLine("close"));
    } else if (distance <= 5) {
      setResult("miss", "NEAR, BUT NOT OPTIMAL", `${distance.toFixed(1)} cm — move closer.`, randomLine("medium"));
    } else {
      setResult("miss", "TOO FAR", `${distance.toFixed(1)} cm — coupling has left the chat.`, randomLine("far"));
    }
  }

  function resetRound() {
    attempts = 0;
    roundWon = false;
    roundStartedAt = Date.now();
    slider.value = "7.5";
    attemptOutput.textContent = "0";
    stage.classList.remove("celebrate");
    hideTagReveal();
    setResult("idle", "READY", "Find the NFC sweet spot.", "Adjust the slider, then test your distance. The game will explain what the result means.");
    updateScene();
  }

  slider.addEventListener("input", updateScene);
  testButton.addEventListener("click", testDistance);
  resetButton.addEventListener("click", resetRound);
  updateScene();
  renderLeaderboard();
})();
