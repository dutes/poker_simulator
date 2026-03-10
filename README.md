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
- [Models, Assumptions & Maths](#models-assumptions--maths)
  - [Monte Carlo Methodology](#1-monte-carlo-methodology)
  - [Skill Rating System](#2-skill-rating-system)
  - [Opponent Skill Sampling](#3-opponent-skill-sampling-normal-distribution)
  - [Matchmaking Policies](#4-matchmaking-policies)
  - [Win Probability Model](#5-win-probability-model)
  - [Game Formats](#6-game-formats)
  - [Aggregation and Output Statistics](#7-aggregation-and-output-statistics)
  - [Summary of Key Assumptions](#8-summary-of-key-assumptions)
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

#### Global Parameters

| Parameter | Range | Default | Description |
|---|---|---|---|
| **Starting Bankroll** | $50 – $2,000 | $500 | The amount of chips each simulated player starts with. If their bankroll reaches zero they are busted and the run ends. |
| **Monte Carlo Runs** | 500 – 5,000 | 1,000 | Number of independent player lifetimes simulated. Higher values give smoother, more accurate results at the cost of speed. |
| **Pool Skill Spread** | 50 – 1,000 | 500 | Controls the width of the opponent skill distribution. Higher values mean you face a wider range of opponents, from beginners to experts. |
| **Scaling Factor** | 500 – 5,000 | 2,000 | Controls how strongly a skill gap shifts win probability. At the default of 2,000 a 500-point skill gap shifts win rate by ±25 percentage points. See [Win Probability Model](#5-win-probability-model) for the full formula. |
| **Player Skill** | 500 – 2,000 | 1,000 | Numeric ability rating for the simulated new player. Opponents are sampled relative to this value by the active matchmaking policy. |

#### Cash Game Settings (NLHE Cash / PLO Cash)

| Parameter | Range | Default | Description |
|---|---|---|---|
| **Big Blind** | $1 – $50 | $5 | The stake per hand. Larger values increase how much you win or lose each hand, raising bankroll volatility and the risk of busting sooner. |
| **Hands per Session** | 20 – 500 | 200 | Maximum number of hands a simulated player can play before the session ends. |

#### Spin & Go Settings

| Parameter | Range | Default | Description |
|---|---|---|---|
| **Buy-in** | $1 – $100 | $10 | Entry fee for each Spin & Go tournament. If your bankroll drops below this amount you are busted. |
| **Tournaments** | 10 – 200 | 50 | Total number of Spin & Go tournaments played per simulation run. |
| **Prize Multiplier** | 0.5 – 3.0 | 1.0 | Scales the total prize pool. A value above 1.0 simulates jackpot spins where the prize pool is larger than the standard 3× buy-in. |

#### Poker Match Settings

| Parameter | Range | Default | Description |
|---|---|---|---|
| **Match Entry Cost** | $1 – $100 | $10 | Amount deducted from your bankroll when you lose a Poker Match. If your bankroll drops below this amount you are busted. |
| **Match Reward** | $1 – $100 | $10 | Amount added to your bankroll when you win a Poker Match. |
| **Matches per Session** | 10 – 200 | 50 | Total number of Poker Matches played per simulation run. |
| **Edge Compression** | 0.10 – 1.00 | 0.40 | Reduces how much your skill advantage affects each round. A value of 0.40 means only 40% of the theoretical skill edge is realised per round — the format's simplified mechanics (fixed bets, redraw, best-of-3) dilute skill expression. See [Poker Match Beginner](#65-poker-match-beginner-best-of-3-fixed-bet-heads-up) for the full model. |

#### Protected Onboarding Setting

| Parameter | Range | Default | Description |
|---|---|---|---|
| **Protected Units** | 1 – 50 | 10 | Number of initial units where you are matched against opponents very close to your own skill level. After this window expires, matchmaking reverts to the Random Pool. |

### Matchmaking Modes

Select a mode from the **Matchmaking Mode** dropdown:

| Mode | Opponent Pool | Description |
|---|---|---|
| **Random Pool** | Mean 1,500 · Std 500 | A broad, experienced-player-skewed pool. The player faces a wide variety of opponents, many stronger than them. |
| **Skill Banding** | Mean = player skill · Std 150 | Narrow skill-matched matchmaking. The player is placed against opponents close to their own rating. |
| **Beginner Pool** | Mean 1,050 · Std 100 | A restricted pool of beginner-level players. Opponents are close in skill to the simulated player. |
| **Protected Onboarding** | Tight around player skill for first N units, then Random Pool | Opponents are tightly matched for a configurable number of initial units (the "protected window"), then matchmaking reverts to Random Pool. The number of protected units is set by the **Protected Units** slider. |
| **── Compare All Policies ──** | All of the above | Runs all four policies in parallel and overlays their results on the same charts for direct comparison. |

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

1. **Opponent sampling** – Before each hand or unit, an opponent is drawn from a normal distribution defined by the active matchmaking policy. Skill values are clamped to `[500, 3000]`.

2. **Win probability** – Calculated as:
   ```
   win_prob = 0.5 - (opponent_skill - player_skill) / scaling_factor
   ```
   Clamped to `[0.05, 0.95]` so outcomes are never certain.

3. **Hand resolution** – A uniform random number is compared against the effective win probability for the format. A win adds to the bankroll; a loss subtracts.

4. **Bust detection** – If the bankroll reaches $0 (cash games) or falls below the buy-in / match cost (tournament formats), the player is marked as busted and the run ends.

5. **Aggregation** – After all runs, per-unit survivor counts and bankroll sums are averaged to produce the survival curve and bankroll trajectory used by the charts.

---

## Models, Assumptions & Maths

This section documents every variable, formula, and modelling assumption used in the simulator.

---

### 1. Monte Carlo Methodology

The simulator uses **Monte Carlo simulation**: it runs the same player scenario hundreds to thousands of times with different random outcomes and aggregates the results to estimate probabilities and expected values.

**Why Monte Carlo?**  
Closed-form solutions for multi-session bankroll ruin with opponent-skill uncertainty are analytically intractable. Monte Carlo trades exactness for tractability — the law of large numbers guarantees that the empirical average converges on the true expectation as the number of runs grows.

**Convergence**  
At 1,000 runs (default), the standard error on a 50% survival probability is roughly ±1.6 percentage points (pp) (95% CI). At 5,000 runs it falls to ±0.7 pp. For decision-support purposes 1,000 runs provides a good balance of accuracy and speed.

---

### 2. Skill Rating System

| Variable | Symbol | Default | Range | Description |
|---|---|---|---|---|
| Player Skill | *S_p* | 1,000 | 500 – 3,000 | Numeric ability rating for the simulated player. Higher = stronger. |
| Opponent Skill | *S_o* | Sampled | 500 – 3,000 | Sampled fresh each hand (or each unit in Poker Match Beginner format). |
| Scaling Factor | *K* | 2,000 | 500 – 4,000 | Controls how steeply a skill gap translates into a win-rate advantage. |
| Player Pool Spread | *σ_pool* | 500 | 50 – 1,000 | Slider-controlled multiplier on the standard deviation of the opponent distribution. |

**Assumptions**
- Skill is one-dimensional and cardinal (differences are meaningful).
- The simulated player's skill does not change over the simulation — no learning or tilt effects are modelled.
- Opponent skill is i.i.d. re-sampled for every unit (hand / tournament / match). The *protected* matchmaking policy modifies *which distribution* the opponent is drawn from (narrower pool for the first *N* units), but does not change the resampling frequency. The *Poker Match Beginner* format applies its own edge-compression at the game-resolution level (see §6.5), which is independent of the matchmaking policy.

---

### 3. Opponent Skill Sampling (Normal Distribution)

Opponent skill is drawn from a **normal (Gaussian) distribution** using the **Box-Muller transform**:

```
Given two independent uniform samples U₁, U₂ ∈ (0, 1]:

Z = sqrt(−2 · ln(U₁)) · cos(2π · U₂)

opponent_skill = mean + std · Z
```

The result is then hard-clamped to **[500, 3,000]** to keep opponents within a realistic skill range.

**Why normal?**  
Real player-pool ratings in ELO-style systems (Chess, backgammon, many video games) approximate a normal distribution around the population mean. A normal model is the standard starting assumption in the absence of platform-specific rating data.

**Spread scaling**  
The raw standard deviation for each policy is multiplied by `poolSpread / 500`, where `poolSpread` is the user-configured pool spread slider value and 500 is the reference (default) spread. This lets the user widen or narrow the opponent pool without changing the underlying policy logic.

---

### 4. Matchmaking Policies

Four policies govern how opponents are drawn. In every case, once sampled the skill value is clamped to **[500, 3,000]**.

#### 4.1 Random Pool

```
opponent_skill ~ N(mean = 1500,  std = 500 · (poolSpread / 500))
```

| Assumption | Rationale |
|---|---|
| Mean of 1,500 | The general player population is significantly more experienced than the default new player (skill 1,000). This reflects the typical online poker ecosystem where casual new players are under-represented relative to regulars. |
| Std of 500 | Covers the full plausible range (500 – 3,000) at ±2 standard deviations; a natural choice for a broad, unfiltered pool. |

This policy models a platform that does **no** skill filtering — the new player is thrown into the full player ecosystem immediately.

#### 4.2 Skill Banding

```
opponent_skill ~ N(mean = player_skill,  std = 150 · (poolSpread / 500))
```

| Assumption | Rationale |
|---|---|
| Mean = player_skill | The band is centred on the player's own rating — the goal of true matchmaking. |
| Std of 150 | Represents a ±1 σ band of roughly ±150 rating points (tight but not exact matching). This mirrors ELO-band sizes used in games like chess.com (typically ±100–200 points). |

This policy models a platform that actively matches players against opponents of similar ability.

#### 4.3 Beginner Pool

```
opponent_skill ~ N(mean = 1050,  std = 100 · (poolSpread / 500))
                 then clamped to [500, 1400]
```

| Assumption | Rationale |
|---|---|
| Mean of 1,050 | Opponents are modelled as marginally stronger than the default new player (1,000) — a realistic "beginner lobby" where most participants are also new or recreational. |
| Std of 100 | Tight distribution reflecting a controlled pool; most opponents are within 100–200 points of each other. |
| Hard cap of 1,400 | Prevents experienced regulars from entering the beginner pool (analogous to platform-enforced experience gates). |

#### 4.4 Protected Onboarding

For the first *protectedCount* units:

```
opponent_skill ~ N(mean = player_skill,  std = 100)
                 then clamped to [500, player_skill + 150]
```

After the protected window expires, the policy falls back to **Random Pool** (same distribution as 4.1).

| Assumption | Rationale |
|---|---|
| Narrow std of 100 | Short protective period needs very tight matching to be meaningful. |
| Upper cap of player_skill + 150 | Opponents can be slightly stronger but not dramatically so — prevents the player being sandbagged while still providing a challenge. |
| Fall-back to Random | The protective period is a temporary scaffold; once a player has a few hands of experience the platform reverts to normal matchmaking. |

---

### 5. Win Probability Model

The **base win probability** for a single unit (hand / tournament entry / match) is computed as a linear function of the skill gap:

```
win_prob_raw = 0.5 − (opponent_skill − player_skill) / scaling_factor
win_prob     = clamp(win_prob_raw, 0.05, 0.95)
```

**Variables**

| Symbol | Description |
|---|---|
| 0.5 | Prior win probability for two equally skilled players. |
| `opponent_skill − player_skill` | Signed skill gap. Positive means opponent is stronger. |
| `scaling_factor` | *K* — the number of rating points required to shift win probability by 100 percentage points. At the default *K* = 2,000, a 500-point skill gap shifts win rate by ±25 pp (from 50% to 25% or 75%). |
| 0.05 / 0.95 clamp | Floor and ceiling preventing degenerate outcomes. Even the weakest player retains a 5% chance to win; even the strongest cannot be certain. |

**Assumptions**

- The relationship between skill gap and win rate is **linear**. This is a simplification — true ELO-based systems use a logistic curve. The linear model is used here because it is transparent, easy to reason about, and produces qualitatively similar results over the realistic rating ranges in this simulator.
- The clamps at 0.05 and 0.95 represent the irreducible element of chance in poker (bad beats, card-luck).
- The scaling factor is a **free parameter** that the user can tune. The default of 2,000 broadly corresponds to an ELO K-factor environment where a 500-point advantage yields roughly a 75% win rate — consistent with empirical chess win-rate tables at similar rating gaps.

**Relationship to ELO**  
For reference, the standard ELO expected score formula is:

```
E_A = 1 / (1 + 10^((R_B − R_A) / 400))
```

At a 400-point ELO gap this gives ≈ 91%; the linear model at *K* = 2,000 gives 70%. The linear model is more conservative (assumes skill differences matter less), which is appropriate for poker where luck variance is higher than in chess.

---

### 6. Game Formats

Each format has parameters that modify how the base win probability translates into a bankroll change.

#### 6.1 Common Concepts

| Concept | Description |
|---|---|
| **Edge Realization** | A multiplier on the skill edge: `effective_win_prob = 0.5 + (win_prob − 0.5) × edgeRealization`. A value below 1.0 compresses the edge (luck dominates); above 1.0 amplifies it (skill dominates). |
| **Volatility** | A per-hand stake multiplier that scales how many big blinds are won or lost on a single hand: `delta = ±stake × volatility`. Applies only to cash-game formats (NLHE Cash and PLO Cash). Spin & Go and Poker Match define this field in their config as a descriptive annotation but do not apply it in their resolution functions (see §§6.4–6.5). |
| **Big Swings** | An optional per-hand event (PLO Cash only) where the pot is multiplied by `bigSwingMult` with probability `bigSwingFreq`, giving `delta = ±stake × volatility × bigSwingMult`. |

#### 6.2 NLHE Cash (No-Limit Hold'em Cash Game)

```
FORMAT_CONFIGS.nlhe_cash = {
  volatility:      1.0,
  edgeRealization: 1.0,
  hasBigSwings:    false,
}
```

**Hand resolution:**

```
effective_win_prob = 0.5 + (win_prob − 0.5) × edgeRealization   // = 0.5 + edge × 1.0 (unchanged)
swing_mult        = volatility                                    // = 1.0 (reference baseline)

delta = won ? +bigBlind × swing_mult : −bigBlind × swing_mult    // = ±bigBlind × 1.0
```

**Assumptions**
- Each hand stakes exactly one big blind (win or lose). This models a simplification of real NLHE where pot sizes vary enormously. The big-blind unit is conventional in win-rate tracking (bb/hand) and gives a meaningful relative measure.
- **Volatility 1.0** is the reference baseline. All other format volatilities are expressed relative to this value.
- Edge realization of 1.0 means NLHE is the reference format: skill expresses itself fully with no format-specific distortion.
- No big-swing events: NLHE pot sizes can be large, but the variance is already captured implicitly through the big-blind scaling and Monte Carlo randomness.

#### 6.3 PLO Cash (Pot-Limit Omaha Cash Game)

```
FORMAT_CONFIGS.plo_cash = {
  volatility:      1.6,
  edgeRealization: 0.9,
  hasBigSwings:    true,
  bigSwingFreq:    0.1,
  bigSwingMult:    3.0,
}
```

**Hand resolution:**

```
effective_win_prob = 0.5 + (win_prob − 0.5) × edgeRealization   // = 0.5 + edge × 0.9

// swing_mult is volatility, scaled up for big-swing hands:
swing_mult = volatility                                          // = 1.6 (normal hand)
if random() < bigSwingFreq (0.10):
  swing_mult = volatility × bigSwingMult                        // = 1.6 × 3.0 = 4.8

delta = won ? +bigBlind × swing_mult : −bigBlind × swing_mult
```

**Assumptions**
- **Volatility 1.6**: PLO is empirically 40–70% more volatile than NLHE due to four hole cards and near-mandatory pot-sized bets. A 1.6× multiplier on the per-hand stake captures this.
- **Edge realization 0.9**: The four-card mechanic and complex board textures mean that PLO decisions require reading a far larger combination space than NLHE, reducing the precision with which any player's technical skill advantage converts into EV per hand. In other words, the high combinatorial complexity adds noise — PLO edge is harder to realise consistently than in NLHE. 0.9 is a conservative compression to reflect this.
- **Big swings (10%, 3×)**: Approximately 1 in 10 PLO hands involves a large pot (set-over-set, flush-over-flush) — a rough empirical estimate based on PLO hand analysis literature. The 3× multiplier makes these pots three times the normal stake, reflecting how quickly PLO pots escalate to stack depth.

#### 6.4 Spin & Go (3-Player Hyper-Turbo Sit & Go)

```
FORMAT_CONFIGS.spin_go = {
  volatility:      1.35,
  edgeRealization: 1.15,
  playersPerTable: 3,
}
```

**Tournament resolution:**

```
prize_pool = buyIn × 3 × prizeMultiplier
prize_1st  = prize_pool × 0.70
prize_2nd  = prize_pool × 0.30

adjusted_win_prob = 0.5 + (win_prob − 0.5) × 1.15

p_1st = clamp(adjusted_win_prob × 0.60, 0.05, 0.90)
p_2nd = clamp((1 − p_1st) × 0.45,      0.05, 0.90)

if random() < p_1st        → delta = prize_1st − buyIn
else if random() < p_1st + p_2nd → delta = prize_2nd − buyIn
else                              → delta = −buyIn
```

**Prize structure assumptions**
- 70 / 30 split for 1st / 2nd reflects the standard PokerStars Spin & Go payout for the base (1×) prize multiplier.
- The 3 × buyIn prize pool (before any multiplier) is the standard Spin & Go structure.
- `prizeMultiplier` models the jackpot spin mechanic: when the wheel lands on a multiplier > 1, the prize pool scales accordingly. Default is 1.0 (no jackpot).

**Finish probability assumptions**
- `p_1st = adjusted_win_prob × 0.60`: A 3-player field means an equal-skill player wins 33% of the time. The formula uses `adjusted_win_prob` (after the 1.15 edge-realization multiplier), not the raw base win probability. At `adjusted_win_prob = 0.50` (equal-skill scenario), `p_1st = 0.30` (≈ 1-in-3), which is exactly correct for a 3-player field. The 0.60 scaling factor maps the usable [0.05, 0.95] probability range down to a realistic 1st-place finish rate for a 3-player field.
- `p_2nd = (1 − p_1st) × 0.45`: Given the player does not finish 1st, they have a slightly-below-even chance of finishing 2nd rather than 3rd, reflecting that stronger players also tend to survive deeper.

**Edge realization 1.15**  
In a hyper-turbo Spin & Go, the shallow starting-stack depth and rapid blind escalation force play into push/fold situations where a skilled player's knowledge of optimal shoving ranges (ICM-adjusted GTO strategy) provides a concrete, quantifiable advantage over recreational players who guess or use intuition. Although reduced stack depth generally lowers the number of post-flop decision points, the remaining decisions are high-leverage all-in spots where edge is concentrated and measurable. The simulator uses 1.15 to reflect this skill amplification relative to the deeper-stacked NLHE cash baseline.

**Volatility 1.35 — metadata only**  
`volatility = 1.35` is stored in the Spin & Go config to record that tournament outcomes are 35% more volatile than NLHE cash on a per-unit basis, reflecting the binary all-or-nothing prize structure. However, `simulateSpinGoTournament` does **not** apply this as a direct stake multiplier. Tournament variance is instead captured *structurally* through the three discrete outcome probabilities (1st / 2nd / 3rd) and the 70/30 prize split: a player who finishes 3rd loses the entire buy-in, while a 1st-place finish can return 2.1× the buy-in (at the base 1× multiplier). This discrete, asymmetric payoff distribution inherently produces higher bankroll variance than a ±1 BB cash outcome without needing an explicit volatility multiplier.

#### 6.5 Poker Match Beginner (Best-of-3 Fixed-Bet Heads-Up)

```
FORMAT_CONFIGS.poker_match = {
  volatility:      0.8,
  edgeRealization: 0.5,
  edgeCompression: 0.4,
  playersPerMatch: 2,
}
```

**Match resolution (best-of-3 rounds):**

```
round_win_prob = 0.5 + (win_prob − 0.5) × edgeCompression
                                        // = 0.5 + edge × 0.4

Play rounds until one player wins 2:
  if random() < round_win_prob → player wins the round
  else                          → opponent wins the round

if player wins match → delta = +matchReward
else                 → delta = −matchCost
```

**Why edge compression?**  
The Poker Match Beginner format deliberately reduces skill expression through several structural constraints:

| Constraint | Effect |
|---|---|
| Fixed bet sizing (no raises) | Removes one of the most powerful skill levers in poker — bet-sizing tells and pressure betting. |
| Redraw mechanic | Reduces positional advantage. |
| Short format | Less time for statistical edge to accumulate; a single lucky hand can swing the match. |
| No pot odds decisions | Reduces advanced decision-tree depth. |

The combined effect is modelled as `edgeCompression = 0.4`: only 40% of the theoretical skill edge is realised. At a 60% base win rate (strong player), the compressed round win probability is `0.5 + 0.10 × 0.4 = 0.54`.

**Best-of-3 amplification**  
Playing best-of-3 rounds instead of a single round amplifies the per-round skill edge via the standard best-of-series probability:

```
For a player with per-round win prob p:
P(win best-of-3) = p² + 2·p²·(1−p) = p²(3 − 2p)

At p = 0.54:  P(win match) ≈ 0.54² × (3 − 2×0.54) ≈ 0.567
```

This is a modest but meaningful improvement over the per-round probability, consistent with the design intent of the format.

**Volatility 0.8 — metadata only**  
`volatility = 0.8` is stored in the Poker Match config to record that the format produces smaller bankroll swings per unit than NLHE cash — a consequence of fixed bet sizing (no large pot escalation) and the short best-of-3 structure. However, `simulatePokerMatch` does **not** apply this as a multiplier. The stake variance is instead captured *directly* by the fixed `matchCost` and `matchReward` parameters, which already encode the exact dollar amounts at risk per match. Applying an additional multiplier would double-count the stake size.

---

### 7. Aggregation and Output Statistics

After all *N* Monte Carlo runs complete, results are aggregated as follows.

**Survival probability at unit *u*:**

```
P_survive(u) = count(runs where busted = false OR unitsSurvived ≥ u) / N
```

**Average bankroll at unit *u*:**

```
avg_bankroll(u) = sum(bankroll[u] for all runs) / N
```

Runs that ended before unit *u* contribute their **final recorded bankroll** (usually $0 for cash games, below-buy-in residual for tournament formats). This means the average bankroll is pulled down by busted players, giving a realistic "fleet average" rather than a survivor bias estimate.

**Bust rate:**

```
bust_rate = count(runs where busted = true) / N × 100%
```

**Retention checkpoints (10, 25, 50 units):**

```
retention[cp] = P_survive(cp)
```

These give a quick read on early, mid, and late-session attrition.

**Chart downsampling:**  
For performance, the per-unit arrays are downsampled to at most 200 chart points using:

```
sampleStep = max(1, floor(maxUnits / 200))
```

This does not affect the numerical statistics — only the visual resolution of the line charts.

---

### 8. Summary of Key Assumptions

| # | Assumption | Impact if wrong |
|---|---|---|
| 1 | Skill gap → win-rate relationship is **linear** | A logistic curve would compress extreme win rates; the linear model slightly over-estimates edge at large skill gaps. |
| 2 | Player skill is **fixed** throughout the simulation | Learning or tilting players would show non-stationary bankroll trajectories. |
| 3 | Opponent skill is **independently resampled** each unit | In reality a player might be seated at the same table for many hands; auto-correlated opponents would reduce effective variance. |
| 4 | Each hand stakes **exactly one big blind** | Real NLHE pots span 0 – 100+ BBs. The BB-per-hand model captures the long-run average but smooths over pot-size variance. |
| 5 | PLO big-swing frequency of **10%** | Derived from qualitative literature; not calibrated to a specific dataset. Adjusting this would change PLO bust rates. |
| 6 | Spin & Go prize split is **70/30** | This matches the standard 1× multiplier PokerStars structure. Jackpot multipliers change the EV distribution significantly. |
| 7 | Poker Match edge compression of **0.4** | A calibration choice, not derived from empirical match data. A higher value would let skill dominate sooner. |
| 8 | Normal distribution for opponent skill | Real player pools may be bimodal (recreational vs. regular) or right-skewed. A normal model is the maximum-entropy assumption. |

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
