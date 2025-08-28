PRAGMA foreign_keys = ON;

CREATE TABLE formwork (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  unit TEXT DEFAULT 'unidad'
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  client TEXT
);

CREATE TABLE dispatches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE dispatch_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispatch_id INTEGER NOT NULL,
  formwork_id INTEGER NOT NULL,
  qty_sent REAL NOT NULL,
  FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE CASCADE,
  FOREIGN KEY (formwork_id) REFERENCES formwork(id)
);

CREATE TABLE returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispatch_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE CASCADE
);

CREATE TABLE return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_id INTEGER NOT NULL,
  formwork_id INTEGER NOT NULL,
  qty_returned REAL NOT NULL,
  condition TEXT CHECK (condition IN ('bueno','dañado')) DEFAULT 'bueno',
  observations TEXT,
  FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
  FOREIGN KEY (formwork_id) REFERENCES formwork(id)
);

CREATE INDEX idx_dispatch_items_dispatch ON dispatch_items(dispatch_id);
CREATE INDEX idx_return_items_return ON return_items(return_id);
CREATE INDEX idx_returns_dispatch ON returns(dispatch_id);
