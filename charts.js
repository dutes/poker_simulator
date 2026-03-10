/**
 * charts.js
 * Chart.js wrappers for the Poker Ecosystem Simulator v2.
 * Keeps all charting concerns separated from simulation logic.
 */

// ---------------------------------------------------------------------------
// Color palettes
// ---------------------------------------------------------------------------

// One colour per matchmaking policy
const POLICY_COLORS = {
  random:    { border: '#e74c3c', bg: 'rgba(231,76,60,0.15)'   },
  banding:   { border: '#3498db', bg: 'rgba(52,152,219,0.15)'  },
  beginner:  { border: '#2ecc71', bg: 'rgba(46,204,113,0.15)'  },
  protected: { border: '#f39c12', bg: 'rgba(243,156,18,0.15)'  },
  default:   { border: '#9b59b6', bg: 'rgba(155,89,182,0.15)'  },
};

// One colour per game format
const FORMAT_COLORS = {
  nlhe_cash:   { border: '#3498db', bg: 'rgba(52,152,219,0.15)'  },
  spin_go:     { border: '#e74c3c', bg: 'rgba(231,76,60,0.15)'   },
  plo_cash:    { border: '#f39c12', bg: 'rgba(243,156,18,0.15)'  },
  poker_match: { border: '#2ecc71', bg: 'rgba(46,204,113,0.15)'  },
  default:     { border: '#9b59b6', bg: 'rgba(155,89,182,0.15)'  },
};

// Flat label map covering both policies and formats
const ALL_LABELS = {
  random:      'Random Pool',
  banding:     'Skill Banding',
  beginner:    'Beginner Pool',
  protected:   'Protected Onboarding',
  nlhe_cash:   'NLHE Cash',
  spin_go:     'Spin & Go',
  plo_cash:    'PLO Cash',
  poker_match: 'Poker Match Beginner',
};

// Active chart instances (destroyed before re-render)
let survivalChartInst = null;
let bankrollChartInst = null;
let bustChartInst     = null;

// ---------------------------------------------------------------------------
// Shared chart defaults
// ---------------------------------------------------------------------------

function baseChartOptions(xLabel, yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#ccc', font: { size: 12 } } },
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
// Dataset builder for line charts
// ---------------------------------------------------------------------------

/**
 * Build Chart.js dataset array from either a single result or a comparison map.
 *
 * @param {Object}        resultsOrMap - Single result (has .labels) or { key: result } map
 * @param {string|null}   singleKey    - Key when resultsOrMap is a single result
 * @param {Function}      dataFn       - (result) => array of y values
 * @param {Function}      labelFn      - (humanLabel) => dataset label string
 * @param {Object}        colorMap     - POLICY_COLORS or FORMAT_COLORS
 */
function buildLineDatasets(resultsOrMap, singleKey, dataFn, labelFn, colorMap) {
  if (resultsOrMap && resultsOrMap.labels) {
    // Single mode
    const c   = colorMap[singleKey] || colorMap.default;
    const lbl = ALL_LABELS[singleKey] || singleKey || 'Result';
    return [{
      label:           labelFn(lbl),
      data:            dataFn(resultsOrMap),
      borderColor:     c.border,
      backgroundColor: c.bg,
      borderWidth:     2,
      pointRadius:     0,
      tension:         0.3,
      fill:            true,
    }];
  }

  // Comparison map — one dataset per key
  return Object.entries(resultsOrMap).map(([key, result]) => {
    const c   = colorMap[key] || colorMap.default;
    const lbl = ALL_LABELS[key] || key;
    return {
      label:           labelFn(lbl),
      data:            dataFn(result),
      borderColor:     c.border,
      backgroundColor: c.bg,
      borderWidth:     2,
      pointRadius:     0,
      tension:         0.3,
      fill:            false,
    };
  });
}

function getChartLabels(resultsOrMap) {
  if (resultsOrMap && resultsOrMap.labels) return resultsOrMap.labels;
  const first = Object.values(resultsOrMap)[0];
  return first ? first.labels : [];
}

// ---------------------------------------------------------------------------
// Survival probability chart
// ---------------------------------------------------------------------------

/**
 * Render (or re-render) the survival probability line chart.
 *
 * @param {Object}      resultsOrMap - Single result or { key: result } map
 * @param {string|null} singleKey    - Mode key when not in comparison
 * @param {string}      unitLabel    - x-axis label (Hands / Tournaments / Matches)
 * @param {Object}      colorMap     - POLICY_COLORS or FORMAT_COLORS
 */
function renderSurvivalChart(resultsOrMap, singleKey, unitLabel, colorMap) {
  const ctx = document.getElementById('survivalChart').getContext('2d');
  if (survivalChartInst) survivalChartInst.destroy();

  const datasets = buildLineDatasets(
    resultsOrMap, singleKey,
    r  => r.survivalProbability,
    lbl => `${lbl} — Survival`,
    colorMap || POLICY_COLORS,
  );

  survivalChartInst = new Chart(ctx, {
    type: 'line',
    data: { labels: getChartLabels(resultsOrMap), datasets },
    options: baseChartOptions(unitLabel || 'Units', 'Survival Probability (%)'),
  });
}

// ---------------------------------------------------------------------------
// Average bankroll trajectory chart
// ---------------------------------------------------------------------------

/**
 * Render (or re-render) the average bankroll trajectory chart.
 */
function renderBankrollChart(resultsOrMap, singleKey, unitLabel, colorMap) {
  const ctx = document.getElementById('bankrollChart').getContext('2d');
  if (bankrollChartInst) bankrollChartInst.destroy();

  const datasets = buildLineDatasets(
    resultsOrMap, singleKey,
    r  => r.averageBankroll,
    lbl => `${lbl} — Avg Bankroll`,
    colorMap || POLICY_COLORS,
  );

  bankrollChartInst = new Chart(ctx, {
    type: 'line',
    data: { labels: getChartLabels(resultsOrMap), datasets },
    options: baseChartOptions(unitLabel || 'Units', 'Average Bankroll ($)'),
  });
}

// ---------------------------------------------------------------------------
// Bust rate bar chart
// ---------------------------------------------------------------------------

/**
 * Render (or re-render) the bust-rate bar chart.
 *
 * @param {Object} resultsMap - { key: result } — always a map
 * @param {Object} colorMap   - POLICY_COLORS or FORMAT_COLORS
 */
function renderBustChart(resultsMap, colorMap) {
  const ctx = document.getElementById('bustChart').getContext('2d');
  if (bustChartInst) bustChartInst.destroy();

  const cm     = colorMap || POLICY_COLORS;
  const keys   = Object.keys(resultsMap);
  const labels = keys.map(k => ALL_LABELS[k] || k);
  const data   = keys.map(k => +resultsMap[k].bustRate.toFixed(2));
  const colors = keys.map(k => (cm[k] || cm.default).border);

  bustChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label:           'Bust Rate (%)',
        data,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor:     colors,
        borderWidth:     2,
        borderRadius:    6,
      }],
    },
    options: {
      ...baseChartOptions('', 'Bust Rate (%)'),
      plugins: {
        legend:  { display: false },
        tooltip: { backgroundColor: '#1a1a2e', titleColor: '#eee', bodyColor: '#ccc' },
      },
      scales: {
        x: { ticks: { color: '#999' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: {
          min: 0, max: 100,
          title: { display: true, text: 'Bust Rate (%)', color: '#aaa' },
          ticks: { color: '#999' },
          grid:  { color: 'rgba(255,255,255,0.06)' },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Format comparison summary table
// ---------------------------------------------------------------------------

/**
 * Render a summary comparison table (used in Compare Formats mode).
 *
 * @param {Object} resultsMap - { formatKey: result }
 * @param {Object} colorMap   - FORMAT_COLORS
 */
function renderComparisonTable(resultsMap, colorMap) {
  const container = document.getElementById('comparisonTable');
  if (!container) return;

  const cm = colorMap || FORMAT_COLORS;

  const rows = Object.entries(resultsMap).map(([key, r]) => {
    const color = (cm[key] || cm.default).border;
    const label = ALL_LABELS[key] || key;
    const ret10 = r.retention[10] != null ? r.retention[10].toFixed(1) + '%' : '—';
    const ret25 = r.retention[25] != null ? r.retention[25].toFixed(1) + '%' : '—';
    const ret50 = r.retention[50] != null ? r.retention[50].toFixed(1) + '%' : '—';
    return `<tr>
      <td><span class="dot" style="background:${color}"></span>${label}</td>
      <td>${r.bustRate.toFixed(1)}%</td>
      <td>${r.avgUnitsSurvived.toFixed(1)}</td>
      <td>$${r.avgEndingBankroll.toFixed(0)}</td>
      <td>${ret10}</td>
      <td>${ret25}</td>
      <td>${ret50}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Format</th>
          <th>Bust Rate</th>
          <th>Avg Units Survived</th>
          <th>Avg Ending Bankroll</th>
          <th>Survival @10</th>
          <th>Survival @25</th>
          <th>Survival @50</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ---------------------------------------------------------------------------
// Grouped bust rate bar chart (Compare All Formats + Compare All Policies)
// ---------------------------------------------------------------------------

/**
 * Render a grouped bust-rate bar chart for the full format × policy matrix.
 * Each format is a group on the x-axis; each policy is a coloured dataset.
 *
 * @param {Object} fullResultsMap - { formatKey: { policyKey: result } }
 */
function renderBustChartGrouped(fullResultsMap) {
  const ctx = document.getElementById('bustChart').getContext('2d');
  if (bustChartInst) bustChartInst.destroy();

  const formats  = Object.keys(fullResultsMap);
  const policies = ['random', 'banding', 'beginner', 'protected'];
  const xLabels  = formats.map(f => ALL_LABELS[f] || f);

  const datasets = policies.map(policy => {
    const c = POLICY_COLORS[policy] || POLICY_COLORS.default;
    return {
      label:           ALL_LABELS[policy] || policy,
      data:            formats.map(fmt => {
        const r = fullResultsMap[fmt][policy];
        return r ? +r.bustRate.toFixed(2) : 0;
      }),
      backgroundColor: c.border + 'cc',
      borderColor:     c.border,
      borderWidth:     2,
      borderRadius:    6,
    };
  });

  bustChartInst = new Chart(ctx, {
    type: 'bar',
    data: { labels: xLabels, datasets },
    options: {
      ...baseChartOptions('', 'Bust Rate (%)'),
      plugins: {
        legend:  { display: true, labels: { color: '#ccc', font: { size: 12 } } },
        tooltip: { backgroundColor: '#1a1a2e', titleColor: '#eee', bodyColor: '#ccc' },
      },
      scales: {
        x: { ticks: { color: '#999' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: {
          min: 0, max: 100,
          title: { display: true, text: 'Bust Rate (%)', color: '#aaa' },
          ticks: { color: '#999' },
          grid:  { color: 'rgba(255,255,255,0.06)' },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Full comparison table (Compare All Formats + Compare All Policies)
// ---------------------------------------------------------------------------

/**
 * Render a summary table for all format × policy combinations.
 *
 * @param {Object} fullResultsMap - { formatKey: { policyKey: result } }
 */
function renderFullComparisonTable(fullResultsMap) {
  const container = document.getElementById('comparisonTable');
  if (!container) return;

  const formats  = Object.keys(fullResultsMap);
  const policies = ['random', 'banding', 'beginner', 'protected'];

  const rows = [];
  for (const fmt of formats) {
    for (const pol of policies) {
      const r = fullResultsMap[fmt] && fullResultsMap[fmt][pol];
      if (!r) continue;
      const fmtColor = (FORMAT_COLORS[fmt] || FORMAT_COLORS.default).border;
      const polColor = (POLICY_COLORS[pol] || POLICY_COLORS.default).border;
      const ret10    = r.retention[10] != null ? r.retention[10].toFixed(1) + '%' : '—';
      const ret25    = r.retention[25] != null ? r.retention[25].toFixed(1) + '%' : '—';
      const ret50    = r.retention[50] != null ? r.retention[50].toFixed(1) + '%' : '—';
      rows.push(`<tr>
        <td><span class="dot" style="background:${fmtColor}"></span>${ALL_LABELS[fmt] || fmt}</td>
        <td><span class="dot" style="background:${polColor}"></span>${ALL_LABELS[pol] || pol}</td>
        <td>${r.bustRate.toFixed(1)}%</td>
        <td>${r.avgUnitsSurvived.toFixed(1)}</td>
        <td>$${r.avgEndingBankroll.toFixed(0)}</td>
        <td>${ret10}</td>
        <td>${ret25}</td>
        <td>${ret50}</td>
      </tr>`);
    }
  }

  container.innerHTML = `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Format</th>
          <th>Policy</th>
          <th>Bust Rate</th>
          <th>Avg Units Survived</th>
          <th>Avg Ending Bankroll</th>
          <th>Survival @10</th>
          <th>Survival @25</th>
          <th>Survival @50</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
}

// ---------------------------------------------------------------------------
// Bust stats pills (beneath the bust-rate chart)
// ---------------------------------------------------------------------------

/**
 * Populate the bust-stats pill strip with per-key bust stats.
 *
 * @param {Object} resultsMap - { key: result }
 * @param {Object} colorMap   - POLICY_COLORS or FORMAT_COLORS
 */
function updateBustStats(resultsMap, colorMap) {
  const container = document.getElementById('bustStats');
  if (!container) return;

  const cm = colorMap || POLICY_COLORS;
  container.innerHTML = Object.entries(resultsMap).map(([key, r]) => {
    const color = (cm[key] || cm.default).border;
    const label = ALL_LABELS[key] || key;
    return `<span class="stat-pill" style="border-color:${color}">
      <strong style="color:${color}">${label}</strong>
      &nbsp;${r.bustRate.toFixed(1)}% bust
      &nbsp;|&nbsp;${r.numSimulations - r.bustedCount} / ${r.numSimulations} survived
    </span>`;
  }).join('');
}
