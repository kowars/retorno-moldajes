import functions from "firebase-functions";
import admin from "firebase-admin";
import express from "express";
import cors from "cors";

admin.initializeApp();
const fsdb = admin.firestore();

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// Helpers
const toId = (refOrId) => typeof refOrId === 'string' ? refOrId : refOrId.id;

// Collections: formwork, projects, dispatches, returns

// FORMWORK
app.get('/api/formwork', async (_req, res) => {
  const snap = await fsdb.collection('formwork').orderBy('name').get();
  res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

app.post('/api/formwork', async (req, res) => {
  const { name, sku = null, unit = 'unidad' } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name requerido' });
  const ref = await fsdb.collection('formwork').add({ name, sku, unit });
  res.status(201).json({ id: ref.id, name, sku, unit });
});

app.put('/api/formwork/:id', async (req, res) => {
  const { id } = req.params;
  const { name = null, sku = null, unit = null } = req.body || {};
  const ref = fsdb.collection('formwork').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'no encontrado' });
  await ref.update(Object.fromEntries(Object.entries({ name, sku, unit }).filter(([,v]) => v !== null && v !== undefined)));
  const updated = await ref.get();
  res.json({ id, ...updated.data() });
});

app.delete('/api/formwork/:id', async (req, res) => {
  const ref = fsdb.collection('formwork').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'no encontrado' });
  await ref.delete();
  res.status(204).end();
});

// PROJECTS
app.get('/api/projects', async (_req, res) => {
  const snap = await fsdb.collection('projects').orderBy('name').get();
  res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});

app.post('/api/projects', async (req, res) => {
  const { name, code = null, client = null } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name requerido' });
  const ref = await fsdb.collection('projects').add({ name, code, client });
  res.status(201).json({ id: ref.id, name, code, client });
});

app.put('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const { name = null, code = null, client = null } = req.body || {};
  const ref = fsdb.collection('projects').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'no encontrado' });
  await ref.update(Object.fromEntries(Object.entries({ name, code, client }).filter(([,v]) => v !== null && v !== undefined)));
  const updated = await ref.get();
  res.json({ id, ...updated.data() });
});

app.delete('/api/projects/:id', async (req, res) => {
  const ref = fsdb.collection('projects').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'no encontrado' });
  await ref.delete();
  res.status(204).end();
});

// DISPATCHES
app.get('/api/dispatches', async (_req, res) => {
  const snap = await fsdb.collection('dispatches').orderBy('date', 'desc').get();
  const projects = new Map();
  for (const d of snap.docs) {
    const data = d.data();
    let proj = projects.get(data.project_id);
    if (!proj) {
      const ps = await fsdb.collection('projects').doc(data.project_id).get();
      proj = ps.exists ? ps.data() : { name: '', code: '' };
      projects.set(data.project_id, proj);
    }
    data.project_name = proj.name || null;
    data.project_code = proj.code || null;
    res.write(JSON.stringify({ id: d.id, ...data }) + '\n');
  }
  res.end();
});

app.get('/api/dispatches/:id', async (req, res) => {
  const dref = fsdb.collection('dispatches').doc(req.params.id);
  const ds = await dref.get();
  if (!ds.exists) return res.status(404).json({ error: 'no encontrado' });
  const d = { id: ds.id, ...ds.data() };
  const ps = await fsdb.collection('projects').doc(d.project_id).get();
  d.project_name = ps.exists ? ps.data().name : null;
  d.project_code = ps.exists ? ps.data().code : null;

  // Items enviados
  const itemsSnap = await dref.collection('items').get();
  const sentItems = itemsSnap.docs.map(di => ({ id: di.id, ...di.data() }));

  // Agrupar retornos por formwork_id
  const returnsSnap = await fsdb.collection('returns').where('dispatch_id', '==', dref.id).get();
  const returnedMap = new Map();
  for (const rdoc of returnsSnap.docs) {
    const ris = await fsdb.collection('returns').doc(rdoc.id).collection('items').get();
    for (const it of ris.docs) {
      const { formwork_id, qty_returned } = it.data();
      returnedMap.set(formwork_id, (returnedMap.get(formwork_id) || 0) + (qty_returned || 0));
    }
  }

  // Enriquecer con nombres y pendientes
  const resultItems = [];
  for (const it of sentItems) {
    const fdoc = await fsdb.collection('formwork').doc(it.formwork_id).get();
    const formwork_name = fdoc.exists ? fdoc.data().name : null;
    const qty_returned = returnedMap.get(it.formwork_id) || 0;
    const qty_pending = (it.qty_sent || 0) - qty_returned;
    resultItems.push({ ...it, formwork_name, qty_returned, qty_pending });
  }

  res.json({ ...d, items: resultItems });
});

app.post('/api/dispatches', async (req, res) => {
  const { project_id, date, notes = null, items } = req.body || {};
  if (!project_id || !date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'project_id, date, items requeridos' });
  }
  const dref = await fsdb.collection('dispatches').add({ project_id, date, notes });
  const batch = fsdb.batch();
  for (const it of items) {
    if (!it.formwork_id || !it.qty_sent) return res.status(400).json({ error: 'item invalido' });
    const iref = dref.collection('items').doc();
    batch.set(iref, { formwork_id: String(it.formwork_id), qty_sent: Number(it.qty_sent) });
  }
  await batch.commit();
  res.status(201).json({ id: dref.id });
});

// RETURNS
app.get('/api/returns', async (_req, res) => {
  const snap = await fsdb.collection('returns').orderBy('date', 'desc').get();
  const result = [];
  for (const r of snap.docs) {
    const data = r.data();
    const ds = await fsdb.collection('dispatches').doc(data.dispatch_id).get();
    let project_name = null, project_code = null;
    if (ds.exists) {
      const ps = await fsdb.collection('projects').doc(ds.data().project_id).get();
      if (ps.exists) { project_name = ps.data().name; project_code = ps.data().code; }
    }
    result.push({ id: r.id, date: data.date, notes: data.notes || null, dispatch_id: data.dispatch_id, project_name, project_code });
  }
  res.json(result);
});

app.get('/api/returns/:id', async (req, res) => {
  const rref = fsdb.collection('returns').doc(req.params.id);
  const rs = await rref.get();
  if (!rs.exists) return res.status(404).json({ error: 'no encontrado' });
  const r = { id: rs.id, ...rs.data() };
  const ds = await fsdb.collection('dispatches').doc(r.dispatch_id).get();
  let project_name = null, project_code = null;
  if (ds.exists) {
    const ps = await fsdb.collection('projects').doc(ds.data().project_id).get();
    if (ps.exists) { project_name = ps.data().name; project_code = ps.data().code; }
  }
  const itemsSnap = await rref.collection('items').get();
  const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json({ ...r, project_name, project_code, items });
});

app.post('/api/returns', async (req, res) => {
  const { dispatch_id, date, notes = null, items } = req.body || {};
  if (!dispatch_id || !date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'dispatch_id, date, items requeridos' });
  }
  const dref = fsdb.collection('dispatches').doc(dispatch_id);
  const ds = await dref.get();
  if (!ds.exists) return res.status(400).json({ error: 'dispatch no existe' });

  // calcular pendientes
  const dis = await dref.collection('items').get();
  const pendingMap = new Map();
  for (const di of dis.docs) {
    const { formwork_id, qty_sent } = di.data();
    pendingMap.set(formwork_id, Number(qty_sent) || 0);
  }
  const retDocs = await fsdb.collection('returns').where('dispatch_id', '==', dref.id).get();
  for (const rd of retDocs.docs) {
    const ritems = await fsdb.collection('returns').doc(rd.id).collection('items').get();
    for (const it of ritems.docs) {
      const { formwork_id, qty_returned } = it.data();
      pendingMap.set(formwork_id, (pendingMap.get(formwork_id) || 0) - (Number(qty_returned) || 0));
    }
  }

  for (const it of items) {
    const pend = pendingMap.get(String(it.formwork_id)) || 0;
    if (Number(it.qty_returned) > pend + 1e-9) {
      return res.status(400).json({ error: `Devolución excede pendiente para formwork_id ${it.formwork_id}: pendiente ${pend}` });
    }
  }

  const rref = await fsdb.collection('returns').add({ dispatch_id: dref.id, date, notes });
  const batch = fsdb.batch();
  for (const it of items) {
    const iref = rref.collection('items').doc();
    batch.set(iref, {
      formwork_id: String(it.formwork_id),
      qty_returned: Number(it.qty_returned),
      condition: it.condition || 'bueno',
      observations: it.observations || null
    });
  }
  await batch.commit();
  res.status(201).json({ id: rref.id });
});

// REPORTS
app.get('/api/reports/pending-returns', async (_req, res) => {
  const result = [];
  const dsnap = await fsdb.collection('dispatches').get();
  for (const d of dsnap.docs) {
    const ddata = d.data();
    const p = await fsdb.collection('projects').doc(ddata.project_id).get();
    const project_name = p.exists ? p.data().name : null;
    const project_code = p.exists ? p.data().code : null;

    const dis = await d.ref.collection('items').get();
    const sent = dis.docs.map(di => di.data());

    const returnedMap = new Map();
    const rds = await fsdb.collection('returns').where('dispatch_id', '==', d.id).get();
    for (const rd of rds.docs) {
      const ris = await fsdb.collection('returns').doc(rd.id).collection('items').get();
      for (const it of ris.docs) {
        const { formwork_id, qty_returned } = it.data();
        returnedMap.set(formwork_id, (returnedMap.get(formwork_id) || 0) + (Number(qty_returned) || 0));
      }
    }

    for (const it of sent) {
      const qty_sent = Number(it.qty_sent) || 0;
      const qty_returned = returnedMap.get(String(it.formwork_id)) || 0;
      const qty_pending = qty_sent - qty_returned;
      if (qty_pending > 1e-9) {
        const fdoc = await fsdb.collection('formwork').doc(String(it.formwork_id)).get();
        const formwork_name = fdoc.exists ? fdoc.data().name : null;
        result.push({
          dispatch_id: d.id,
          date: ddata.date,
          project_name,
          project_code,
          formwork_id: String(it.formwork_id),
          formwork_name,
          qty_sent,
          qty_returned,
          qty_pending
        });
      }
    }
  }
  res.json(result.sort((a,b) => (a.date < b.date ? 1 : -1)));
});

export const api = functions.https.onRequest(app);
