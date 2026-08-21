# 🎯 Objetiva

API RESTful para organizar objetivos personales mediante **categorías, objetivos y tareas**.

El proyecto utiliza PostgreSQL para persistencia, Docker para contenerización y GitHub Actions para automatizar pruebas y validaciones de calidad en los ambientes de **Pruebas** y **Producción**.

---

## 🛠️ Tecnologías

- 🟢 Node.js 22
- 🔷 TypeScript
- 🚂 Express
- 🔺 Prisma
- 🐘 PostgreSQL 18
- 🧪 Vitest
- 🔍 Supertest
- 🐳 Docker
- 🐳 Docker Compose
- ⚙️ GitHub Actions
- 🐙 Git + GitMoji

---

## 📁 Estructura

```text
Objetiva/
├── .github/
│   └── workflows/
│       ├── test.yml
│       └── production.yml
├── prisma/
├── src/
├── Dockerfile
├── docker-compose.test.yml
├── docker-compose.prod.yml
├── package.json
├── prisma.config.ts
├── vitest.config.ts
└── README.md
```

---

# 🚀 Instalación

## 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd Objetiva
```

## 2. Instalar dependencias

```bash
npm ci
```

## 3. Generar Prisma Client

```bash
npx prisma generate
```

## 4. Configurar la base de datos

La aplicación utiliza PostgreSQL.

### Desarrollo

```text
DATABASE_URL=postgresql://<USER>:<PASSWORD>@localhost:5432/<DATABASE>?schema=public
```

### Pruebas

```text
DATABASE_URL=postgresql://<USER>:<PASSWORD>@localhost:5433/<DATABASE>?schema=public
```

### Producción

```text
DATABASE_URL=postgresql://<USER>:<PASSWORD>@localhost:5434/<DATABASE>?schema=public
```

> ⚠️ Las variables reales pueden configurarse mediante variables de entorno o secrets. No subir credenciales reales al repositorio.

---

# 💻 Desarrollo local

## Ejecutar la API

```bash
npm run dev
```

API:

```text
http://localhost:3000
```

## Ejecutar la aplicación con el script de producción

```bash
npm start
```

---

# 🧪 Pruebas

## Ejecutar todas las pruebas

```bash
npm test
```

## Ejecutar pruebas en modo watch

```bash
npm run test:watch
```

## Ejecutar pruebas con cobertura

```bash
npm run test:coverage
```

### Quality Gates

| Ambiente | Cobertura mínima |
|---|---:|
| 🧪 Pruebas | 60% |
| 🚀 Producción | 85% |

Además:

- ❌ Una prueba fallida detiene el pipeline.
- ❌ Una cobertura inferior al mínimo detiene el pipeline.
- ✅ Solo se continúa cuando las validaciones son exitosas.

---

# 🗄️ Prisma

## Generar Prisma Client

```bash
npx prisma generate
```

## Ejecutar migraciones pendientes

```bash
npx prisma migrate deploy
```

## Crear una migración durante desarrollo

```bash
npx prisma migrate dev
```

---

# 🐳 Docker

El proyecto tiene dos configuraciones independientes:

```text
docker-compose.test.yml
docker-compose.prod.yml
```

---

## 🧪 Docker - Ambiente de Pruebas

### Construir y levantar

```bash
docker compose -f docker-compose.test.yml up -d --build
```

### Ver contenedores

```bash
docker ps
```

### Ver logs

```bash
docker compose -f docker-compose.test.yml logs
```

### Ver logs de la API

```bash
docker compose -f docker-compose.test.yml logs api-test
```

### Ver logs de PostgreSQL

```bash
docker compose -f docker-compose.test.yml logs postgres-test
```

### Detener

```bash
docker compose -f docker-compose.test.yml down
```

### Detener y eliminar volúmenes

```bash
docker compose -f docker-compose.test.yml down -v
```

---

## 🚀 Docker - Ambiente de Producción

### Construir y levantar

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Ver contenedores

```bash
docker ps
```

### Ver logs

```bash
docker compose -f docker-compose.prod.yml logs
```

### Ver logs de la API

```bash
docker compose -f docker-compose.prod.yml logs api-prod
```

### Ver logs de PostgreSQL

```bash
docker compose -f docker-compose.prod.yml logs postgres-prod
```

### Detener

```bash
docker compose -f docker-compose.prod.yml down
```

### Detener y eliminar volúmenes

```bash
docker compose -f docker-compose.prod.yml down -v
```

---

# 🔌 Puertos

Cada ambiente utiliza puertos diferentes para mantenerse independiente.

| Ambiente | API | PostgreSQL | Base de datos |
|---|---:|---:|---|
| 💻 Desarrollo | `3000` | `5432` | `objetiva` |
| 🧪 Pruebas | `3001` | `5433` | `objetiva_test` |
| 🚀 Producción | `3002` | `5434` | `objetiva_prod` |

### URLs

```text
Desarrollo:
http://localhost:3000

Pruebas:
http://localhost:3001

Producción:
http://localhost:3002
```

> Dentro de Docker, los servicios se comunican utilizando el puerto interno de PostgreSQL `5432`. Los puertos `5433` y `5434` corresponden al host.

---

# ⚙️ GitHub Actions

El proyecto tiene dos pipelines independientes:

```text
.github/workflows/
├── test.yml
└── production.yml
```

---

## 🧪 Pipeline de Pruebas

Archivo:

```text
.github/workflows/test.yml
```

Se ejecuta sobre:

```text
feature/tests
```

El pipeline realiza:

```text
1. Checkout
2. Configuración de Node.js
3. npm ci
4. Prisma Generate
5. Migraciones
6. npm test
7. Validación de cobertura
```

Cobertura mínima:

```text
60%
```

Si una prueba falla o no se alcanza la cobertura mínima, el pipeline se detiene.

---

## 🚀 Pipeline de Producción

Archivo:

```text
.github/workflows/production.yml
```

Se ejecuta sobre:

```text
main
```

El pipeline realiza:

```text
1. Checkout
2. Configuración de Node.js
3. npm ci
4. Prisma Generate
5. Migraciones
6. npm test
7. Validación de cobertura
8. Configuración de Docker
9. Construcción de imagen
10. Levantamiento de PostgreSQL y API
11. Migraciones de producción
12. Verificación de la API
13. Logs
14. Limpieza de contenedores
```

Cobertura mínima:

```text
85%
```

### Regla principal

```text
Pruebas ❌
   ↓
Pipeline detenido
   ↓
No continúa el proceso
```

```text
Cobertura < 85% ❌
   ↓
Pipeline detenido
   ↓
No continúa el proceso
```

```text
Pruebas ✅
Cobertura ≥ 85% ✅
   ↓
Continúa el pipeline
```

---

# 🌿 Git

## Ver estado

```bash
git status
```

## Ver ramas

```bash
git branch -a
```

## Actualizar información remota

```bash
git fetch --all
```

## Cambiar de rama

```bash
git switch nombre-de-rama
```

## Crear una nueva rama

```bash
git switch -c feature/nombre
```

---

# 💾 Commits con GitMoji

Los commits utilizan [GitMoji](https://gitmoji.dev/) para identificar el tipo de cambio.

### Nueva funcionalidad

```bash
git add .
git commit -m "✨ feat: agregar endpoint de objetivos"
```

### Pruebas

```bash
git add .
git commit -m "🧪 test: agregar pruebas de objetivos"
```

### Corrección

```bash
git add .
git commit -m "🐛 fix: corregir validacion de objetivos"
```

### Docker

```bash
git add .
git commit -m "🐳 ci: configurar Docker para producción"
```

### Pipeline

```bash
git add .
git commit -m "⚙️ ci: configurar pipeline de producción"
```

### Documentación

```bash
git add .
git commit -m "📝 docs: actualizar README"
```

---

# 📤 Push

## Push de una rama existente

```bash
git push origin nombre-de-rama
```

Ejemplo:

```bash
git push origin feature/tests
```

## Primera vez que se publica una rama

```bash
git push -u origin nombre-de-rama
```

---

# 🔀 Merge a main

Actualizar `main` antes de trabajar:

```bash
git switch main
git pull origin main
```

El merge de las ramas de trabajo se realiza mediante Pull Request en GitHub.

Después del merge:

```bash
git switch main
git pull origin main
```

Al llegar los cambios a `main` se ejecuta automáticamente el pipeline de producción.

---

# 🔍 Revisar cambios

## Ver diferencias

```bash
git diff
```

## Ver diferencias de un archivo

```bash
git diff -- src/server.ts
```

## Ver diferencias de varios archivos

```bash
git diff -- package.json Dockerfile
```

## Ver últimos commits

```bash
git log --oneline --decorate -5
```

---

# 🧹 Deshacer cambios

## Deshacer cambios de un archivo que no fue committeado

```bash
git restore nombre-del-archivo
```

## Deshacer todos los cambios no committeados

```bash
git restore .
```

> ⚠️ Estos comandos eliminan los cambios locales no committeados.

---

# 🐳 Comandos útiles de Docker

## Ver todos los contenedores

```bash
docker ps -a
```

## Ver imágenes

```bash
docker images
```

## Ver volúmenes

```bash
docker volume ls
```

## Ver redes

```bash
docker network ls
```

## Eliminar contenedores detenidos

```bash
docker container prune
```

---

# ⚠️ Problemas comunes

## Puerto ocupado

Si aparece:

```text
Bind for 0.0.0.0:5434 failed: port is already allocated
```

Consultar los contenedores:

```bash
docker ps
```

Detener el contenedor que está utilizando el puerto:

```bash
docker stop <CONTAINER_ID>
```

También se puede detener el ambiente:

```bash
docker compose -f docker-compose.prod.yml down
```

O:

```bash
docker compose -f docker-compose.test.yml down
```

---

## `vitest: not found`

Si aparece:

```text
vitest: not found
```

Instalar nuevamente las dependencias:

```bash
npm ci
```

Después:

```bash
npm test
```

---

## Prisma Client no generado

Ejecutar:

```bash
npx prisma generate
```

---

## Reiniciar completamente un ambiente Docker

### Pruebas

```bash
docker compose -f docker-compose.test.yml down -v
docker compose -f docker-compose.test.yml up -d --build
```

### Producción

```bash
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up -d --build
```

---

# ✅ Checklist antes de hacer Push

```text
☐ Revisar cambios
☐ git status
☐ git diff
☐ npm ci
☐ npx prisma generate
☐ npm test
☐ npm run test:coverage
☐ Verificar Docker si hubo cambios
☐ Crear commit usando GitMoji
☐ git push
☐ Revisar GitHub Actions
```

Comandos rápidos:

```bash
git status
git diff
npm ci
npx prisma generate
npm test
npm run test:coverage
git add .
git commit -m "📝 docs: actualizar README"
git push
```

---

# 🎯 Estado del proyecto

- ✅ API RESTful
- ✅ Categorías
- ✅ Objetivos
- ✅ Tareas
- ✅ Persistencia real con PostgreSQL
- ✅ Operaciones CRUD
- ✅ Verbo `QUERY`
- ✅ Pruebas automatizadas
- ✅ Cobertura de pruebas
- ✅ Ambiente de pruebas
- ✅ Ambiente de producción
- ✅ Bases de datos independientes
- ✅ Docker
- ✅ Docker Compose
- ✅ Pipeline de pruebas
- ✅ Pipeline de producción
- ✅ Quality Gate de 60% en pruebas
- ✅ Quality Gate de 85% en producción
- ✅ GitHub Actions
- ✅ GitMoji

---

# 📌 Flujo completo recomendado

```text
                 ┌──────────────────┐
                 │   Desarrollar    │
                 └────────┬─────────┘
                          ↓
                 ┌──────────────────┐
                 │   npm test       │
                 │   coverage       │
                 └────────┬─────────┘
                          ↓
                 ┌──────────────────┐
                 │ Git + GitMoji    │
                 └────────┬─────────┘
                          ↓
                 ┌──────────────────┐
                 │      Push        │
                 └────────┬─────────┘
                          ↓
                 ┌──────────────────┐
                 │ feature/tests    │
                 │   CI de pruebas  │
                 └────────┬─────────┘
                          ↓
                    Pull Request
                          ↓
                 ┌──────────────────┐
                 │      main        │
                 └────────┬─────────┘
                          ↓
                 ┌──────────────────┐
                 │ CI/CD Producción │
                 │    ≥ 85%         │
                 └────────┬─────────┘
                          ↓
                 ┌──────────────────┐
                 │ Docker + API +   │
                 │   PostgreSQL     │
                 └──────────────────┘
```

---

## 👨‍💻 Proyecto

**Objetiva** — API para gestión de objetivos personales.

Desarrollado como proyecto académico para demostrar:

**API REST + PostgreSQL + Testing + Docker + CI/CD + GitHub Actions + GitMoji.**