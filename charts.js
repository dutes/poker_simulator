/**
 * charts.js
 * Chart.js wrappers for the Poker Ecosystem Simulator.
 * Keeps all charting concerns separated from simulation logic.
 */

// ---------------------------------------------------------------------------
// Color palette (one color per matchmaking mode + single-run default)
// ---------------------------------------------------------------------------

const MODE_COLORS = {
  random:   { border: '#e74c3c', background: 'rgba(231,76,60,0.15)'   },
  banding:  { border: '#3498db', background: 'rgba(52,152,219,0.15)'  },
  beginner: { border: '#2ecc71', background: 'rgba(46,204,113,0.15)'  },
  short:    { border: '#f39c12', background: 'rgba(243,156,18,0.15)'  },
  default:  { border: '#9b59b6', background: 'rgba(155,89,182,0.15)'  },
};

const MODE_LABELS = {
  random:   'Random Pool',
  banding:  'Skill Banding',
  beginner: 'Beginner Pool',
  short:    'Short Match',
};

// Instances kept so they can be destroyed before recreation
let survivalChartInstance  = null;
let bankrollChartInstance  = null;
let bustChartInstance      = null;

// ---------------------------------------------------------------------------
// Shared chart defaults
// ---------------------------------------------------------------------------

function baseChartOptions(xLabel, yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: '#ccc', font: { size: 13 } },
      },
      tooltip: { backgroundColor: '#1a1a2e', titleColor: '#eee', bodyColor: '#ccc' },
    },
    scales: {
      x: {
        title: { display: true, text: xLabel, color: '#aaa' },
        ticks: { color: '#999', maxTicksLimit: 12 },
        grid:  { color: 'rgba(255,255,255,0.06)' },
      },
      y: {
        title: { display: true, text: yLabel, color: '#aaa' },
        ticks: { color: '#999' },
        grid:  { color: 'rgba(255,255,255,0.06)' },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Survival chart
// ---------------------------------------------------------------------------

/**
 * Render (or re-render) the survival probability chart.
 *
 * @param {Object|Object[]} resultsOrMap
 *   - For single mode: one result object { labels, survivalProbability }
 *   - For comparison:  map { random: result, banding: result, ... }
 * @param {string|null} singleMode  - The mode key when not in comparison mode
 */
function renderSurvivalChart(resultsOrMap, singleMode) {
  const ctx = document.getElementById('survivalChart').getContext('2d');
  if (survivalChartInstance) survivalChartInstance.destroy();

  const datasets = buildDatasets(
    resultsOrMap, singleMode,
    (r) => r.survivalProbability,
    (label) => `${label} — Survival`,
  );

  survivalChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: getLabels(resultsOrMap), datasets },
    options: {
      ...baseChartOptions('Hands Played', 'Survival Probability (%)'),
      plugins: {
        ...baseChartOptions().plugins,
        legend: { labels: { color: '#ccc', font: { size: 13 } } },
        tooltip: { backgroundColor: '#1a1a2e', titleColor: '#eee', bodyColor: '#ccc' },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Average bankroll chart
// ---------------------------------------------------------------------------

/**
 * Render (or re-render) the average bankroll trajectory chart.
 */
function renderBankrollChart(resultsOrMap, singleMode) {
  const ctx = document.getElementById('bankrollChart').getContext('2d');
  if (bankrollChartInstance) bankrollChartInstance.destroy();

  const datasets = buildDatasets(
    resultsOrMap, singleMode,
    (r) => r.averageBankroll,
    (label) => `${label} — Avg Bankroll`,
  );

  bankrollChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: getLabels(resultsOrMap), datasets },
    options: baseChartOptions('Hands Played', 'Average Bankroll ($)'),
  });
}

// ---------------------------------------------------------------------------
// Bust rate comparison chart
// ---------------------------------------------------------------------------

/**
 * Render (or re-render) the bust-rate bar chart.
 *
 * @param {Object} resultsMap - Always a map: { random, banding, beginner, short }
 */
function renderBustChart(resultsMap) {
  const ctx = document.getElementById('bustChart').getContext('2d');
  if (bustChartInstance) bustChartInstance.destroy();

  const modes  = Object.keys(resultsMap);
  const labels = modes.map((m) => MODE_LABELS[m] || m);
  const data   = modes.map((m) => parseFloat(resultsMap[m].bustRate.toFixed(2)));
  const colors = modes.map((m) => (MODE_COLORS[m] || MODE_COLORS.default).border);

  bustChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Bust Rate (%)',
        data,
        backgroundColor: colors.map((c) => c + 'cc'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 6,
      }],
    },
    options: {
      ...baseChartOptions('Matchmaking Mode', 'Bust Rate (%)'),
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#1a1a2e', titleColor: '#eee', bodyColor: '#ccc' },
        datalabels: false,
      },
      scales: {
        ...baseChartOptions().scales,
        y: {
          ...baseChartOptions().scales.y,
          min: 0,
          max: 100,
          title: { display: true, text: 'Bust Rate (%)', color: '#aaa' },
          ticks: { color: '#999' },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLabels(resultsOrMap) {
  if (resultsOrMap && resultsOrMap.labels) return resultsOrMap.labels;
  const first = Object.values(resultsOrMap)[0];
  return first ? first.labels : [];
}

function buildDatasets(resultsOrMap, singleMode, dataFn, labelFn) {
  if (resultsOrMap && resultsOrMap.labels) {
    // Single mode result
    const colors = MODE_COLORS[singleMode] || MODE_COLORS.default;
    const label  = MODE_LABELS[singleMode] || (singleMode || 'Result');
    return [{
      label: labelFn(label),
      data: dataFn(resultsOrMap),
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      fill: true,
    }];
  }

  // Comparison map
  return Object.entries(resultsOrMap).map(([mode, result]) => {
    const colors = MODE_COLORS[mode] || MODE_COLORS.default;
    const label  = MODE_LABELS[mode] || mode;
    return {
      label: labelFn(label),
      data: dataFn(result),
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      fill: false,
    };
  });
}

/**
 * Update the bust-stats panel text beneath the bar chart.
 *
 * @param {Object} resultsMap - { mode: result }
 */
function updateBustStats(resultsMap) {
  const container = document.getElementById('bustStats');
  if (!container) return;

  container.innerHTML = Object.entries(resultsMap)
    .map(([mode, r]) => {
      const color = (MODE_COLORS[mode] || MODE_COLORS.default).border;
      return `<span class="stat-pill" style="border-color:${color}">
        <strong style="color:${color}">${MODE_LABELS[mode] || mode}</strong>
        &nbsp;${r.bustRate.toFixed(1)}% bust &nbsp;|&nbsp;
        ${r.numSimulations - r.bustedCount} / ${r.numSimulations} survived
      </span>`;
    })
    .join('');
}
