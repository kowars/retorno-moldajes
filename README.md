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


![CI](https://github.com/kowars/retorno-moldajes/actions/workflows/ci.yml/badge.svg)

## CI
Este repositorio ejecuta CI con GitHub Actions:
- Instala dependencias (npm ci)
- Inicia el servidor
- Valida respuesta en http://localhost:3000

## Uso rápido
- Arranque: 
pm start
- URL: http://localhost:3000
- DB: data/moldajes.db (SQLite)

## Endpoints
- GET/POST/PUT/DELETE /api/formwork
- GET/POST/PUT/DELETE /api/projects
- GET/POST /api/dispatches
- GET/POST /api/returns
- GET /api/reports/pending-returns

## Ejemplos (PowerShell)
`powershell
# Crear moldaje
Invoke-RestMethod -Uri http://localhost:3000/api/formwork -Method Post -ContentType 'application/json' -Body (@{name='Tablero 3x1';sku='TB-31';unit='unidad'} | ConvertTo-Json)

# Crear proyecto
Invoke-RestMethod -Uri http://localhost:3000/api/projects -Method Post -ContentType 'application/json' -Body (@{name='Obra Centro';code='OB-001';client='Cliente X'} | ConvertTo-Json)
`

## Siguientes mejoras sugeridas
- Autenticación básica
- Exportación de reportes a CSV/Excel
- Importación de catálogo desde Excel
- Adjuntar fotos/actas a retornos


## Despliegue en Firebase
Esta app está lista para Firebase Hosting + Functions (Firestore).

1) Crea un proyecto en Firebase y anota su Project ID.
2) En GitHub, configura Secrets del repo:
   - FIREBASE_PROJECT_ID: tu Project ID
   - FIREBASE_TOKEN: token de CI de Firebase (irebase login:ci)
3) Empuja a main o ejecuta el workflow "Deploy Firebase".

Estructura Firebase:
- Hosting sirve public/
- Rewrites /api/** -> Function pi (Express)
- Datos en Firestore (colecciones: formwork, projects, dispatches(+items), returns(+items))

> Nota: La versión para Firebase usa Firestore en unctions/index.js. La versión local usa SQLite.
