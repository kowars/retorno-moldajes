import { Router } from 'express';
import db from '../db.js';
const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY name').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, code, client } = req.body;
  if (!name) return res.status(400).json({ error: 'name requerido' });
  const info = db.prepare('INSERT INTO projects (name, code, client) VALUES (?, ?, ?)').run(name, code || null, client || null);
  res.status(201).json({ id: info.lastInsertRowid, name, code, client });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, code, client } = req.body;
  const info = db.prepare('UPDATE projects SET name = COALESCE(?, name), code = COALESCE(?, code), client = COALESCE(?, client) WHERE id = ?')
    .run(name ?? null, code ?? null, client ?? null, id);
  if (info.changes === 0) return res.status(404).json({ error: 'no encontrado' });
  res.json({ id: Number(id), name, code, client });
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'no encontrado' });
  res.status(204).end();
});

export default router;
