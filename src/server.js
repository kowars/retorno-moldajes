import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import './db.js';
import formworkRouter from './routes/formwork.js';
import projectsRouter from './routes/projects.js';
import dispatchesRouter from './routes/dispatches.js';
import returnsRouter from './routes/returns.js';
import reportsRouter from './routes/reports.js';

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/', express.static(path.join(__dirname, '..', 'public')));

app.use('/api/formwork', formworkRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/dispatches', dispatchesRouter);
app.use('/api/returns', returnsRouter);
app.use('/api/reports', reportsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
