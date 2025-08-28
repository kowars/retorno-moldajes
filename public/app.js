const $ = s => document.querySelector(s);

function tab(id) {
  document.querySelectorAll('.tab').forEach(el => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

document.querySelectorAll('nav button').forEach(btn => {
  btn.addEventListener('click', () => tab(btn.dataset.tab));
});

async function fetchJSON(url, opts) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || ('HTTP ' + res.status));
  }
  return res.json();
}

// Formwork
const formFormwork = document.getElementById('form-add-formwork');
formFormwork.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    name: form.name.value.trim(),
    sku: form.sku.value.trim() || undefined,
    unit: form.unit.value.trim() || undefined
  };
  await fetchJSON('/api/formwork', { method: 'POST', body: JSON.stringify(payload) });
  form.reset();
  loadFormwork();
});

async function loadFormwork() {
  const data = await fetchJSON('/api/formwork');
  const rows = [['ID','Nombre','SKU','Unidad']].concat(
    data.map(i => [i.id, i.name, i.sku || '', i.unit || ''])
  );
  document.getElementById('tbl-formwork').innerHTML = toTable(rows);
}

// Projects
const formProject = document.getElementById('form-add-project');
formProject.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    name: form.name.value.trim(),
    code: form.code.value.trim() || undefined,
    client: form.client.value.trim() || undefined
  };
  await fetchJSON('/api/projects', { method: 'POST', body: JSON.stringify(payload) });
  form.reset();
  loadProjects();
});

async function loadProjects() {
  const data = await fetchJSON('/api/projects');
  const rows = [['ID','Nombre','Código','Cliente']].concat(
    data.map(i => [i.id, i.name, i.code || '', i.client || ''])
  );
  document.getElementById('tbl-projects').innerHTML = toTable(rows);
}

// Dispatches
const formDispatch = document.getElementById('form-add-dispatch');
formDispatch.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const items = parseItemsList(form.items.value, ['formwork_id','qty_sent']);
  const payload = {
    project_id: Number(form.project_id.value),
    date: form.date.value,
    notes: form.notes.value.trim() || undefined,
    items
  };
  await fetchJSON('/api/dispatches', { method: 'POST', body: JSON.stringify(payload) });
  form.reset();
  loadDispatches();
});

async function loadDispatches() {
  const data = await fetchJSON('/api/dispatches');
  const rows = [['ID','Fecha','Proyecto','Código','Notas']].concat(
    data.map(i => [i.id, i.date, i.project_name, i.project_code || '', i.notes || ''])
  );
  document.getElementById('tbl-dispatches').innerHTML = toTable(rows);
}

// Returns
const formReturn = document.getElementById('form-add-return');
formReturn.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const items = parseItemsList(form.items.value, ['formwork_id','qty_returned','condition','observations']);
  const payload = {
    dispatch_id: Number(form.dispatch_id.value),
    date: form.date.value,
    notes: form.notes.value.trim() || undefined,
    items
  };
  await fetchJSON('/api/returns', { method: 'POST', body: JSON.stringify(payload) });
  form.reset();
  loadReturns();
});

async function loadReturns() {
  const data = await fetchJSON('/api/returns');
  const rows = [['ID','Fecha','Despacho','Proyecto','Código','Notas']].concat(
    data.map(i => [i.id, i.date, i.dispatch_id, i.project_name, i.project_code || '', i.notes || ''])
  );
  document.getElementById('tbl-returns').innerHTML = toTable(rows);
}

// Reports
const btnReport = document.getElementById('btn-refresh-report');
btnReport.addEventListener('click', loadReport);
async function loadReport() {
  const data = await fetchJSON('/api/reports/pending-returns');
  const rows = [['Despacho','Fecha','Proyecto','Moldaje','Enviado','Retornado','Pendiente']].concat(
    data.map(i => [i.dispatch_id, i.date, `${i.project_name} (${i.project_code || '-'})`, i.formwork_name, i.qty_sent, i.qty_returned, i.qty_pending])
  );
  document.getElementById('tbl-report').innerHTML = toTable(rows);
}

// Helpers
function toTable(rows) {
  return `
    <thead>${rows.slice(0,1).map(cells => '<tr>'+cells.map(c => `<th>${escapeHtml(String(c))}</th>`).join('')+'</tr>').join('')}</thead>
    <tbody>${rows.slice(1).map(cells => '<tr>'+cells.map(c => `<td>${escapeHtml(String(c))}</td>`).join('')+'</tr>').join('')}</tbody>
  `;
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot; '":'&#39;'}[c]));
}
function parseItemsList(text, keys) {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const parts = line.split(',').map(s => s.trim());
    const obj = {};
    keys.forEach((k, idx) => {
      let v = parts[idx];
      if (k.includes('id') || k.startsWith('qty')) v = Number(v);
      obj[k] = v ?? null;
    });
    return obj;
  });
}

// Carga inicial
tab('formwork');
loadFormwork();
loadProjects();
loadDispatches();
loadReturns();
loadReport();
