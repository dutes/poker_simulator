/**
 * simulator.js
 * Monte Carlo runner and result aggregation.
 * Depends on: matchmaking.js, formats.js (both loaded first).
 */

// ---------------------------------------------------------------------------
// Per-run simulation functions (one player, one full trajectory)
// ---------------------------------------------------------------------------

/**
 * Simulate a single player's run for a cash-game format (NLHE Cash or PLO Cash).
 *
 * @param {Object} params
 * @returns {{ history: number[], busted: boolean, unitsSurvived: number }}
 */
function simulateCashRun(params) {
  const {
    startingBankroll, bigBlind, maxUnits,
    policy, poolSpread, playerSkill, scalingFactor,
    formatKey, protectedCount,
  } = params;

  const formatConfig = FORMAT_CONFIGS[formatKey];
  let bankroll = startingBankroll;
  const history = [bankroll];
  let busted = false;

  for (let u = 0; u < maxUnits; u++) {
    if (bankroll <= 0) { busted = true; break; }
    const opp   = sampleOpponentSkill(policy, playerSkill, poolSpread, u, protectedCount);
    const wp    = baseWinProbability(playerSkill, opp, scalingFactor);
    bankroll    = Math.max(0, bankroll + simulateCashHand(wp, formatConfig, bigBlind));
    history.push(bankroll);
    if (bankroll === 0) { busted = true; break; }
  }

  return { history, busted, unitsSurvived: history.length - 1 };
}

/**
 * Simulate a single player's run for Spin & Go.
 * Player busts when bankroll falls below the buy-in cost.
 */
function simulateSpinGoRun(params) {
  const {
    startingBankroll, buyIn, prizeMultiplier, maxUnits,
    policy, poolSpread, playerSkill, scalingFactor, protectedCount,
  } = params;

  let bankroll = startingBankroll;
  const history = [bankroll];
  let busted = false;

  for (let u = 0; u < maxUnits; u++) {
    if (bankroll < buyIn) { busted = true; break; }
    const opp   = sampleOpponentSkill(policy, playerSkill, poolSpread, u, protectedCount);
    const wp    = baseWinProbability(playerSkill, opp, scalingFactor);
    bankroll    = Math.max(0, bankroll + simulateSpinGoTournament(wp, buyIn, prizeMultiplier));
    history.push(bankroll);
    if (bankroll < buyIn) { busted = true; break; }
  }

  return { history, busted, unitsSurvived: history.length - 1 };
}

/**
 * Simulate a single player's run for Poker Match Beginner.
 * Player busts when bankroll falls below the match entry cost.
 */
function simulatePokerMatchRun(params) {
  const {
    startingBankroll, matchCost, matchReward, maxUnits, edgeCompression,
    policy, poolSpread, playerSkill, scalingFactor, protectedCount,
  } = params;

  let bankroll = startingBankroll;
  const history = [bankroll];
  let busted = false;

  for (let u = 0; u < maxUnits; u++) {
    if (bankroll < matchCost) { busted = true; break; }
    const opp   = sampleOpponentSkill(policy, playerSkill, poolSpread, u, protectedCount);
    const wp    = baseWinProbability(playerSkill, opp, scalingFactor);
    bankroll    = Math.max(0, bankroll + simulatePokerMatch(wp, matchCost, matchReward, edgeCompression));
    history.push(bankroll);
    if (bankroll < matchCost) { busted = true; break; }
  }

  return { history, busted, unitsSurvived: history.length - 1 };
}

/**
 * Route a single-run simulation to the correct format handler.
 */
function simulateSingleRun(formatKey, params) {
  switch (formatKey) {
    case 'nlhe_cash':
    case 'plo_cash':
      return simulateCashRun({ ...params, formatKey });
    case 'spin_go':
      return simulateSpinGoRun(params);
    case 'poker_match':
      return simulatePokerMatchRun(params);
    default:
      return simulateCashRun({ ...params, formatKey: 'nlhe_cash' });
  }
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate an array of single-run results into chart-ready statistics.
 *
 * @param {Object[]} runs          - Array of { history, busted, unitsSurvived }
 * @param {number}   maxUnits      - Maximum unit count for the simulation
 * @param {number}   numSimulations
 * @returns {Object} Aggregated results object
 */
function aggregateResults(runs, maxUnits, numSimulations) {
  const bankrollSums   = new Float64Array(maxUnits + 1);
  const survivorCounts = new Int32Array(maxUnits + 1);
  let bustedCount      = 0;
  let totalUnitsSurvived = 0;

  for (const run of runs) {
    if (run.busted) bustedCount++;
    totalUnitsSurvived += run.unitsSurvived;

    for (let u = 0; u <= maxUnits; u++) {
      // Use last recorded bankroll if the run ended before this unit
      const br = u < run.history.length
        ? run.history[u]
        : run.history[run.history.length - 1];

      bankrollSums[u] += br;

      // Player counts as survivor at unit u if they hadn't busted yet
      if (!run.busted || run.unitsSurvived >= u) {
        survivorCounts[u]++;
      }
    }
  }

  // Downsample to ~200 chart points to keep rendering fast
  const sampleStep = Math.max(1, Math.floor(maxUnits / 200));
  const labels              = [];
  const survivalProbability = [];
  const averageBankroll     = [];

  for (let u = 0; u <= maxUnits; u += sampleStep) {
    labels.push(u);
    survivalProbability.push((survivorCounts[u] / numSimulations) * 100);
    averageBankroll.push(bankrollSums[u] / numSimulations);
  }

  // Exact retention checkpoints (independent of chart downsampling)
  const retention = {};
  for (const cp of [10, 25, 50]) {
    const idx = Math.min(cp, maxUnits);
    retention[cp] = (survivorCounts[idx] / numSimulations) * 100;
  }

  const mid = Math.floor(survivalProbability.length / 2);

  return {
    labels,
    survivalProbability,
    averageBankroll,
    bustRate:           (bustedCount / numSimulations) * 100,
    bustedCount,
    numSimulations,
    avgEndingBankroll:  bankrollSums[maxUnits] / numSimulations,
    avgUnitsSurvived:   totalUnitsSurvived / numSimulations,
    retention,
    survivalAtMidpoint: survivalProbability[mid] || 0,
    survivalAtEnd:      survivalProbability[survivalProbability.length - 1] || 0,
  };
}

// ---------------------------------------------------------------------------
// Public run modes
// ---------------------------------------------------------------------------

/**
 * Run a full Monte Carlo simulation for one format + one policy.
 *
 * @param {Object} params - Includes formatKey, policy, numSimulations, maxUnits, etc.
 * @returns {Object} Aggregated results
 */
function runSimulation(params) {
  const { formatKey, numSimulations, maxUnits } = params;
  const runs = [];
  for (let i = 0; i < numSimulations; i++) {
    runs.push(simulateSingleRun(formatKey, params));
  }
  return aggregateResults(runs, maxUnits, numSimulations);
}

/**
 * Run all 4 matchmaking policies for a single format (Compare Policies mode).
 *
 * @param {Object} baseParams - All params except `policy`
 * @returns {{ random, banding, beginner, protected }}
 */
function runPolicyComparison(baseParams) {
  const policies = ['random', 'banding', 'beginner', 'protected'];
  const results  = {};
  for (const policy of policies) {
    results[policy] = runSimulation({ ...baseParams, policy });
  }
  return results;
}

/**
 * Run all 4 game formats for a single policy (Compare Formats mode).
 * Each format uses its own appropriate unit count.
 *
 * @param {Object} baseParams - All params except `formatKey`
 * @returns {{ nlhe_cash, spin_go, plo_cash, poker_match }}
 */
function runFormatComparison(baseParams) {
  const formats = ['nlhe_cash', 'spin_go', 'plo_cash', 'poker_match'];
  const results = {};
  for (const formatKey of formats) {
    const maxUnits = getDefaultMaxUnits(formatKey, baseParams);
    results[formatKey] = runSimulation({ ...baseParams, formatKey, maxUnits });
  }
  return results;
}

/**
 * Run all 4 game formats × all 4 matchmaking policies (16 simulations total).
 * Returns a nested map: { formatKey: { policyKey: result } }
 *
 * @param {Object} baseParams - All params (formatKey and policy are overridden internally)
 * @returns {Object} Nested results map
 */
function runFullComparison(baseParams) {
  const formats  = ['nlhe_cash', 'spin_go', 'plo_cash', 'poker_match'];
  const policies = ['random', 'banding', 'beginner', 'protected'];
  const results  = {};
  for (const formatKey of formats) {
    // maxUnits depends only on formatKey and format-specific slider values, not on policy
    const maxUnits = getDefaultMaxUnits(formatKey, baseParams);
    results[formatKey] = {};
    for (const policy of policies) {
      results[formatKey][policy] = runSimulation({ ...baseParams, formatKey, maxUnits, policy });
    }
  }
  return results;
}

/**
 * Resolve the max unit count for a format, using params if provided or
 * falling back to the format's sensible default.
 */
function getDefaultMaxUnits(formatKey, params) {
  switch (formatKey) {
    case 'nlhe_cash':
    case 'plo_cash':    return params.handsPerSession  || 200;
    case 'spin_go':     return params.numTournaments   || 50;
    case 'poker_match': return params.numMatches       || 50;
    default:            return 100;
  }
}
