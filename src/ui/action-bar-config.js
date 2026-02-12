/**
 * Action Bar Button Configurations (S7R-046)
 *
 * Provides static metadata for action bar buttons.
 * Extracted from main.js to satisfy progressive extraction rule.
 */

/**
 * Create action bar button configurations
 * @returns {Array} Button configurations
 */
export function createActionBarButtons() {
  return [
    {
      id: 'shield',
      label: 'Shield',
      icon: '🛡️',
      position: 'bottom-center',
    },
    {
      id: 'projectile',
      label: 'Fire',
      icon: '🔫',
      position: 'bottom-center',
    },
    {
      id: 'slam',
      label: 'Slam',
      icon: '💥',
      position: 'bottom-center',
    },
  ];
}
