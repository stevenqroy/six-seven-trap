export const ENEMY_ROLE_VALUES = Object.freeze([
  'harasser',
  'tank',
  'controller',
  'summoner',
  'support',
]);

export const REQUIRED_ENEMY_ANCHORS = Object.freeze([
  'weapon',
  'beam',
  'core',
  'exhaust',
]);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function addIssue(errors, { entryId = null, fieldPath = 'manifest', message = 'Invalid value' }) {
  errors.push({
    entryId,
    fieldPath,
    message,
  });
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveEntryId(enemyLike, index) {
  if (isRecord(enemyLike)) {
    const id = normalizeString(enemyLike.id);
    if (id) return id;
  }
  return `#${index}`;
}

function validateNumberInRange(errors, value, { entryId, fieldPath, min, max, allowInteger = false }) {
  if (!Number.isFinite(value)) {
    addIssue(errors, { entryId, fieldPath, message: 'Expected a finite number.' });
    return null;
  }

  if (allowInteger && !Number.isInteger(value)) {
    addIssue(errors, { entryId, fieldPath, message: 'Expected an integer value.' });
    return null;
  }

  if (Number.isFinite(min) && value < min) {
    addIssue(errors, { entryId, fieldPath, message: `Expected value >= ${min}.` });
    return null;
  }

  if (Number.isFinite(max) && value > max) {
    addIssue(errors, { entryId, fieldPath, message: `Expected value <= ${max}.` });
    return null;
  }

  return value;
}

function validatePoint(errors, value, { entryId, fieldPath }) {
  if (!isRecord(value)) {
    addIssue(errors, { entryId, fieldPath, message: 'Expected a point object with x/y coordinates.' });
    return null;
  }

  const x = validateNumberInRange(errors, value.x, {
    entryId,
    fieldPath: `${fieldPath}.x`,
    min: 0,
    max: 1,
  });
  const y = validateNumberInRange(errors, value.y, {
    entryId,
    fieldPath: `${fieldPath}.y`,
    min: 0,
    max: 1,
  });

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function validateRect(errors, value, { entryId, fieldPath }) {
  if (!isRecord(value)) {
    addIssue(errors, { entryId, fieldPath, message: 'Expected a rectangle object with x/y/w/h.' });
    return null;
  }

  const x = validateNumberInRange(errors, value.x, {
    entryId,
    fieldPath: `${fieldPath}.x`,
    min: 0,
    max: 1,
  });
  const y = validateNumberInRange(errors, value.y, {
    entryId,
    fieldPath: `${fieldPath}.y`,
    min: 0,
    max: 1,
  });
  const w = validateNumberInRange(errors, value.w, {
    entryId,
    fieldPath: `${fieldPath}.w`,
    min: Number.EPSILON,
    max: 1,
  });
  const h = validateNumberInRange(errors, value.h, {
    entryId,
    fieldPath: `${fieldPath}.h`,
    min: Number.EPSILON,
    max: 1,
  });

  if (![x, y, w, h].every(Number.isFinite)) return null;

  if (x + w > 1) {
    addIssue(errors, {
      entryId,
      fieldPath,
      message: 'Rectangle exceeds horizontal bounds (x + w must be <= 1).',
    });
  }

  if (y + h > 1) {
    addIssue(errors, {
      entryId,
      fieldPath,
      message: 'Rectangle exceeds vertical bounds (y + h must be <= 1).',
    });
  }

  return { x, y, w, h };
}

function validateStats(errors, value, { entryId, fieldPath }) {
  if (!isRecord(value)) {
    addIssue(errors, { entryId, fieldPath, message: 'Expected a stats object.' });
    return null;
  }

  const hp = validateNumberInRange(errors, value.hp, {
    entryId,
    fieldPath: `${fieldPath}.hp`,
    min: 1,
  });
  const speed = validateNumberInRange(errors, value.speed, {
    entryId,
    fieldPath: `${fieldPath}.speed`,
    min: 0,
  });
  const size = validateNumberInRange(errors, value.size, {
    entryId,
    fieldPath: `${fieldPath}.size`,
    min: Number.EPSILON,
  });
  const threat = validateNumberInRange(errors, value.threat, {
    entryId,
    fieldPath: `${fieldPath}.threat`,
    min: Number.EPSILON,
  });

  if (![hp, speed, size, threat].every(Number.isFinite)) return null;
  return { hp, speed, size, threat };
}

function validateAnchors(errors, value, { entryId, fieldPath }) {
  if (!isRecord(value)) {
    addIssue(errors, { entryId, fieldPath, message: 'Expected an anchors object.' });
    return null;
  }

  const anchors = {};
  for (let i = 0; i < REQUIRED_ENEMY_ANCHORS.length; i++) {
    const anchorName = REQUIRED_ENEMY_ANCHORS[i];
    const point = validatePoint(errors, value[anchorName], {
      entryId,
      fieldPath: `${fieldPath}.${anchorName}`,
    });
    if (point) anchors[anchorName] = point;
  }

  if (Object.keys(anchors).length !== REQUIRED_ENEMY_ANCHORS.length) return null;
  return anchors;
}

function validateAbilities(errors, value, { entryId, fieldPath }) {
  if (!Array.isArray(value) || value.length === 0) {
    addIssue(errors, {
      entryId,
      fieldPath,
      message: 'Expected a non-empty abilities array.',
    });
    return null;
  }

  const normalizedAbilities = [];
  const seenIds = new Set();
  for (let i = 0; i < value.length; i++) {
    const abilityPath = `${fieldPath}[${i}]`;
    const ability = value[i];
    if (!isRecord(ability)) {
      addIssue(errors, { entryId, fieldPath: abilityPath, message: 'Expected an ability object.' });
      continue;
    }

    const id = normalizeString(ability.id);
    if (!id) {
      addIssue(errors, {
        entryId,
        fieldPath: `${abilityPath}.id`,
        message: 'Ability id is required.',
      });
    } else if (seenIds.has(id)) {
      addIssue(errors, {
        entryId,
        fieldPath: `${abilityPath}.id`,
        message: `Duplicate ability id "${id}" within enemy.`,
      });
    } else {
      seenIds.add(id);
    }

    const type = normalizeString(ability.type);
    if (!type) {
      addIssue(errors, {
        entryId,
        fieldPath: `${abilityPath}.type`,
        message: 'Ability type is required.',
      });
    }

    const cooldownMs = validateNumberInRange(errors, ability.cooldownMs, {
      entryId,
      fieldPath: `${abilityPath}.cooldownMs`,
      min: 0,
    });

    if (id && type && Number.isFinite(cooldownMs)) {
      normalizedAbilities.push({ id, type, cooldownMs });
    }
  }

  if (!normalizedAbilities.length) return null;
  return normalizedAbilities;
}

function validateTelegraphProfile(errors, value, { entryId, fieldPath }) {
  if (!isRecord(value)) {
    addIssue(errors, { entryId, fieldPath, message: 'Expected a telegraphProfile object.' });
    return null;
  }

  const windupMs = validateNumberInRange(errors, value.windupMs, {
    entryId,
    fieldPath: `${fieldPath}.windupMs`,
    min: 0,
  });
  const activeMs = validateNumberInRange(errors, value.activeMs, {
    entryId,
    fieldPath: `${fieldPath}.activeMs`,
    min: 0,
  });
  const recoverMs = validateNumberInRange(errors, value.recoverMs, {
    entryId,
    fieldPath: `${fieldPath}.recoverMs`,
    min: 0,
  });
  const dangerLevel = validateNumberInRange(errors, value.dangerLevel, {
    entryId,
    fieldPath: `${fieldPath}.dangerLevel`,
    min: 1,
    max: 5,
    allowInteger: true,
  });

  if (![windupMs, activeMs, recoverMs, dangerLevel].every(Number.isFinite)) return null;
  return { windupMs, activeMs, recoverMs, dangerLevel };
}

function validatePlaceholderVisual(errors, value, { entryId, fieldPath }) {
  if (!isRecord(value)) {
    addIssue(errors, { entryId, fieldPath, message: 'Expected a placeholderVisual object.' });
    return null;
  }

  const shape = normalizeString(value.shape);
  if (!shape) {
    addIssue(errors, {
      entryId,
      fieldPath: `${fieldPath}.shape`,
      message: 'placeholderVisual.shape is required.',
    });
  }

  const palette = value.palette;
  if (!Array.isArray(palette) || palette.length < 2) {
    addIssue(errors, {
      entryId,
      fieldPath: `${fieldPath}.palette`,
      message: 'placeholderVisual.palette must include at least 2 colors.',
    });
  }

  const normalizedPalette = [];
  if (Array.isArray(palette)) {
    for (let i = 0; i < palette.length; i++) {
      const token = normalizeString(palette[i]);
      if (!token) {
        addIssue(errors, {
          entryId,
          fieldPath: `${fieldPath}.palette[${i}]`,
          message: 'Palette colors must be non-empty strings.',
        });
      } else {
        normalizedPalette.push(token);
      }
    }
  }

  const glowPath = `${fieldPath}.glow`;
  const glow = value.glow;
  if (!isRecord(glow)) {
    addIssue(errors, { entryId, fieldPath: glowPath, message: 'Expected glow object with radius/intensity.' });
    return null;
  }

  const radius = validateNumberInRange(errors, glow.radius, {
    entryId,
    fieldPath: `${glowPath}.radius`,
    min: 0,
  });
  const intensity = validateNumberInRange(errors, glow.intensity, {
    entryId,
    fieldPath: `${glowPath}.intensity`,
    min: 0,
  });

  if (!(shape && normalizedPalette.length >= 2 && Number.isFinite(radius) && Number.isFinite(intensity))) {
    return null;
  }

  return {
    shape,
    palette: normalizedPalette,
    glow: { radius, intensity },
  };
}

export function validateEnemyManifest(manifest) {
  const errors = [];
  if (!isRecord(manifest)) {
    addIssue(errors, {
      fieldPath: 'manifest',
      message: 'Manifest must be an object with "version" and "enemies".',
    });
    return { valid: false, errors, manifest: null };
  }

  const version = validateNumberInRange(errors, manifest.version, {
    fieldPath: 'version',
    min: 1,
    allowInteger: true,
  });
  const enemies = manifest.enemies;
  if (!Array.isArray(enemies) || enemies.length === 0) {
    addIssue(errors, {
      fieldPath: 'enemies',
      message: 'Manifest must provide a non-empty enemies array.',
    });
  }

  const normalizedEnemies = [];
  const seenEnemyIds = new Set();
  if (Array.isArray(enemies)) {
    for (let i = 0; i < enemies.length; i++) {
      const enemyPath = `enemies[${i}]`;
      const rawEnemy = enemies[i];
      if (!isRecord(rawEnemy)) {
        addIssue(errors, {
          entryId: `#${i}`,
          fieldPath: enemyPath,
          message: 'Each enemy entry must be an object.',
        });
        continue;
      }

      const entryId = resolveEntryId(rawEnemy, i);
      const initialErrorCount = errors.length;

      const id = normalizeString(rawEnemy.id);
      if (!id) {
        addIssue(errors, { entryId, fieldPath: `${enemyPath}.id`, message: 'Enemy id is required.' });
      } else if (seenEnemyIds.has(id)) {
        addIssue(errors, {
          entryId,
          fieldPath: `${enemyPath}.id`,
          message: `Duplicate enemy id "${id}".`,
        });
      } else {
        seenEnemyIds.add(id);
      }

      const displayName = normalizeString(rawEnemy.displayName);
      if (!displayName) {
        addIssue(errors, {
          entryId,
          fieldPath: `${enemyPath}.displayName`,
          message: 'displayName is required.',
        });
      }

      const role = normalizeString(rawEnemy.role);
      if (!role) {
        addIssue(errors, { entryId, fieldPath: `${enemyPath}.role`, message: 'role is required.' });
      } else if (!ENEMY_ROLE_VALUES.includes(role)) {
        addIssue(errors, {
          entryId,
          fieldPath: `${enemyPath}.role`,
          message: `role must be one of: ${ENEMY_ROLE_VALUES.join(', ')}.`,
        });
      }

      const stats = validateStats(errors, rawEnemy.stats, {
        entryId,
        fieldPath: `${enemyPath}.stats`,
      });
      const hurtbox = validateRect(errors, rawEnemy.hurtbox, {
        entryId,
        fieldPath: `${enemyPath}.hurtbox`,
      });
      const hitbox = validateRect(errors, rawEnemy.hitbox, {
        entryId,
        fieldPath: `${enemyPath}.hitbox`,
      });
      const anchors = validateAnchors(errors, rawEnemy.anchors, {
        entryId,
        fieldPath: `${enemyPath}.anchors`,
      });
      const abilities = validateAbilities(errors, rawEnemy.abilities, {
        entryId,
        fieldPath: `${enemyPath}.abilities`,
      });
      const telegraphProfile = validateTelegraphProfile(errors, rawEnemy.telegraphProfile, {
        entryId,
        fieldPath: `${enemyPath}.telegraphProfile`,
      });
      const placeholderVisual = validatePlaceholderVisual(errors, rawEnemy.placeholderVisual, {
        entryId,
        fieldPath: `${enemyPath}.placeholderVisual`,
      });

      if (errors.length !== initialErrorCount) continue;

      normalizedEnemies.push({
        id,
        displayName,
        role,
        stats,
        hurtbox,
        hitbox,
        anchors,
        abilities,
        telegraphProfile,
        placeholderVisual,
      });
    }
  }

  const valid = errors.length === 0;
  return {
    valid,
    errors,
    manifest: valid
      ? {
          version,
          enemies: normalizedEnemies,
        }
      : null,
  };
}

export function formatEnemyManifestErrors(errors, { source = 'enemy-manifest' } = {}) {
  const issues = Array.isArray(errors) ? errors : [];
  if (!issues.length) {
    return `[EnemyRegistry] ${source}: enemy manifest validation failed for an unknown reason.`;
  }

  const heading =
    `[EnemyRegistry] ${source}: enemy manifest validation failed with ` +
    `${issues.length} error${issues.length === 1 ? '' : 's'}.`;
  const details = issues.map((issue, idx) => {
    const entryPrefix = issue.entryId ? `[${issue.entryId}] ` : '';
    const fieldPath = normalizeString(issue.fieldPath) || 'manifest';
    const message = normalizeString(issue.message) || 'Invalid value.';
    return `${idx + 1}. ${entryPrefix}${fieldPath}: ${message}`;
  });

  return `${heading}\n${details.join('\n')}`;
}
