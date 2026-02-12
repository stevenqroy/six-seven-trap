/**
 * Action Bar Button Configurations (S7R-046)
 *
 * Provides button configurations for the action bar.
 * Extracted from main.js to satisfy progressive extraction rule.
 */

/**
 * Create action bar button configurations
 * @param {Object} context
 * @param {Object} context.S - Game state
 * @param {Function} context.activateShield - Shield activation function
 * @param {Function} context.fireProjectile - Projectile fire function
 * @param {Function} context.getGuardianPose - Get guardian pose function
 * @param {Function} context.telemetry - Telemetry tracker
 * @param {Function} context.usePower - Power usage function
 * @returns {Array} Button configurations
 */
export function createActionBarButtons({
  S,
  activateShield,
  fireProjectile,
  getGuardianPose,
  telemetry,
  usePower,
}) {
  return [
    {
      id: 'shield',
      label: 'Shield',
      icon: '🛡️',
      position: 'bottom-center',
      onActivate: () => {
        if (!S.isGameOver && !S.isPaused && !S.isTitleScreen) {
          activateShield(S, performance.now());
        }
      },
    },
    {
      id: 'projectile',
      label: 'Fire',
      icon: '🔫',
      position: 'bottom-center',
      onActivate: () => {
        if (!S.isGameOver && !S.isPaused && !S.isTitleScreen) {
          const pose = getGuardianPose();
          fireProjectile(S, pose.cx, pose.anchorY - 50);
        }
      },
    },
    {
      id: 'slam',
      label: 'Slam',
      icon: '💥',
      position: 'bottom-center',
      onActivate: () => {
        if (!S.isGameOver && !S.isPaused && !S.isTitleScreen) {
          telemetry.onAbilityUsed('slam');
          usePower(50);
          const pose = getGuardianPose();
          S.slam.shockwave = {
            x: pose.cx,
            y: pose.anchorY,
            startTime: performance.now(),
            maxRadius: 200,
            duration: 600,
          };
        }
      },
    },
  ];
}
