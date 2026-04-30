import { Sql } from 'postgres'
import { AppError } from './projects.service'

export function createFlagsService(db: Sql) {
  return {
    async createFlag(projectId: string, ownerId: string, key: string, name: string, description?: string) {
      const normalizedKey = key.toLowerCase()

      try {
        const [flag] = await db`
          INSERT INTO flags (project_id, key, name, description)
          SELECT id, ${normalizedKey}, ${name}, ${description ?? null}
          FROM projects
          WHERE id = ${projectId} AND owner_id = ${ownerId}
          RETURNING *
        `
        if (!flag) throw new AppError(404, 'Project not found')

        await db`
          INSERT INTO flag_states (flag_id, environment_id)
          SELECT ${flag.id}, id FROM environments
          WHERE project_id = ${projectId}
        `

        return flag
      } catch (err: any) {
        if (err instanceof AppError) throw err
        if (err.code === '23505') throw new AppError(409, `Flag key "${normalizedKey}" already exists in this project`)
        throw err
      }
    },

    async listFlags(projectId: string, ownerId: string) {
      const flags = await db`
        SELECT f.* FROM flags f
        JOIN projects p ON p.id = f.project_id
        WHERE f.project_id = ${projectId} AND p.owner_id = ${ownerId}
        ORDER BY f.created_at DESC
      `
      if (!flags.length) {
        const [project] = await db`
          SELECT id FROM projects WHERE id = ${projectId} AND owner_id = ${ownerId}
        `
        if (!project) throw new AppError(404, 'Project not found')
      }
      return flags
    },

    async getFlag(flagId: string, projectId: string, ownerId: string) {
      const [flag] = await db`
        SELECT
          f.id, f.project_id, f.key, f.name, f.description, f.created_at,
          COALESCE(
            json_agg(
              json_build_object(
                'environment_id', fs.environment_id,
                'environment_name', e.name,
                'enabled', fs.enabled,
                'rollout_percentage', fs.rollout_percentage,
                'rules', fs.rules,
                'updated_at', fs.updated_at
              ) ORDER BY e.created_at ASC
            ) FILTER (WHERE fs.id IS NOT NULL),
            '[]'
          ) AS states
        FROM flags f
        JOIN projects p ON p.id = f.project_id
        LEFT JOIN flag_states fs ON fs.flag_id = f.id
        LEFT JOIN environments e ON e.id = fs.environment_id
        WHERE f.id = ${flagId} AND f.project_id = ${projectId} AND p.owner_id = ${ownerId}
        GROUP BY f.id
      `
      if (!flag) throw new AppError(404, 'Flag not found')
      return flag
    },

    async updateFlag(flagId: string, projectId: string, ownerId: string, data: { name?: string; description?: string }) {
      const [flag] = await db`
        UPDATE flags SET ${db(data)}
        FROM projects p
        WHERE flags.id = ${flagId}
          AND flags.project_id = ${projectId}
          AND p.id = flags.project_id
          AND p.owner_id = ${ownerId}
        RETURNING flags.*
      `
      if (!flag) throw new AppError(404, 'Flag not found')
      return flag
    },

    async deleteFlag(flagId: string, projectId: string, ownerId: string) {
      const [flag] = await db`
        DELETE FROM flags
        USING projects p
        WHERE flags.id = ${flagId}
          AND flags.project_id = ${projectId}
          AND p.id = flags.project_id
          AND p.owner_id = ${ownerId}
        RETURNING flags.id
      `
      if (!flag) throw new AppError(404, 'Flag not found')
    },

    async updateFlagState(
      flagId: string,
      envId: string,
      projectId: string,
      ownerId: string,
      enabled: boolean,
      rolloutPercentage: number,
      rules: any[],
    ) {
      const [state] = await db`
        INSERT INTO flag_states (flag_id, environment_id, enabled, rollout_percentage, rules)
        SELECT f.id, e.id, ${enabled}, ${rolloutPercentage}, ${db.json(rules)}
        FROM flags f
        JOIN projects p ON p.id = f.project_id
        JOIN environments e ON e.project_id = p.id
        WHERE f.id = ${flagId}
          AND p.id = ${projectId}
          AND p.owner_id = ${ownerId}
          AND e.id = ${envId}
        ON CONFLICT (flag_id, environment_id) DO UPDATE SET
          enabled = EXCLUDED.enabled,
          rollout_percentage = EXCLUDED.rollout_percentage,
          rules = EXCLUDED.rules,
          updated_at = now()
        RETURNING *
      `
      if (!state) throw new AppError(404, 'Flag or environment not found')
      return state
    },
  }
}
