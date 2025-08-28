import { Router } from 'express';
import db from '../db.js';
const router = Router();

router.get('/pending-returns', (_req, res) => {
  const rows = db.prepare(`
    SELECT
      d.id AS dispatch_id,
      d.date,
      p.name AS project_name,
      p.code AS project_code,
      f.id AS formwork_id,
      f.name AS formwork_name,
      di.qty_sent,
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
    FROM dispatches d
    JOIN projects p ON p.id = d.project_id
    JOIN dispatch_items di ON di.dispatch_id = d.id
    JOIN formwork f ON f.id = di.formwork_id
    WHERE (di.qty_sent - COALESCE((
      SELECT SUM(ri.qty_returned)
      FROM return_items ri
      JOIN returns r ON r.id = ri.return_id
      WHERE r.dispatch_id = d.id AND ri.formwork_id = di.formwork_id
    ), 0)) > 1e-9
    ORDER BY d.date DESC, f.name
  `).all();
  res.json(rows);
});

export default router;
