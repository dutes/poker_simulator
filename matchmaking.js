/**
 * matchmaking.js
 * Opponent skill sampling logic for each matchmaking policy.
 * Loaded before simulator.js and formats.js.
 */

// ---------------------------------------------------------------------------
// Policy metadata (used by charts.js for labels)
// ---------------------------------------------------------------------------

const POLICY_CONFIGS = {
  random:    { label: 'Random Pool' },
  banding:   { label: 'Skill Banding' },
  beginner:  { label: 'Beginner Pool' },
  protected: { label: 'Protected Onboarding' },
};

// Reference spread — when poolSpread equals this value, std is unmodified.
const DEFAULT_SPREAD = 500;

// ---------------------------------------------------------------------------
// Random number utilities
// ---------------------------------------------------------------------------

/**
 * Box-Muller transform: returns one normally distributed random number.
 * @param {number} mean
 * @param {number} std
 * @returns {number}
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
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

// ---------------------------------------------------------------------------
// Opponent skill sampling
// ---------------------------------------------------------------------------

/**
 * Sample an opponent's skill rating for the given matchmaking policy.
 *
 * @param {string} policy        - 'random' | 'banding' | 'beginner' | 'protected'
 * @param {number} playerSkill   - New player's skill rating (default 1000)
 * @param {number} poolSpread    - Slider value controlling opponent pool width
 * @param {number} currentUnit   - Current unit index (hand / tournament / match)
 * @param {number} protectedCount - Number of protected units before opening to wider pool
 * @returns {number} Opponent skill rating clamped to [500, 3000]
 */
function sampleOpponentSkill(policy, playerSkill, poolSpread, currentUnit, protectedCount) {
  // Protected onboarding: first N units use a narrow band centered on player skill
  if (policy === 'protected' && currentUnit < protectedCount) {
    return clamp(randNormal(playerSkill, 100), 500, playerSkill + 150);
  }

  // After the protected window, fall back to random pool
  const eff   = policy === 'protected' ? 'random' : policy;
  const ratio = poolSpread / DEFAULT_SPREAD;

  switch (eff) {
    case 'random':
      // Full pool — opponents are generally more experienced than new players
      return clamp(randNormal(1500, 500 * ratio), 500, 3000);

    case 'banding':
      // Narrow band around the player's own skill level
      return clamp(randNormal(playerSkill, 150 * ratio), 500, 3000);

    case 'beginner':
      // Opponents drawn from a near-beginner distribution, capped below 1400
      return clamp(randNormal(1050, 100 * ratio), 500, 1400);

    default:
      return clamp(randNormal(1500, 500 * ratio), 500, 3000);
  }
}
