/**
 * simulator.js
 * Monte Carlo poker session simulation logic.
 * All simulation logic is isolated from UI and chart concerns.
 */

// ---------------------------------------------------------------------------
// Skill distributions per matchmaking mode
// ---------------------------------------------------------------------------

// Each distribution describes the pool of opponents a new player (skill=1000)
// might face:
//   random   – broad pool skewed toward experienced players (mean 1500 ≈ 50%
//              stronger than new players; std 500 spans the full ecosystem)
//   banding  – narrow band centered on the player's own skill to simulate
//              skill-matched matchmaking (mean = playerSkill, std 150)
//   beginner – capped near the beginner range so new players only meet others
//              at roughly the same level (mean 1050, std 100)
//   short    – identical pool to random but a single opponent is locked in for
//              each session block, simulating short fixed-format matches
const SKILL_DISTRIBUTIONS = {
  random:    { mean: 1500, std: 500 },
  banding:   { mean: 1000, std: 150 },
  beginner:  { mean: 1050, std: 100 },
  short:     { mean: 1500, std: 500 },
};

// DEFAULT_SPREAD is the reference value for the poolSpread UI slider.
// When poolSpread equals DEFAULT_SPREAD the distribution std is unchanged;
// smaller values narrow the field, larger values widen it.
const DEFAULT_SPREAD = 500;

/**
 * Box-Muller transform: returns one normally distributed random number.
 */
function randNormal(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Clamp a value between min and max (inclusive).
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Sample an opponent skill rating based on the selected matchmaking mode.
 *
 * @param {string} mode        - One of: random, banding, beginner, short
 * @param {number} playerSkill - The new player's skill rating (default 1000)
 * @param {number} poolSpread  - Standard deviation modifier for the player pool
 */
function sampleOpponentSkill(mode, playerSkill, poolSpread) {
  const dist = SKILL_DISTRIBUTIONS[mode] || SKILL_DISTRIBUTIONS.random;
  const scaledStd = dist.std * (poolSpread / DEFAULT_SPREAD);

  switch (mode) {
    case 'random':
      return clamp(randNormal(dist.mean, scaledStd), 500, 3000);

    case 'banding':
      // Opponent drawn from a narrow band around the player's own skill
      return clamp(randNormal(playerSkill, scaledStd), 500, 3000);

    case 'beginner':
      // Opponent drawn from a near-beginner distribution
      return clamp(randNormal(dist.mean, scaledStd), 500, 1400);

    case 'short':
      // One opponent is chosen at session start and held for the whole match
      return clamp(randNormal(dist.mean, scaledStd), 500, 3000);

    default:
      return clamp(randNormal(dist.mean, scaledStd), 500, 3000);
  }
}

/**
 * Calculate win probability for a single hand.
 *
 * @param {number} playerSkill   - Player skill rating
 * @param {number} opponentSkill - Opponent skill rating
 * @param {number} scalingFactor - Divisor that controls how much skill matters
 */
function winProbability(playerSkill, opponentSkill, scalingFactor) {
  const skillDifference = opponentSkill - playerSkill;
  const raw = 0.5 - skillDifference / scalingFactor;
  return clamp(raw, 0.05, 0.95);
}

/**
 * Simulate a single player's entire run (multiple sessions until bust or max hands).
 *
 * @param {Object} params
 * @param {number} params.startingBankroll
 * @param {number} params.bigBlind
 * @param {number} params.handsPerSession
 * @param {number} params.maxHands        - Total hands before we call it a run (e.g. handsPerSession * sessions)
 * @param {string} params.mode
 * @param {number} params.poolSpread
 * @param {number} params.playerSkill
 * @param {number} params.scalingFactor
 *
 * @returns {Object} { bankrollHistory: number[], busted: boolean, handsPlayed: number }
 */
function simulateSinglePlayer(params) {
  const {
    startingBankroll,
    bigBlind,
    handsPerSession,
    maxHands,
    mode,
    poolSpread,
    playerSkill,
    scalingFactor,
  } = params;

  let bankroll = startingBankroll;
  const bankrollHistory = [bankroll];
  let handsPlayed = 0;
  let busted = false;

  // For "short" mode we lock in one opponent per session block
  let sessionOpponentSkill = null;

  while (handsPlayed < maxHands && bankroll > 0) {
    // Refresh opponent each session (or per hand for non-short modes)
    if (handsPlayed % handsPerSession === 0) {
      sessionOpponentSkill = sampleOpponentSkill(mode, playerSkill, poolSpread);
    }

    const opponentSkill = mode === 'short' ? sessionOpponentSkill : sampleOpponentSkill(mode, playerSkill, poolSpread);
    const wp = winProbability(playerSkill, opponentSkill, scalingFactor);

    bankroll += Math.random() < wp ? bigBlind : -bigBlind;
    bankroll = Math.max(bankroll, 0); // floor at 0
    handsPlayed++;

    bankrollHistory.push(bankroll);

    if (bankroll === 0) {
      busted = true;
      break;
    }
  }

  return { bankrollHistory, busted, handsPlayed };
}

/**
 * Run a full Monte Carlo simulation for the given parameters.
 *
 * @param {Object} params - See simulateSinglePlayer params plus `numSimulations`
 * @returns {Object} aggregated results suitable for charting
 */
function runSimulation(params) {
  const { numSimulations, maxHands } = params;

  // We collect per-hand data across all simulations
  // bankrollSums[h] = sum of all players' bankroll at hand h
  // survivorCounts[h] = number of players still alive at hand h
  const bankrollSums    = new Float64Array(maxHands + 1);
  const survivorCounts  = new Int32Array(maxHands + 1);

  let bustedCount = 0;
  const bustHandsList = [];

  // Initialise hand 0 for all simulations
  bankrollSums[0]   = params.startingBankroll * numSimulations;
  survivorCounts[0] = numSimulations;

  for (let i = 0; i < numSimulations; i++) {
    const result = simulateSinglePlayer(params);

    if (result.busted) {
      bustedCount++;
      bustHandsList.push(result.handsPlayed);
    }

    // Accumulate per-hand statistics
    for (let h = 1; h <= maxHands; h++) {
      const bankrollAtH = h < result.bankrollHistory.length
        ? result.bankrollHistory[h]
        : result.bankrollHistory[result.bankrollHistory.length - 1];

      bankrollSums[h] += bankrollAtH;

      // Player is still a survivor if they haven't busted yet at hand h
      if (!result.busted || result.handsPlayed > h) {
        survivorCounts[h]++;
      }
    }
  }

  // Build output arrays (sample every N hands to keep chart data manageable)
  const sampleStep = Math.max(1, Math.floor(maxHands / 200));
  const labels = [];
  const survivalProbability = [];
  const averageBankroll = [];

  for (let h = 0; h <= maxHands; h += sampleStep) {
    labels.push(h);
    survivalProbability.push((survivorCounts[h] / numSimulations) * 100);
    averageBankroll.push(bankrollSums[h] / numSimulations);
  }

  const bustRate = (bustedCount / numSimulations) * 100;

  return {
    labels,
    survivalProbability,
    averageBankroll,
    bustRate,
    bustedCount,
    numSimulations,
  };
}

/**
 * Run all four matchmaking modes and return results keyed by mode name.
 * Used for the comparison overlay.
 *
 * @param {Object} baseParams - All params except `mode`
 * @returns {Object} { random, banding, beginner, short }
 */
function runComparisonSimulation(baseParams) {
  const modes = ['random', 'banding', 'beginner', 'short'];
  const results = {};
  for (const mode of modes) {
    results[mode] = runSimulation({ ...baseParams, mode });
  }
  return results;
}
