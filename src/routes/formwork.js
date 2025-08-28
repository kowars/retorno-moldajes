import { Router } from 'express';
import db from '../db.js';
const router = Router();

router.get('/', (_req, res) => {
  const items = db.prepare('SELECT * FROM formwork ORDER BY name').all();
  res.json(items);
});

router.post('/', (req, res) => {
  const { name, sku, unit } = req.body;
  if (!name) return res.status(400).json({ error: 'name requerido' });
  const info = db.prepare('INSERT INTO formwork (name, sku, unit) VALUES (?, ?, ?)').run(name, sku || null, unit || 'unidad');
  res.status(201).json({ id: info.lastInsertRowid, name, sku, unit: unit || 'unidad' });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, sku, unit } = req.body;
  const info = db.prepare('UPDATE formwork SET name = COALESCE(?, name), sku = COALESCE(?, sku), unit = COALESCE(?, unit) WHERE id = ?')
    .run(name ?? null, sku ?? null, unit ?? null, id);
  if (info.changes === 0) return res.status(404).json({ error: 'no encontrado' });
  res.json({ id: Number(id), name, sku, unit });
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM formwork WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'no encontrado' });
  res.status(204).end();
});

export default router;
