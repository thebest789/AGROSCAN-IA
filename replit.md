# AgroScan IA

Aplicación web en español para identificar enfermedades y plagas de plantas a partir de fotografías mediante Pl@ntNet.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `PLANTNET_API_KEY` — Pl@ntNet API key, used only by the Express server

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/agroscan-ia/src/App.tsx` — flujo de carga, vista previa, selección de órgano y resultados.
- `artifacts/agroscan-ia/src/index.css` — tokens y estilos visuales de AgroScan IA.
- `artifacts/api-server/src/routes/plant-analysis.ts` — proxy seguro hacia Pl@ntNet.
- `lib/api-spec/openapi.yaml` — contrato fuente para el análisis de plantas.

## Architecture decisions

- La API key de Pl@ntNet solo se lee en el servidor y nunca se expone al navegador.
- El frontend envía una data URL JSON al backend; el backend la convierte a `Blob` y realiza la petición multipart a Pl@ntNet.
- La interfaz muestra resultados parciales sin inventar datos cuando Pl@ntNet no devuelve imágenes o metadatos.

## Product

AgroScan IA permite cargar o tomar una foto JPG/PNG, elegir la parte de la planta que se observa y consultar hasta cinco posibles enfermedades o plagas con nombre, código EPPO, coincidencia y atribución de imágenes.

## User preferences

- Interfaz sencilla en español con colores verde, blanco y beige.

## Gotchas

- Sin `PLANTNET_API_KEY`, el endpoint devuelve un 503 explicativo y la interfaz mantiene el flujo usable.
- El proxy usa los parámetros `lang=es`, `include-related-images=true` y `nb-results=5`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
