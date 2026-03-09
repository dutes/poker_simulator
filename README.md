# ♠ Poker Ecosystem Simulator

A browser-based Monte Carlo simulation tool that models poker player outcomes across different matchmaking scenarios. Adjust skill levels, bankroll sizes, and matchmaking strategies to see how they affect survival rates and bankroll trajectories.

---

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Option 1 – Open Directly in Browser](#option-1--open-directly-in-browser)
  - [Option 2 – Local Web Server (Recommended)](#option-2--local-web-server-recommended)
- [Using the Simulator](#using-the-simulator)
  - [Simulation Parameters](#simulation-parameters)
  - [Matchmaking Modes](#matchmaking-modes)
  - [Running a Simulation](#running-a-simulation)
- [Understanding the Results](#understanding-the-results)
  - [Survival Curve](#survival-curve)
  - [Average Bankroll Trajectory](#average-bankroll-trajectory)
  - [Bust Rate Comparison](#bust-rate-comparison)
- [How the Simulation Works](#how-the-simulation-works)
- [Project Structure](#project-structure)

---

## Features

- **Monte Carlo simulations** – Run hundreds to thousands of independent player simulations for statistically robust results.
- **Four matchmaking modes** – Model random pools, skill-banded matchmaking, beginner pools, and short-match formats.
- **Side-by-side comparison** – Plot all four modes at once to see how matchmaking strategy changes outcomes.
- **Interactive controls** – Adjust bankroll, blind size, session length, and more through real-time sliders.
- **Three output charts** – Survival curve, bankroll trajectory, and bust-rate bar chart rendered with Chart.js.
- **No installation required** – Pure HTML/JavaScript; runs entirely in the browser with no build step.

---

## Getting Started

### Option 1 – Open Directly in Browser

The simplest way to run the simulator is to open `index.html` directly in any modern browser (Chrome, Firefox, Edge, Safari):

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Windows – double-click index.html in File Explorer
# or run from PowerShell:
start index.html
```

The simulation runs automatically on load using the default parameters. No internet connection is required; Chart.js is bundled locally.

### Option 2 – Local Web Server (Recommended)

Serving the files through a local web server avoids any browser restrictions on local file access and more closely matches a production environment.

**Python 3**
```bash
python -m http.server 8000
```

**Python 2**
```bash
python -m SimpleHTTPServer 8000
```

**Node.js**
```bash
npx http-server
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

---

## Using the Simulator

### Simulation Parameters

All parameters are controlled through sliders in the left panel. Changes take effect when you click **Run Simulation**.

| Parameter | Range | Default | Description |
|---|---|---|---|
| **Starting Bankroll** | $50 – $2,000 | $500 | The amount of chips each simulated player starts with. |
| **Big Blind** | $1 – $50 | $5 | The cost (and reward) per hand. Larger values increase volatility. |
| **Hands per Session** | 10 – 200 | 50 | How many hands are played before a new opponent is drawn. |
| **Sessions to Simulate** | 5 – 100 | 20 | Total sessions played; maximum hands = hands × sessions. |
| **Monte Carlo Runs** | 500 – 5,000 | 1,000 | Number of independent player lifetimes simulated. Higher values give smoother, more accurate results at the cost of speed. |
| **Player Pool Spread** | 50 – 1,000 | 500 | Controls the width of the opponent skill distribution. Higher values mean a wider range of opponents. |

Two values are fixed internally:

| Parameter | Value | Description |
|---|---|---|
| **Player Skill** | 1,000 | Baseline skill rating for the simulated player. |
| **Scaling Factor** | 2,000 | Governs how strongly a skill gap shifts win probability. A 500-point gap shifts win rate by 25%. |

### Matchmaking Modes

Select a mode from the **Matchmaking Mode** dropdown:

| Mode | Opponent Pool | Description |
|---|---|---|
| **Random Pool** | Mean 1,500 · Std 500 | A broad, experienced-player-skewed pool. The player faces a wide variety of opponents, many stronger than them. |
| **Skill Banding** | Mean = player skill · Std 150 | Narrow skill-matched matchmaking. The player is placed against opponents close to their own rating. |
| **Beginner Pool** | Mean 1,050 · Std 100 | A restricted pool of beginner-level players. Opponents are close in skill to the simulated player. |
| **Short Match Format** | Mean 1,500 · Std 500 | Opponent is redrawn only once per session block rather than per hand, simulating longer head-to-head matches. |
| **── Compare All ──** | All of the above | Runs all four modes in parallel and overlays their results on the same charts for direct comparison. |

### Running a Simulation

1. Select a **Matchmaking Mode** from the dropdown.
2. Adjust any **sliders** as desired.
3. Click the **Run Simulation** button.
4. A progress bar will appear while the simulation runs. Results are rendered automatically when complete.

The simulation also runs automatically when the page first loads, using the default parameters.

---

## Understanding the Results

### Survival Curve

Shows the probability that a player is still in the game (has not busted) after *N* hands. A steeper decline indicates a harsher environment.

- **Y-axis** – Fraction of simulated players still active (0 = all busted, 1 = none busted).
- **X-axis** – Cumulative number of hands played.

### Average Bankroll Trajectory

Tracks the mean bankroll of all surviving players over time. A flat or rising line suggests the matchmaking environment is sustainable for an average player.

- **Y-axis** – Average bankroll in dollars.
- **X-axis** – Cumulative number of hands played.

### Bust Rate Comparison

A bar chart showing the percentage of simulated players who ran out of chips by the end of all sessions. When **Compare All** mode is selected, all four modes are shown side by side. Bust-rate summary pills appear below the chart.

---

## How the Simulation Works

Each Monte Carlo run simulates one player from start to bust (or session end):

1. **Opponent sampling** – Before each hand (or each session, in Short Match mode), an opponent is drawn from a normal distribution defined by the active matchmaking mode. Skill values are clamped to `[500, 3000]`.

2. **Win probability** – Calculated as:
   ```
   win_prob = 0.5 - (opponent_skill - player_skill) / scaling_factor
   ```
   Clamped to `[0.05, 0.95]` so outcomes are never certain.

3. **Hand resolution** – A uniform random number is compared against `win_prob`. A win adds one big blind to the bankroll; a loss subtracts one.

4. **Bust detection** – If the bankroll reaches $0 the player is marked as busted and the run ends.

5. **Aggregation** – After all runs, per-hand survivor counts and bankroll sums are averaged to produce the survival curve and bankroll trajectory used by the charts.

---

## Project Structure

```
poker_simulator/
├── index.html       # Main UI, controls, and layout
├── simulator.js     # Monte Carlo simulation logic (UI-independent)
├── charts.js        # Chart.js rendering helpers
├── style.css        # Dark-theme stylesheet
└── chart.umd.js     # Bundled Chart.js library (no CDN required)
```
