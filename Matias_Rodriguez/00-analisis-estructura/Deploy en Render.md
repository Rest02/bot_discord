---
title: Deploy en Render
tags:
  - devops
  - deploy
  - render
aliases:
  - Render Deployment
  - Hosting Render
cssclasses:
  - guide-doc
---

# Deploy en Render

Guía para desplegar el bot en [Render](https://render.com) como servicio web.

## Por qué Render

- **Capa gratuita** suficiente para un bot pequeño
- **Zero-ops** — solo conectas el repo de GitHub
- **PostgreSQL gestionado** — no necesitas administrar la DB
- **HTTPS + dominio** incluido automáticamente
- **Deploy automático** al hacer push a `main`

## Estructura Requerida

El proyecto necesita un `Dockerfile` en la raíz para que Render lo detecte y construya automáticamente.

```
bot-discord/
├── Dockerfile              ← Render lo usa automáticamente
├── docker-compose.yml      ← Solo para desarrollo local
├── .env.example
├── prisma/
│   └── schema.prisma
└── src/
```

> [!warning] Render NO usa `docker-compose.yml`. Solo necesita el `Dockerfile`. La base de datos se configura aparte como servicio separado.

## Paso 1: Crear PostgreSQL en Render

1. Ir a [Render Dashboard](https://dashboard.render.com) → **New +** → **PostgreSQL**
2. Configurar:
   - **Name**: `discord-bot-db`
   - **Region**: elegir la más cercana
   - **Instance Type**: Free
3. Una vez creado, copiar la **Internal Connection String** (se ve así: `postgresql://user:pass@host:5432/db`)
4. Guardarlo como `DATABASE_URL` para el paso siguiente

> [!tip] En el plan gratis la DB se duerme tras 30 días de inactividad. Para un bot que escribe datos periódicamente, esto no debería pasar.

## Paso 2: Crear el Web Service

1. Ir a **New +** → **Web Service**
2. Conectar repositorio de GitHub
3. Configurar:

| Campo | Valor |
|-------|-------|
| **Name** | `discord-mod-bot` |
| **Region** | Misma que la DB |
| **Branch** | `main` |
| **Runtime** | `Docker` |
| **Health Check Path** | `/health` |
| **Instance Type** | Free |

4. En **Environment Variables**, agregar:

```env
DISCORD_TOKEN=tu_token_aqui
DISCORD_CLIENT_ID=tu_client_id
DISCORD_GUILD_ID=tu_guild_id
DATABASE_URL=postgresql://...  ← La Internal URL de Render PostgreSQL
NODE_ENV=production
LOG_LEVEL=info
```

5. Click en **Create Web Service**

## Health Check

Render llama periódicamente a `/health`. Si falla 3 veces seguidas, reinicia el servicio automáticamente.

```typescript
// en main.ts o health.controller.ts
@Get('/health')
async health() {
  const dbOk = await this.prisma.$queryRaw`SELECT 1`;
  return {
    status: dbOk ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
  };
}
```

## Deploy Automático

- Cada vez que hagas `git push` a `main`, Render rebuild y redeploy automáticamente
- Para desplegar sin hacer push: Dashboard → **Manual Deploy** → **Deploy latest commit**

## Logs

- Ver logs en Dashboard → **Logs** en tiempo real
- Para logs persistentes, configurar **Log Stream** a un servicio externo (opcional)

## Limitaciones del Plan Free

| Recurso | Límite |
|---------|--------|
| RAM | 512 MB |
| CPU | 0.1 vCPU |
| Ancho de banda | 100 GB/mes |
| Sleep por inactividad | 15 min sin tráfico → el servicio se duerme |

> [!tip] Para evitar el sleep del plan free, Render envía un ping al health check. Además, el bot mantiene conexión WebSocket con Discord, lo que genera tráfico constante y evita que se duerma.

## Presupuesto Estimado (Plan Free)

- Web Service: $0/mes
- PostgreSQL: $0/mes
- **Total: $0/mes** — ideal para desarrollo y pruebas

Si necesitas más recursos: plan **Starter** (~$7/mes) con 512 MB RAM y sin sleep.

## Referencias

- [[Docker]] — Dockerfile usado para el build
- [[Dockerizar y desplegar]] — guía general de deploy
- [[Arquitectura Bot Discord#Infraestructura y Despliegue]]
- [Documentación oficial Render](https://render.com/docs)
