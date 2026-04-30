import { Sql } from 'postgres'
import { AppError } from './projects.service'

export function createAuditService(db: Sql) {
  return {
    async listFlagAudit(
      flagId: string,
      projectId: string,
      ownerId: string,
      limit: number,
      offset: number,
    ) {
      const logs = await db`
        SELECT
          al.id, al.flag_id, al.environment_id, al.user_id, al.action, al.diff, al.created_at,
          u.email AS user_email,
          e.name AS environment_name
        FROM audit_logs al
        JOIN flags f ON f.id = al.flag_id
        JOIN projects p ON p.id = f.project_id
        JOIN environments e ON e.id = al.environment_id
        JOIN users u ON u.id = al.user_id
        WHERE al.flag_id = ${flagId}
          AND f.project_id = ${projectId}
          AND p.owner_id = ${ownerId}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

      if (!logs.length) {
        const [flag] = await db`
          SELECT f.id FROM flags f
          JOIN projects p ON p.id = f.project_id
          WHERE f.id = ${flagId} AND f.project_id = ${projectId} AND p.owner_id = ${ownerId}
        `
        if (!flag) throw new AppError(404, 'Flag not found')
      }

      return logs
    },

    async listProjectAudit(
      projectId: string,
      ownerId: string,
      limit: number,
      offset: number,
    ) {
      const [project] = await db`
        SELECT id FROM projects WHERE id = ${projectId} AND owner_id = ${ownerId}
      `
      if (!project) throw new AppError(404, 'Project not found')

      return db`
        SELECT
          al.id, al.flag_id, al.environment_id, al.user_id, al.action, al.diff, al.created_at,
          u.email AS user_email,
          e.name AS environment_name,
          f.key AS flag_key,
          f.name AS flag_name
        FROM audit_logs al
        JOIN flags f ON f.id = al.flag_id
        JOIN projects p ON p.id = f.project_id
        JOIN environments e ON e.id = al.environment_id
        JOIN users u ON u.id = al.user_id
        WHERE f.project_id = ${projectId}
          AND p.owner_id = ${ownerId}
        ORDER BY al.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    },
  }
}
