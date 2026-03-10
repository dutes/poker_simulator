/**
 * ui.js
 * DOM wiring, control show/hide, parameter reading, and run orchestration
 * for the Poker Ecosystem Simulator v2.
 * Loaded last — depends on matchmaking.js, formats.js, simulator.js, charts.js.
 */

// ---------------------------------------------------------------------------
// Slider helper
// ---------------------------------------------------------------------------

/**
 * Wire up a range input: update its display label and CSS gradient on change.
 *
 * @param {string}   id       - The input element's id
 * @param {Function} formatFn - Function(value) → display string
 */
function sliderSetup(id, formatFn) {
  const el  = document.getElementById(id);
  if (!el) return null;
  const lbl = document.getElementById(id + 'Val');

  function update() {
    const v   = Number(el.value);
    if (lbl) lbl.textContent = formatFn(v);
    const pct = ((v - el.min) / (el.max - el.min)) * 100;
    el.style.setProperty('--pct', pct + '%');
  }

  el.addEventListener('input', update);
  update(); // initialise label on page load
  return el;
}

function fmtDollar(v)  { return '$' + v; }
function fmtNum(v)     { return v.toLocaleString(); }
function fmtPlain(v)   { return String(v); }
function fmtFixed1(v)  { return (+v).toFixed(1); }
function fmtFixed2(v)  { return (+v).toFixed(2); }

// ---------------------------------------------------------------------------
// Show / hide format-specific control sections
// ---------------------------------------------------------------------------

function showFormatControls(formatKey) {
  const sections = ['cashControls', 'spinGoControls', 'matchControls'];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  if (formatKey === 'nlhe_cash' || formatKey === 'plo_cash') {
    document.getElementById('cashControls').style.display = 'block';
  } else if (formatKey === 'spin_go') {
    document.getElementById('spinGoControls').style.display = 'block';
  } else if (formatKey === 'poker_match') {
    document.getElementById('matchControls').style.display = 'block';
  }
  // 'compare_formats': all format-specific sections stay hidden
}

function showPolicyControls(policy) {
  const el = document.getElementById('protectedControl');
  if (el) el.style.display = (policy === 'protected') ? 'block' : 'none';
}

// ---------------------------------------------------------------------------
// Read all parameters from UI elements
// ---------------------------------------------------------------------------

function getParams() {
  const gameType = document.getElementById('gameType').value;
  const policy   = document.getElementById('policySelect').value;

  const startingBankroll = Number(document.getElementById('startBankroll').value);
  const numSimulations   = Number(document.getElementById('numSimulations').value);
  const poolSpread       = Number(document.getElementById('poolSpread').value);
  const scalingFactor    = Number(document.getElementById('scalingFactor').value);
  const playerSkill      = Number(document.getElementById('playerSkill').value);
  const protectedCount   = Number(document.getElementById('protectedCount').value);

  // Cash-game controls
  const bigBlind        = Number(document.getElementById('bigBlind').value);
  const handsPerSession = Number(document.getElementById('handsPerSession').value);

  // Spin & Go controls
  const buyIn           = Number(document.getElementById('buyIn').value);
  const numTournaments  = Number(document.getElementById('numTournaments').value);
  const prizeMultiplier = Number(document.getElementById('prizeMultiplier').value);

  // Poker Match controls
  const matchCost       = Number(document.getElementById('matchCost').value);
  const matchReward     = Number(document.getElementById('matchReward').value);
  const numMatches      = Number(document.getElementById('numMatches').value);
  const edgeCompression = Number(document.getElementById('edgeCompression').value);

  // Resolve maxUnits for direct (non-comparison) runs
  let maxUnits;
  switch (gameType) {
    case 'nlhe_cash':
    case 'plo_cash':        maxUnits = handsPerSession; break;
    case 'spin_go':         maxUnits = numTournaments;  break;
    case 'poker_match':     maxUnits = numMatches;      break;
    case 'compare_formats': maxUnits = 200;             break; // not used directly
    default:                maxUnits = 200;
  }

  return {
    gameType, policy,
    formatKey: gameType, // alias used by simulator when not in compare mode
    startingBankroll, numSimulations, poolSpread, scalingFactor, playerSkill, protectedCount,
    bigBlind, handsPerSession,
    buyIn, numTournaments, prizeMultiplier,
    matchCost, matchReward, numMatches, edgeCompression,
    maxUnits,
  };
}

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------

function setCard(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateStatCards(result) {
  if (!result) return;
  setCard('statBustRate',    result.bustRate.toFixed(1) + '%');
  setCard('statSurvivalMid', result.survivalAtMidpoint.toFixed(1) + '%');
  setCard('statSurvivalEnd', result.survivalAtEnd.toFixed(1) + '%');
  setCard('statAvgBankroll', '$' + result.avgEndingBankroll.toFixed(0));
  setCard('statAvgUnits',    result.avgUnitsSurvived.toFixed(1));
  setCard('statRet10',       (result.retention[10] || 0).toFixed(1) + '%');
  setCard('statRet25',       (result.retention[25] || 0).toFixed(1) + '%');
  setCard('statRet50',       (result.retention[50] || 0).toFixed(1) + '%');
}

function clearStatCards() {
  ['statBustRate', 'statSurvivalMid', 'statSurvivalEnd',
   'statAvgBankroll', 'statAvgUnits', 'statRet10', 'statRet25', 'statRet50']
    .forEach(id => setCard(id, '—'));
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function showProgress(pct, label) {
  document.getElementById('progressWrap').classList.add('visible');
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressLabel').textContent = label;
}

function hideProgress() {
  document.getElementById('progressWrap').classList.remove('visible');
  document.getElementById('progressFill').style.width = '0%';
}

// ---------------------------------------------------------------------------
// Chart / table visibility switching
// ---------------------------------------------------------------------------

function setChartVisibility(showLines, showTable) {
  document.getElementById('survivalCard').style.display    = showLines ? 'block' : 'none';
  document.getElementById('bankrollCard').style.display    = showLines ? 'block' : 'none';
  document.getElementById('compareTableCard').style.display = showTable ? 'block' : 'none';
}

function setComparisonTableSubtitle(text) {
  const el = document.getElementById('compareTableSubtitle');
  if (el) el.textContent = text;
}

// ---------------------------------------------------------------------------
// Main async simulation runner
// ---------------------------------------------------------------------------

function runSimulationAsync(params) {
  const btn = document.getElementById('runBtn');
  btn.disabled = true;
  clearStatCards();
  showProgress(10, 'Initialising…');

  // Yield to the browser so the progress bar renders before heavy computation
  setTimeout(() => {
    const { gameType, policy } = params;
    const isCompareFormats  = gameType  === 'compare_formats';
    const isComparePolicies = policy    === 'compare_policies';

    showProgress(40, (isCompareFormats || isComparePolicies)
      ? 'Running all scenarios…' : 'Simulating…');

    setTimeout(() => {
      let resultsMap, primaryResult;

      if (isCompareFormats && isComparePolicies) {
        // ── Compare ALL formats × ALL policies (4 × 4 = 16 simulations) ──
        const fullResults = runFullComparison(params);
        setComparisonTableSubtitle(
          'Key survival and retention metrics across all game formats and matchmaking policies.');
        setChartVisibility(false, true);
        renderBustChartGrouped(fullResults);
        renderFullComparisonTable(fullResults);
        // Clear bust-stats pills — 16 entries would be too cluttered
        const bustStats = document.getElementById('bustStats');
        if (bustStats) bustStats.innerHTML = '';

      } else if (isCompareFormats) {
        // ── Compare all formats for the selected policy ──────────────────
        resultsMap = runFormatComparison(params);
        setComparisonTableSubtitle(
          'Key survival and retention metrics across all game formats for the selected matchmaking policy.');
        setChartVisibility(false, true);
        renderBustChart(resultsMap, FORMAT_COLORS);
        renderComparisonTable(resultsMap, FORMAT_COLORS);
        updateBustStats(resultsMap, FORMAT_COLORS);
        // No stat cards in compare-formats mode — show table instead

      } else if (isComparePolicies) {
        // ── Compare all policies for the selected format ──────────────────
        resultsMap   = runPolicyComparison(params);
        primaryResult = resultsMap.random; // use Random Pool for stat cards reference
        const unitLabel = (FORMAT_CONFIGS[gameType] || {}).unitLabel || 'Units';
        setChartVisibility(true, false);
        renderSurvivalChart(resultsMap, null,   unitLabel, POLICY_COLORS);
        renderBankrollChart(resultsMap, null,   unitLabel, POLICY_COLORS);
        renderBustChart(resultsMap, POLICY_COLORS);
        updateBustStats(resultsMap, POLICY_COLORS);
        updateStatCards(primaryResult);

      } else {
        // ── Single format + single policy ────────────────────────────────
        primaryResult = runSimulation(params);
        resultsMap    = { [policy]: primaryResult };
        const unitLabel = (FORMAT_CONFIGS[gameType] || {}).unitLabel || 'Units';
        setChartVisibility(true, false);
        renderSurvivalChart(primaryResult, policy, unitLabel, POLICY_COLORS);
        renderBankrollChart(primaryResult, policy, unitLabel, POLICY_COLORS);
        renderBustChart(resultsMap, POLICY_COLORS);
        updateBustStats(resultsMap, POLICY_COLORS);
        updateStatCards(primaryResult);
      }

      showProgress(100, 'Done!');
      setTimeout(() => { hideProgress(); btn.disabled = false; }, 300);
    }, 30);
  }, 30);
}

// ---------------------------------------------------------------------------
// Initialise sliders, event listeners, and auto-run
// ---------------------------------------------------------------------------

function init() {
  // ── Sliders ──
  sliderSetup('startBankroll',   fmtDollar);
  sliderSetup('numSimulations',  fmtNum);
  sliderSetup('poolSpread',      fmtPlain);
  sliderSetup('scalingFactor',   fmtPlain);
  sliderSetup('playerSkill',     fmtPlain);
  sliderSetup('protectedCount',  fmtPlain);

  sliderSetup('bigBlind',        fmtDollar);
  sliderSetup('handsPerSession', fmtPlain);

  sliderSetup('buyIn',           fmtDollar);
  sliderSetup('numTournaments',  fmtPlain);
  sliderSetup('prizeMultiplier', fmtFixed1);

  sliderSetup('matchCost',       fmtDollar);
  sliderSetup('matchReward',     fmtDollar);
  sliderSetup('numMatches',      fmtPlain);
  sliderSetup('edgeCompression', fmtFixed2);

  // ── Format change → show/hide format-specific controls ──
  document.getElementById('gameType').addEventListener('change', e => {
    showFormatControls(e.target.value);
  });

  // ── Policy change → show/hide Protected Onboarding count control ──
  document.getElementById('policySelect').addEventListener('change', e => {
    showPolicyControls(e.target.value);
  });

  // ── Run button ──
  document.getElementById('runBtn').addEventListener('click', () => {
    runSimulationAsync(getParams());
  });

  // ── Set initial control visibility ──
  showFormatControls(document.getElementById('gameType').value);
  showPolicyControls(document.getElementById('policySelect').value);

  // ── Auto-run on load so charts appear immediately ──
  runSimulationAsync(getParams());
}

// Start when the DOM is ready
document.addEventListener('DOMContentLoaded', init);
