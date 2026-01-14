import { getDatabase } from '../index.js';
import type { CustomInstructionCreate, CustomInstructionUpdate } from '../../api/validators/schemas.js';
import { nowUTC } from '../../utils/datetime.js';

export interface CustomInstructionRecord {
  id: number;
  instruction: string;
  priority: number;
  is_active: number; // SQLite boolean (0 or 1)
  created_at: string;
  updated_at: string;
}

interface FieldUpdate {
  field: string;
  value: unknown;
}

function collectFieldUpdates(
  data: Record<string, unknown>,
  fieldMappings: Array<{ key: string; transform?: (v: unknown) => unknown }>
): FieldUpdate[] {
  const updates: FieldUpdate[] = [];
  for (const { key, transform } of fieldMappings) {
    if (data[key] !== undefined) {
      const value = transform ? transform(data[key]) : data[key];
      updates.push({ field: key, value });
    }
  }
  return updates;
}

export const customInstructionsRepository = {
  findAll(): CustomInstructionRecord[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM custom_instructions ORDER BY priority DESC, created_at DESC');
    return stmt.all() as CustomInstructionRecord[];
  },

  findById(id: number): CustomInstructionRecord | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM custom_instructions WHERE id = ?');
    return stmt.get(id) as CustomInstructionRecord | undefined;
  },

  findActive(): CustomInstructionRecord[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM custom_instructions WHERE is_active = 1 ORDER BY priority DESC');
    return stmt.all() as CustomInstructionRecord[];
  },

  create(data: CustomInstructionCreate): CustomInstructionRecord {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO custom_instructions (instruction, priority, is_active)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(data.instruction, data.priority ?? 0, data.is_active !== false ? 1 : 0);
    return this.findById(result.lastInsertRowid as number)!;
  },

  update(id: number, data: CustomInstructionUpdate): CustomInstructionRecord | undefined {
    const db = getDatabase();

    const fieldUpdates = collectFieldUpdates(data as Record<string, unknown>, [
      { key: 'instruction' },
      { key: 'priority' },
      { key: 'is_active', transform: (v) => (v ? 1 : 0) },
    ]);

    if (fieldUpdates.length === 0) {
      return this.findById(id);
    }

    const setClauses = [...fieldUpdates.map((u) => `${u.field} = ?`), 'updated_at = ?'];
    const params = [...fieldUpdates.map((u) => u.value), nowUTC(), id];

    const stmt = db.prepare(`UPDATE custom_instructions SET ${setClauses.join(', ')} WHERE id = ?`);
    stmt.run(...params);
    return this.findById(id);
  },

  delete(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM custom_instructions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  toggleActive(id: number): CustomInstructionRecord | undefined {
    const db = getDatabase();
    const current = this.findById(id);
    if (!current) {
      return undefined;
    }

    const stmt = db.prepare(`
      UPDATE custom_instructions
      SET is_active = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(current.is_active ? 0 : 1, nowUTC(), id);
    return this.findById(id);
  },
};
