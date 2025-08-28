import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'moldajes.db');
const db = new Database(dbPath);

function bootstrap() {
  const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='formwork'").get();
  if (!exists) {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);
  }
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

bootstrap();
export default db;
