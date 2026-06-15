# FocusLog
**Advanced, Algorithmically Driven Time-Tracking for Complex STEM Workflows**

FocusLog is not a simple Pomodoro timer. It is a local-first, mathematically grounded productivity suite built specifically for individuals performing intense, high-friction cognitive work (mathematics, physics, software engineering, thesis writing). It abandons fixed-interval timers in favor of modeling your actual *Cognitive Expenditure* and dynamically intervening before your working memory collapses.

---

## The Cognitive Science Engine

Standard time trackers treat reading a textbook identically to deriving a complex equation. FocusLog uses **Epistemic Tracking** to distinguish between the types of mental models you are employing. 

### Epistemic Stances & Weights
When starting a session, you select your current cognitive "stance" (which you can hot-swap via keyboard shortcuts during the session):
- **Ingestion (Weight: 0.8):** Reading papers, scanning documentation, watching lectures. A low-friction state focused on passive schema building.
- **Symbol Manipulation (Weight: 1.5):** Heavy mathematical derivations, writing complex algorithms, evaluating formal systems. A high-friction state requiring massive working memory load.
- **Sense-Making (Weight: 1.2):** Debugging, mapping new concepts, structural outlining, sanity-checking. Medium friction.
- **Translation (Weight: 1.3):** Converting conceptual models to prose, writing a thesis, or mapping physics to code. Medium-high friction.

### Focus Capacity ($\tau$) and Hazard Rates ($\lambda$)
Every time you get distracted or stuck, you pause the timer to log **Cognitive Friction**. The internal `AnalyticsEngine` runs continuous survival analysis (using Kaplan-Meier curves and Phase Space modeling) against your friction logs. 

It calculates your empirical **Focus Capacity limit ($\tau$)**—your true stamina limit for a specific topic. As you work, your **Cumulative Cognitive Expenditure ($E$)** rises based on the stance weights, and your **Remaining Capacity ($C(t)$)** drains exponentially. 

When your capacity drops critically low, the system triggers a **Zeigarnik Intervention**, forcing a contextual break before you exhaust your working memory.

### Algorithmic Interleaving & Spaced Retrieval
Instead of guessing what to study next, FocusLog maintains a dynamic Priority Queue based on:
1. **Time Decay:** Topics neglected the longest surface first.
2. **Historical Friction:** Topics that caused high distraction densities last time require spaced review.
3. **Cognitive Distance:** The algorithm prevents you from doing back-to-back heavy Symbol Manipulation sessions.

Returning to an old topic triggers an **Entry Ticket**. The timer locks until you write a 1-2 sentence schema summary based on the last known friction state, engaging active spaced retrieval. Your *Retrieval Latency* is tracked to mathematically prove your retention.

---

## Installation (Linux)

FocusLog is completely local and runs on a lightweight Express/Socket.io backend with a Vite + React frontend. 

### Prerequisites
- Node.js (v18+)
- NPM

### Quick Setup
Clone the repository and run the automated installer script:
```bash
git clone https://github.com/yourusername/FocusLog.git
cd FocusLog
./install.sh
```
The installer will:
1. Install server dependencies.
2. Install client dependencies and compile the production React build.
3. Create a `.desktop` entry so you can launch FocusLog directly from your application menu.

*For Windows/Mac:* Simply run `npm install` in both the `/server` and `/client` directories. Run `npm run build` inside `/client`. Then start the server using `node server/index.js`.

---

## Running the App
Once installed, you can launch FocusLog from your Application Menu, or run the background script manually:
```bash
./run.sh
```
This will start the local server on `http://localhost:3001` and open it in your browser. 
You can access this URL from any device on your Local Area Network (e.g. your phone or tablet) to use it as a remote control timer!

To make the server start silently on boot (Linux only), run:
```bash
./autostart.sh
```

---

## Global Hotkeys
FocusLog is designed to be completely unobtrusive. During an active focus session, you can trigger essential state changes without touching your mouse:

- `1`: Switch stance to **Ingestion**
- `2`: Switch stance to **Symbol Manipulation**
- `3`: Switch stance to **Sense-Making**
- `4`: Switch stance to **Translation**
- `f` or `F`: **Log Friction** (Immediately pauses the timer and prompts you to log what is blocking you).

---

## Customization & Aesthetics
FocusLog features a premium, glassmorphic UI that is fully customizable. Click the **Settings (Gear Icon)** and navigate to **Themes & UI**:
- **Backgrounds:** Select from curated minimalist wallpapers or paste any direct URL to a custom web image.
- **Accent Colors:** Use the visual spectrum slider or quick-select swatches to globally theme the interface.
- **Timer Faces:** Cycle between Massive Digital Text, Circular Progress, Analog Sweeping Hands, or a Linear Drain bar.
- **Daily Sector Chart:** Toggle a beautiful multi-level sunburst chart on your homepage that breaks down your day by Subject (inner ring) and Cognitive Stance (outer ring).

---

## Privacy
Your data never leaves your machine. Everything is securely saved locally in the `data/focus_data.json` database. You can export, import, or completely wipe this database from the Settings menu at any time.
