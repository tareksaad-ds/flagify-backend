import { Sql } from 'postgres'
import { randomBytes } from 'crypto'
import { AppError } from './projects.service'

export function createSdkService(db: Sql) {
  return {
    async generateKey(projectId: string, environmentId: string, ownerId: string, name: string) {
      const key = `sdk_${randomBytes(24).toString('hex')}`

      const [sdkKey] = await db`
        INSERT INTO sdk_keys (project_id, environment_id, name, key)
        SELECT p.id, e.id, ${name}, ${key}
        FROM projects p
        JOIN environments e ON e.id = ${environmentId} AND e.project_id = p.id
        WHERE p.id = ${projectId} AND p.owner_id = ${ownerId}
        RETURNING *
      `
      if (!sdkKey) throw new AppError(404, 'Project or environment not found')
      return sdkKey
    },

    async revokeKey(keyId: string, projectId: string, ownerId: string) {
      const [sdkKey] = await db`
        UPDATE sdk_keys SET revoked = true
        FROM projects p
        WHERE sdk_keys.id = ${keyId}
          AND sdk_keys.project_id = ${projectId}
          AND p.id = sdk_keys.project_id
          AND p.owner_id = ${ownerId}
          AND sdk_keys.revoked = false
        RETURNING sdk_keys.id
      `
      if (!sdkKey) throw new AppError(404, 'SDK key not found or already revoked')
    },

    async listKeys(projectId: string, ownerId: string) {
      return db`
        SELECT sk.id, sk.project_id, sk.environment_id, sk.revoked, sk.created_at, e.name AS environment_name
        FROM sdk_keys sk
        JOIN projects p ON p.id = sk.project_id
        JOIN environments e ON e.id = sk.environment_id
        WHERE sk.project_id = ${projectId} AND p.owner_id = ${ownerId}
        ORDER BY sk.created_at DESC
      `
    },

    async resolveKey(key: string) {
      const [sdkKey] = await db`
        SELECT sk.environment_id, sk.project_id
        FROM sdk_keys sk
        WHERE sk.key = ${key} AND sk.revoked = false
      `
      return sdkKey ?? null
    },

    async getFlagStatesForEnv(environmentId: string) {
      return db`
        SELECT
          f.key AS flag_key,
          fs.enabled,
          fs.rollout_percentage,
          fs.rules
        FROM flag_states fs
        JOIN flags f ON f.id = fs.flag_id
        WHERE fs.environment_id = ${environmentId}
      `
    },

    async getFlagStateByKey(flagKey: string, environmentId: string) {
      const [state] = await db`
        SELECT
          f.key AS flag_key,
          fs.enabled,
          fs.rollout_percentage,
          fs.rules
        FROM flag_states fs
        JOIN flags f ON f.id = fs.flag_id
        WHERE f.key = ${flagKey} AND fs.environment_id = ${environmentId}
      `
      return state ?? null
    },
  }
}
