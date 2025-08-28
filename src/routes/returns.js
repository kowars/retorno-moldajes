import { Router } from 'express';
import db from '../db.js';
const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare(`
    SELECT r.id, r.date, r.notes, r.dispatch_id,
           p.name AS project_name, p.code AS project_code
    FROM returns r
    JOIN dispatches d ON d.id = r.dispatch_id
    JOIN projects p ON p.id = d.project_id
    ORDER BY r.date DESC, r.id DESC
  `).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const r = db.prepare(`
    SELECT r.*, p.name AS project_name, p.code AS project_code
    FROM returns r
    JOIN dispatches d ON d.id = r.dispatch_id
    JOIN projects p ON p.id = d.project_id
    WHERE r.id = ?
  `).get(req.params.id);
  if (!r) return res.status(404).json({ error: 'no encontrado' });
  const items = db.prepare(`
    SELECT ri.id, ri.formwork_id, f.name AS formwork_name, ri.qty_returned, ri.condition, ri.observations
    FROM return_items ri
    JOIN formwork f ON f.id = ri.formwork_id
    WHERE ri.return_id = ?
    ORDER BY f.name
  `).all(req.params.id);
  res.json({ ...r, items });
});

router.post('/', (req, res) => {
  const { dispatch_id, date, notes, items } = req.body;
  if (!dispatch_id || !date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'dispatch_id, date, items requeridos' });
  }

  const pendingRows = db.prepare(`
    SELECT di.formwork_id, di.qty_sent,
      COALESCE((
        SELECT SUM(ri.qty_returned)
        FROM return_items ri
        JOIN returns r ON r.id = ri.return_id
        WHERE r.dispatch_id = di.dispatch_id AND ri.formwork_id = di.formwork_id
      ), 0) AS qty_returned
    FROM dispatch_items di
    WHERE di.dispatch_id = ?
  `).all(dispatch_id);
  const pendingMap = new Map();
  for (const it of pendingRows) {
    pendingMap.set(it.formwork_id, it.qty_sent - it.qty_returned);
  }

  const insertReturn = db.prepare('INSERT INTO returns (dispatch_id, date, notes) VALUES (?, ?, ?)');
  const insertItem = db.prepare('INSERT INTO return_items (return_id, formwork_id, qty_returned, condition, observations) VALUES (?, ?, ?, ?, ?)');
  const transaction = db.transaction(() => {
    const info = insertReturn.run(dispatch_id, date, notes || null);
    const return_id = info.lastInsertRowid;
    for (const it of items) {
      if (!it.formwork_id || !it.qty_returned) throw new Error('item invalido');
      const pend = pendingMap.get(it.formwork_id) ?? 0;
      if (it.qty_returned > pend + 1e-9) {
        throw new Error(`Devolución excede pendiente para formwork_id ${it.formwork_id}: pendiente ${pend}`);
      }
      insertItem.run(return_id, it.formwork_id, it.qty_returned, it.condition || 'bueno', it.observations || null);
      pendingMap.set(it.formwork_id, pend - it.qty_returned);
    }
    return return_id;
  });

  try {
    const id = transaction();
    res.status(201).json({ id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
