# SwingTag Investigation Story Site

A static, interactive website for Group 02's SwingTag final-year Electrical Engineering investigation. It presents the investigation question, power-subsystem evolution, current evidence, an interactive energy model and the separation between measured, simulated and assumed values.

## Why this stack
This version uses plain HTML, CSS and JavaScript so it can be hosted directly on GitHub Pages with no build tooling. The same folder can also be deployed on Netlify or Cloudflare Pages. All site paths are relative, so a repository URL such as `https://username.github.io/SwingTag-Investigation/` works correctly.

## Included project evidence

- `assets/swingtag-logo.jpg` - supplied SwingTag logo.
- `assets/step-1-charge-curves.svg` - Version 1 charging comparison from the simulation workspace.
- `assets/ltspice-source/` - project simulation sources retained in the repository for team traceability; the public webpage does not offer them as a download.

Large LTspice `.raw` and `.db` files are deliberately excluded from the website bundle. They remain in the engineering working archive because they are not useful to ordinary site visitors and would make the GitHub repository unnecessarily large.

## Run locally
Open `index.html` directly, or run:

```bash
python -m http.server 8000
```

Then browse to `http://localhost:8000`.

## GitHub Pages deployment
1. Create a GitHub repository, for example `swingtag-investigation`.
2. Upload all files in this folder to the repository root.
3. In GitHub: **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/ (root)`.
6. Save.

## Netlify deployment
You can also drag this folder into Netlify Drop, or connect the GitHub repository to Netlify. Netlify is useful when you want deploy previews for pull requests.

## Content integrity
The site deliberately labels the difference between measured results, simulation results and assumed screening parameters. Do not change assumed values into measured claims unless supported by laboratory evidence.

The current prototype uses a **4700 µF capacitor**. Its displayed **10-15 s charge window** is a practical observation. Before it is promoted to a final measured result, record the initial and final voltage, NFC reader, distance, alignment, number of repeats and uncertainty.

The 0.47 F capacitor remains on the website only as a historical simulation comparison. It is not the currently selected breadboard storage component. The central physical test is whether energy accumulated in the 4700 µF capacitor can pass through the switching and regulation stages and complete one reliable STM32/e-paper update.

## Adding new investigation evidence

1. Add a web-sized SVG, WebP, PNG or JPEG to `assets/`.
2. Add the experiment to the correct chronological stage in `index.html`.
3. State the question, method, important result, limitation and next decision.
4. Label every value as measured, simulated, calculated or assumed.
5. Keep original LTspice, oscilloscope and measurement files in the project evidence archive.

## NFC sweet-spot game and leaderboard

The included game asks visitors to position Sergio's NFC phone relative to the e-paper controller held by Masixole. It uses the team's current target window of approximately **15-20 mm**, limits the slider to **0-20 mm**, and allows only two attempts for each locally recorded name. Coupling is revealed only after a test. Incorrect guesses trigger a large animated roast, while successful guesses are scored by attempts and elapsed time.

A successful attempt inside the target window with at least **87% estimated coupling** triggers a ten-second animated 3D e-paper refresh showing the engineer's entered name. Each attempt also shows an illustrative storage-voltage and energy calculation for the 4700 µF capacitor, plus idealised load-runtime comparisons. These values are deliberately labelled as game estimates and must not be reported as measured RF performance or harvested energy.

The leaderboard uses `localStorage`, so it works immediately on GitHub Pages without a backend. Scores are private to each browser/device. A shared public leaderboard for all visitors requires persistent storage such as Supabase, Firebase, or a small Cloudflare Worker with a database. Do not expose service keys in client-side JavaScript.

The game is educational rather than a substitute for the formal experiment. The investigation must still record the phone/reader model, antenna orientation, exact separation, number of trials, update success and latency.
