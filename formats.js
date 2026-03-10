/**
 * formats.js
 * Game type definitions, format metadata, and per-unit simulation functions.
 * Loaded before simulator.js.
 */

// ---------------------------------------------------------------------------
// Format configurations
// ---------------------------------------------------------------------------

const FORMAT_CONFIGS = {
  nlhe_cash: {
    label:          'NLHE Cash',
    unitLabel:      'Hands',
    pluralUnit:     'hands',
    playersPerTable: 6,
    volatility:     1.0,
    edgeRealization: 1.0,
    hasBigSwings:   false,
    bigSwingFreq:   0,
    bigSwingMult:   1,
  },
  spin_go: {
    label:           'Spin & Go',
    unitLabel:       'Tournaments',
    pluralUnit:      'tournaments',
    playersPerTable: 3,
    volatility:      1.35,
    edgeRealization: 1.15,
    hasBigSwings:    false,
    bigSwingFreq:    0,
    bigSwingMult:    1,
  },
  plo_cash: {
    label:           'PLO Cash',
    unitLabel:       'Hands',
    pluralUnit:      'hands',
    playersPerTable: 6,
    volatility:      1.6,
    edgeRealization: 0.9,
    hasBigSwings:    true,
    bigSwingFreq:    0.1,
    bigSwingMult:    3.0,
  },
  poker_match: {
    label:           'Poker Match Beginner',
    unitLabel:       'Matches',
    pluralUnit:      'matches',
    playersPerMatch: 2,
    volatility:      0.8,
    edgeRealization: 0.5,   // intentionally low — format compresses edge
    edgeCompression: 0.4,
    hasBigSwings:    false,
    bigSwingFreq:    0,
    bigSwingMult:    1,
  },
};

// ---------------------------------------------------------------------------
// Base win probability (shared across all formats)
// ---------------------------------------------------------------------------

/**
 * Compute base win probability from a skill difference.
 *
 * Formula: 0.5 − (opponentSkill − playerSkill) / scalingFactor
 * Clamped to [0.05, 0.95].
 *
 * @param {number} playerSkill
 * @param {number} opponentSkill
 * @param {number} scalingFactor
 * @returns {number}
 */
function baseWinProbability(playerSkill, opponentSkill, scalingFactor) {
  const raw = 0.5 - (opponentSkill - playerSkill) / scalingFactor;
  return Math.min(Math.max(raw, 0.05), 0.95);
}

// ---------------------------------------------------------------------------
// Per-unit simulation functions
// ---------------------------------------------------------------------------

/**
 * Simulate one hand for NLHE Cash or PLO Cash.
 * Returns the bankroll delta (positive = win, negative = loss).
 *
 * @param {number} winProb      - Base win probability for this hand
 * @param {Object} formatConfig - Entry from FORMAT_CONFIGS
 * @param {number} stake        - Big blind size
 * @returns {number} delta
 */
function simulateCashHand(winProb, formatConfig, stake) {
  const { edgeRealization, volatility, hasBigSwings, bigSwingFreq, bigSwingMult } = formatConfig;

  // Apply format-level edge realization (PLO compresses, spin_go expands)
  const effectiveWinProb = 0.5 + (winProb - 0.5) * edgeRealization;
  const won = Math.random() < effectiveWinProb;

  // PLO big-swing logic: occasional outsized pot
  let swingMult = volatility;
  if (hasBigSwings && Math.random() < bigSwingFreq) {
    swingMult = volatility * bigSwingMult;
  }

  return won ? stake * swingMult : -(stake * swingMult);
}

/**
 * Simulate one Spin & Go tournament (3-player).
 * Returns the net delta (prize received minus buy-in paid).
 *
 * Simplified finish model:
 *   - Stronger player more likely to finish 1st
 *   - Prize split: 1st ≈ 70%, 2nd ≈ 30%, 3rd = 0
 *
 * @param {number} winProb       - Base win probability
 * @param {number} buyIn         - Cost to enter
 * @param {number} prizeMultiplier - Prize pool = buyIn × 3 × multiplier
 * @returns {number} delta
 */
function simulateSpinGoTournament(winProb, buyIn, prizeMultiplier) {
  const cfg = FORMAT_CONFIGS.spin_go;
  const adjustedWinProb = 0.5 + (winProb - 0.5) * cfg.edgeRealization;
  const totalPool = buyIn * 3 * prizeMultiplier;
  const prize1    = totalPool * 0.70;
  const prize2    = totalPool * 0.30;

  // Finish probabilities: skill-weighted but within [0.05, 0.90] bounds
  const p1 = clamp(adjustedWinProb * 0.60, 0.05, 0.90);
  const p2 = clamp((1 - p1) * 0.45,        0.05, 0.90);

  const r = Math.random();
  if (r < p1)      return prize1 - buyIn;   // 1st place
  if (r < p1 + p2) return prize2 - buyIn;   // 2nd place
  return -buyIn;                             // 3rd place (bust)
}

/**
 * Simulate one Poker Match Beginner match (best of 3 rounds).
 *
 * The skill edge is compressed by edgeCompression to reflect:
 *   - Redraw mechanic
 *   - Fixed bet sizing
 *   - No raises
 *   - Short format and reduced strategic leverage
 *
 * @param {number} winProb       - Base win probability
 * @param {number} matchCost     - Cost if player loses
 * @param {number} matchReward   - Net profit if player wins
 * @param {number} edgeCompression - Fraction of edge to preserve (e.g. 0.4)
 * @returns {number} delta
 */
function simulatePokerMatch(winProb, matchCost, matchReward, edgeCompression) {
  // Compress the skill edge so weaker players survive longer
  const roundWinProb = 0.5 + (winProb - 0.5) * edgeCompression;

  // Best-of-3: first to win 2 rounds wins the match
  let playerRounds = 0, opponentRounds = 0;
  while (playerRounds < 2 && opponentRounds < 2) {
    if (Math.random() < roundWinProb) playerRounds++;
    else opponentRounds++;
  }

  return playerRounds === 2 ? matchReward : -matchCost;
}
