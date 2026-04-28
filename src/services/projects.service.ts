import { Sql } from 'postgres'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
  }
}

export function createProjectsService(db: Sql) {
  return {
    async createProject(name: string, ownerId: string) {
      try {
        const [project] = await db`
          INSERT INTO projects (name, owner_id)
          VALUES (${name}, ${ownerId})
          RETURNING *
        `
        return project
      } catch (err: any) {
        if (err.code === '23505') throw new AppError(409, `Project "${name}" already exists`)
        throw err
      }
    },

    async listProjects(ownerId: string) {
      return db`
        SELECT * FROM projects
        WHERE owner_id = ${ownerId}
        ORDER BY created_at DESC
      `
    },

    async getProject(id: string, ownerId: string) {
      const [project] = await db`
        SELECT * FROM projects
        WHERE id = ${id} AND owner_id = ${ownerId}
      `
      if (!project) throw new AppError(404, 'Project not found')
      return project
    },

    async updateProject(id: string, ownerId: string, name: string) {
      const [project] = await db`
        UPDATE projects
        SET name = ${name}
        WHERE id = ${id} AND owner_id = ${ownerId}
        RETURNING *
      `
      if (!project) throw new AppError(404, 'Project not found')
      return project
    },

    async deleteProject(id: string, ownerId: string) {
      const [project] = await db`
        DELETE FROM projects
        WHERE id = ${id} AND owner_id = ${ownerId}
        RETURNING id
      `
      if (!project) throw new AppError(404, 'Project not found')
    },

    async createEnvironment(projectId: string, ownerId: string, name: string) {
      try {
        const [env] = await db`
          INSERT INTO environments (project_id, name)
          SELECT id, ${name} FROM projects
          WHERE id = ${projectId} AND owner_id = ${ownerId}
          RETURNING *
        `
        if (!env) throw new AppError(404, 'Project not found')
        return env
      } catch (err: any) {
        if (err instanceof AppError) throw err
        if (err.code === '23505') throw new AppError(409, `Environment "${name}" already exists`)
        throw err
      }
    },

    async listEnvironments(projectId: string, ownerId: string) {
      const envs = await db`
        SELECT e.* FROM environments e
        JOIN projects p ON p.id = e.project_id
        WHERE e.project_id = ${projectId} AND p.owner_id = ${ownerId}
        ORDER BY e.created_at ASC
      `
      if (!envs.length) {
        const [project] = await db`
          SELECT id FROM projects WHERE id = ${projectId} AND owner_id = ${ownerId}
        `
        if (!project) throw new AppError(404, 'Project not found')
      }
      return envs
    },

    async deleteEnvironment(projectId: string, envId: string, ownerId: string) {
      const [env] = await db`
        DELETE FROM environments e
        USING projects p
        WHERE e.id = ${envId}
          AND e.project_id = ${projectId}
          AND p.id = e.project_id
          AND p.owner_id = ${ownerId}
        RETURNING e.id
      `
      if (!env) throw new AppError(404, 'Environment not found')
    },
  }
}
