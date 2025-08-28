# Administración de Retornos de Moldajes

## Requisitos
- Node.js 18+
- Windows (carpeta en D:\)

## Instalación
1) cd D:\moldajes-retornos
2) npm install
3) npm start
Abrir: http://localhost:3000

## Estructura
- src/: backend Express + SQLite
- public/: frontend sencillo
- data/: base SQLite (autogenerada)

## API principal
- GET/POST/PUT/DELETE /api/formwork
- GET/POST/PUT/DELETE /api/projects
- GET/POST /api/dispatches
- GET/POST /api/returns
- GET /api/reports/pending-returns
