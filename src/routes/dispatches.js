import { Router } from 'express';
import db from '../db.js';
const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare(`
    SELECT d.id, d.date, d.notes, p.name AS project_name, p.code AS project_code
    FROM dispatches d
    JOIN projects p ON p.id = d.project_id
    ORDER BY d.date DESC, d.id DESC
  `).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const d = db.prepare(`
    SELECT d.*, p.name AS project_name, p.code AS project_code
    FROM dispatches d JOIN projects p ON p.id = d.project_id
    WHERE d.id = ?
  `).get(req.params.id);
  if (!d) return res.status(404).json({ error: 'no encontrado' });

  const items = db.prepare(`
    SELECT di.id, di.formwork_id, f.name AS formwork_name, di.qty_sent,
      COALESCE((
        SELECT SUM(ri.qty_returned)
        FROM return_items ri
        JOIN returns r ON r.id = ri.return_id
        WHERE r.dispatch_id = d.id AND ri.formwork_id = di.formwork_id
      ), 0) AS qty_returned,
      (di.qty_sent - COALESCE((
        SELECT SUM(ri.qty_returned)
        FROM return_items ri
        JOIN returns r ON r.id = ri.return_id
        WHERE r.dispatch_id = d.id AND ri.formwork_id = di.formwork_id
      ), 0)) AS qty_pending
    FROM dispatch_items di
    JOIN formwork f ON f.id = di.formwork_id
    JOIN dispatches d ON d.id = di.dispatch_id
    WHERE di.dispatch_id = ?
    ORDER BY f.name
  `).all(req.params.id);

  res.json({ ...d, items });
});

router.post('/', (req, res) => {
  const { project_id, date, notes, items } = req.body;
  if (!project_id || !date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'project_id, date, items requeridos' });
  }
  const insertDispatch = db.prepare('INSERT INTO dispatches (project_id, date, notes) VALUES (?, ?, ?)');
  const insertItem = db.prepare('INSERT INTO dispatch_items (dispatch_id, formwork_id, qty_sent) VALUES (?, ?, ?)');
  const transaction = db.transaction(() => {
    const info = insertDispatch.run(project_id, date, notes || null);
    const dispatch_id = info.lastInsertRowid;
    for (const it of items) {
      if (!it.formwork_id || !it.qty_sent) throw new Error('item invalido');
      insertItem.run(dispatch_id, it.formwork_id, it.qty_sent);
    }
    return dispatch_id;
  });
  try {
    const id = transaction();
    res.status(201).json({ id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
