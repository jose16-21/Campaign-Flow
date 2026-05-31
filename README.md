# Campaign Flow Builder

MVP de automatización de campañas con segmentación dinámica de contactos y canvas visual drag & drop.

Evaluación técnica dX Latam — Full Stack.

---

## Inicio rápido

### Opción A — Dev Container (recomendado)

Requiere Docker y VS Code con la extensión **Dev Containers**.

1. Abrir el repositorio en VS Code
2. `Ctrl+Shift+P` → **Dev Containers: Reopen in Container**
3. Esperar a que el contenedor levante (Node 24 + MySQL 8.4)
4. Ejecutar en la terminal integrada:

```bash
# Migración y datos de prueba
cd backend
npx prisma migrate dev --name init
npx prisma db seed

# Levantar backend + frontend en paralelo
cd ..
npm run dev
```

5. Abrir http://localhost:4200

### Opción B — Instalación local

Requisitos: Node 24+, MySQL 8.4 corriendo localmente.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example backend/.env
# Editar backend/.env con tu DATABASE_URL

# 3. Migración y seed
cd backend
npx prisma migrate dev --name init
npx prisma db seed
cd ..

# 4. Desarrollo
npm run dev          # backend :3000 + frontend :4200
npm run dev:backend  # solo backend
npm run dev:frontend # solo frontend

# 5. Tests
npm run test         # 18 tests del motor de filtros (Jest)

# 6. Build producción
npm run build
```

---

## Variables de entorno

Archivo `backend/.env` (no se versiona, usar `.env.example` como plantilla):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Cadena de conexión MySQL | `mysql://user:pass@localhost:3306/campaign_flow` |
| `PORT` | Puerto del backend | `3000` |
| `FRONTEND_URL` | URL del frontend (CORS) | `http://localhost:4200` |

---

## Arquitectura

### Monorepo (npm workspaces)

```
/backend    NestJS API
/frontend   Angular SPA
```

### Backend — Clean Architecture + Hexagonal

```
src/
├── prisma/               PrismaService global (OnModuleInit/OnModuleDestroy)
├── filter-engine/
│   ├── domain/           filter.types.ts, AudienceResolverPort
│   ├── application/      FilterEngineService (orquestador)
│   └── infrastructure/   MysqlAudienceResolver (adaptador SQL)
├── contacts/
│   ├── domain/           ContactRepositoryPort
│   ├── application/      CreateContact, ListContacts, UpdateContact, DeleteContact
│   └── infrastructure/   PrismaContactRepository (adaptador)
├── campaigns/            CRUD + guardado atómico del canvas
└── segments/             Delega a FilterEngineService
```

**Principio:** El único lugar donde se decide qué adaptador implementa cada puerto es el `module.ts`. Cambiar de Prisma a otro ORM = modificar un provider.

### Frontend — Clean Architecture (Hexagonal)

```
src/app/
├── domain/
│   ├── models/     Contact, Campaign, Canvas, FilterGroup (tipos puros)
│   └── ports/      ContactRepositoryPort, CampaignRepositoryPort, SegmentRepositoryPort
├── application/
│   └── use-cases/  ListContacts, ListCampaigns, GetCampaign, SaveCanvas, ResolveAudience
├── infrastructure/
│   └── adapters/   HttpContactRepository, HttpCampaignRepository, HttpSegmentRepository
└── features/
    ├── campaigns/  CampaignList + CampaignEditor (canvas @foblex/flow)
    └── contacts/   ContactList con paginación y filtros
```

---

## Motor de filtros (núcleo)

Árbol AND/OR recursivo que se traduce a SQL parametrizado:

```json
{
  "op": "AND",
  "conditions": [
    { "field": "country", "operator": "eq", "value": "GT" },
    { "field": "status", "operator": "eq", "value": "ACTIVE" },
    {
      "op": "OR",
      "conditions": [
        { "field": "attributes.plan", "operator": "eq", "value": "premium" },
        { "field": "attributes.age", "operator": "gt", "value": 18 }
      ]
    }
  ]
}
```

**Operadores:** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `contains`

**Seguridad:** todas las queries usan `?` placeholders. Nunca concatenación de strings.

**Atributos dinámicos:** `attributes.X` → `JSON_UNQUOTE(JSON_EXTRACT(c.attributes, '$.X'))`

---

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/contacts` | Crear contacto (201; 409 email duplicado) |
| GET | `/contacts` | Listar paginado + `?search=` + `?filters=` |
| PUT | `/contacts/:id` | Actualizar |
| DELETE | `/contacts/:id` | Soft delete |
| POST | `/campaigns` | Crear campaña |
| GET | `/campaigns` | Listar (sin canvas) |
| GET | `/campaigns/:id` | Obtener con canvas completo |
| PUT | `/campaigns/:id` | Actualizar |
| DELETE | `/campaigns/:id` | Eliminar |
| PUT | `/campaigns/:id/canvas` | Guardar canvas (transacción atómica) |
| POST | `/segments/:id/audience` | Resolver filtros → audiencia |

**Respuestas:**
```jsonc
// Error
{ "error": { "code": "...", "message": "..." } }

// Listado paginado
{ "data": [...], "page": 1, "pageSize": 20, "total": 100 }
```

---

## Decisiones técnicas

### NestJS (backend)
Elegido sobre Express por su sistema de módulos e inyección de dependencias nativa, que encaja directamente con el patrón de puertos y adaptadores. Los `InjectionToken` de NestJS son el punto de composición del hexágono.

### Prisma 5 (ORM)
Se inició con Prisma 7 pero se bajó a Prisma 5. Prisma 7 eliminó el soporte de `url = env()` en el schema y obliga a usar driver adapters para conexiones directas, lo que añade una capa de complejidad innecesaria para un MVP de evaluación.

### MySQL + columna JSON
La columna `attributes` en MySQL JSON permite atributos dinámicos por contacto sin alterar el schema. El motor de filtros accede a ellos con `JSON_UNQUOTE(JSON_EXTRACT(...))`. El canvas de la campaña también se persiste como JSON en la tabla `campaigns`, simplificando el guardado atómico.

### @foblex/flow (canvas)
Librería Angular-nativa compatible con `>=17.3.0`. Ofrece `FFlowModule` con todos los componentes necesarios (nodos, conexiones, drag & drop desde paleta). Se eligió sobre Angular CDK + SVG manual para reducir código boilerplate en el canvas.

### Angular Signals (estado)
El estado del canvas y los formularios se maneja con `signal()` y `update()` en lugar de RxJS observables. Más simple, sin subscripciones ni `async pipe` en el contexto del editor.

### Arquitectura hexagonal (puertos y adaptadores)
Aplicada en `ContactsModule` y `FilterEngineModule` (los más críticos). `CampaignsModule` y `SegmentsModule` son thin services sin lógica compleja, por lo que forzar hexagonal ahí sería over-engineering. Ver [PLAN.md](PLAN.md) para el razonamiento.

---

## Fuera de alcance

| Característica | Decisión |
|----------------|----------|
| Envío real de SMS | El endpoint simula/registra. La arquitectura permite conectar un proveedor real sin cambiar la lógica de negocio. |
| Autenticación/autorización | No requerida en la especificación. Un `AuthGuard` de NestJS se puede agregar sin cambiar ningún módulo. |
| UI de creación/edición de contactos | Los endpoints REST sí están implementados. La UI se puede agregar como una nueva feature sin tocar el backend. |
| Variables `{{name}}` en SMS | Bonus no implementado. El nodo SMS almacena el mensaje como string; el motor de interpolación sería un caso de uso adicional en la capa de aplicación. |
| Multi-tenancy, colas, schedulers | Fuera del alcance del MVP. |

---

## Supuestos

- Un contacto con `deleted_at` no nulo se considera eliminado en todos los listados y filtros.
- El `:id` en `POST /segments/:id/audience` es el ID del nodo en el canvas, no una entidad persistida. Los segmentos no son entidades independientes — viven como configuración dentro del canvas.
- La columna `status` de campañas sigue el enum `DRAFT | ACTIVE`. No existe lógica de transición de estados más allá de lo que el cliente envíe en un `PUT`.
- El seed genera 100 contactos con atributos dinámicos variados para facilitar las pruebas del motor de filtros sin necesidad de datos reales.
