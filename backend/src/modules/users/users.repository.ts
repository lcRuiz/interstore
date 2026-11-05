import type { Db } from '../../db/connection.js';

export interface User {
  id: number;
  name: string;
  pointsBalance: number;
}

export type UsersRepository = ReturnType<typeof createUsersRepository>;

export function createUsersRepository(db: Db) {
  const findByIdStmt = db.prepare('SELECT id, name, points_balance AS pointsBalance FROM users WHERE id = ?');

  return {
    findById(id: number): User | undefined {
      return findByIdStmt.get(id) as User | undefined;
    },
  };
}
