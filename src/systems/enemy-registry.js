import enemyManifest from '../assets/enemies/enemy-manifest.json';
import {
  ENEMY_ROLE_VALUES,
  formatEnemyManifestErrors,
  validateEnemyManifest,
} from './enemy-schema.js';

const DEFAULT_MANIFEST_SOURCE = 'src/assets/enemies/enemy-manifest.json';
const EMPTY_LIST = Object.freeze([]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    deepFreeze(value[key]);
  }
  return value;
}

function createRoleIndex(enemies) {
  const roleIndex = new Map();
  for (let i = 0; i < ENEMY_ROLE_VALUES.length; i++) {
    roleIndex.set(ENEMY_ROLE_VALUES[i], []);
  }

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    const roleList = roleIndex.get(enemy.role);
    if (roleList) {
      roleList.push(enemy);
    } else {
      roleIndex.set(enemy.role, [enemy]);
    }
  }

  for (const [role, list] of roleIndex.entries()) {
    roleIndex.set(role, Object.freeze(list));
  }

  return roleIndex;
}

export class EnemyManifestValidationError extends Error {
  constructor(message, diagnostics = []) {
    super(message);
    this.name = 'EnemyManifestValidationError';
    this.diagnostics = Array.isArray(diagnostics) ? diagnostics : [];
  }
}

export function createEnemyRegistry({
  manifest = enemyManifest,
  source = DEFAULT_MANIFEST_SOURCE,
} = {}) {
  const result = validateEnemyManifest(manifest);
  if (!result.valid || !result.manifest) {
    const message = formatEnemyManifestErrors(result.errors, { source });
    throw new EnemyManifestValidationError(message, result.errors);
  }

  const normalized = result.manifest;
  const enemies = normalized.enemies.map((enemy) => deepFreeze({ ...enemy }));
  const frozenEnemies = Object.freeze(enemies);
  const byId = new Map();
  for (let i = 0; i < frozenEnemies.length; i++) {
    const enemy = frozenEnemies[i];
    byId.set(enemy.id, enemy);
  }
  const byRole = createRoleIndex(frozenEnemies);

  return Object.freeze({
    source,
    version: normalized.version,
    size: frozenEnemies.length,
    getAll() {
      return frozenEnemies;
    },
    getById(id) {
      if (typeof id !== 'string') return null;
      return byId.get(id) ?? null;
    },
    listByRole(role) {
      if (typeof role !== 'string') return EMPTY_LIST;
      return byRole.get(role) ?? EMPTY_LIST;
    },
    has(id) {
      return typeof id === 'string' && byId.has(id);
    },
  });
}

export function loadDefaultEnemyRegistry() {
  return createEnemyRegistry({
    manifest: enemyManifest,
    source: DEFAULT_MANIFEST_SOURCE,
  });
}
