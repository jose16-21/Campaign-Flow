# ADR — Campaign Flow Builder

Decisiones de arquitectura relevantes del proyecto. Cada una incluye el contexto, la decisión tomada y las consecuencias.

---

## 1. Librería de canvas: @foblex/flow

**Contexto**
Se necesita un editor visual drag & drop con nodos, conexiones y paleta de componentes en Angular.

**Opciones consideradas**
| Librería | Pro | Contra |
|----------|-----|--------|
| `@foblex/flow` | Angular-nativo, API declarativa, conexiones SVG built-in | Versión 18.x, Angular 21 requiere `fDragHandle` explícito |
| Angular CDK + SVG manual | Sin dependencias externas, control total | Implementar drag, hit-test y paths SVG desde cero (>2 días) |
| `@swimlane/ngx-graph` | Maduro, buena comunidad | Enfocado en visualización estática, no en edición interactiva |
| `rete.js` | Muy potente para node editors | Adaptador Angular experimental, documentación escasa |

**Decisión**: `@foblex/flow` v18.6.1.

**Consecuencias**
- Se obtuvo drag & drop de nodos, conexiones SVG y drop desde paleta sin código adicional.
- Incompatibilidad parcial con Angular 21: la detección automática del área de drag falló; se resolvió con `fDragHandle` en el div de contenido (header + body del nodo).
- `[fNodePosition]` es un Signal model — se requirió `ChangeDetectionStrategy.OnPush` + `Map` plano (no signal) para evitar que Angular reseteara las coordenadas durante el drag.

---

## 2. Modelado de atributos dinámicos

**Contexto**
Los contactos tienen campos fijos (`country`, `status`, etc.) y un conjunto abierto de atributos definidos por el negocio (`plan`, `age`, `last_purchase_days`, …). Agregar una columna por atributo requeriría migraciones cada vez que cambie el esquema.

**Opciones consideradas**
- **Columna JSON** en MySQL: atributos como objeto JSON en `attributes`.
- **Tabla EAV** (Entity-Attribute-Value): fila por atributo, altamente normalizado pero con joins complejos y dificultad para filtrar.
- **PostgreSQL JSONB**: índices GIN, operadores `@>` nativos — pero el stack elegido es MySQL.

**Decisión**: columna `attributes JSON` en la tabla `contacts`.

**Consecuencias**
- Acceso en SQL con `JSON_UNQUOTE(JSON_EXTRACT(c.attributes, '$.plan'))`.
- El motor de filtros mapea automáticamente `attributes.X` → función JSON_EXTRACT.
- MySQL no ofrece índices GIN como PostgreSQL; para volúmenes grandes se recomienda agregar columnas virtuales indexadas sobre los atributos más consultados.
- El seed genera 100 contactos con atributos variados (`plan`, `age`, `last_purchase_days`) para que el motor de filtros sea verificable sin datos reales.

---

## 3. Prevención de inyección SQL

**Contexto**
El motor de filtros construye queries WHERE dinámicas a partir de un árbol JSON que llega del cliente. Concatenar valores directamente en el SQL permitiría inyección.

**Decisión**: uso exclusivo de `?` placeholders vía `Prisma.$queryRawUnsafe(sql, ...params)`.

**Implementación**
```typescript
// ✅ Correcto — valor nunca se concatena
return { sql: `c.country = ?`, params: ['GT'] };

// ❌ Prohibido
return { sql: `c.country = '${value}'` };
```

El builder recursivo (`MysqlAudienceResolver.construirWhere`) devuelve siempre `{ sql: string, params: unknown[] }`. Los params viajan por separado al driver y nunca tocan el texto SQL.

**Validación adicional**
- Los nombres de campo pasan por una whitelist (`CAMPOS_DIRECTOS`) o validación regex (`/^[a-zA-Z0-9_]+$/`) para atributos dinámicos.
- 18 tests unitarios verifican que SQL y params son siempre independientes, incluyendo un test explícito de inyección (`'; DROP TABLE contacts; --`).

**Consecuencias**: cero riesgo de SQL injection en el motor de filtros dinámicos.

---

## 4. Mejoras para producción

### 4.1 Docker multi-stage
- **Builder** (`node:24-slim`): instala dependencias, genera cliente Prisma, compila TypeScript.
- **Producción**: copia solo `dist/` + `node_modules` del builder. Imagen final ~400MB.
- Se eligió `node:24-slim` (Debian) sobre `node:24-alpine` porque el engine nativo de Prisma 5 requiere `libssl.so.1.1` (OpenSSL 1.1) que Alpine 3.17+ no incluye por defecto.

### 4.2 Frontend con proxy nginx
El frontend Angular llama a rutas relativas (`/api/*`). Un nginx en el contenedor del frontend hace proxy hacia el backend. La URL del backend se inyecta en runtime vía `envsubst`, sin necesidad de recompilar Angular al cambiar el entorno.

### 4.3 CI/CD con path-based triggering
- Cada servicio tiene su propio workflow de GitHub Actions.
- El workflow solo se dispara cuando cambian archivos de su directorio (`backend/**` o `frontend/**`).
- Flujo: PR → CI (tests + build) → merge a `develop` → Docker → ECR → merge a `master` → deploy en App Runner.

### 4.4 Formato de errores homogéneo
Un `AllExceptionsFilter` global normaliza todas las respuestas de error al contrato del spec: `{ error: { code, message } }`, incluyendo los errores de validación del `ValidationPipe`.
