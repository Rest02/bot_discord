---
title: Registrar Bot en Discord Portal
tags:
  - setup
  - discord
  - guia
aliases:
  - Crear Bot Discord
  - Discord Developer Portal
cssclasses:
  - guide-doc
---

# Registrar Bot en Discord Portal

Guía paso a paso para crear la aplicación de Discord y obtener el token del bot.

## Paso 1: Crear Aplicación

1. Ir a [Discord Developer Portal](https://discord.com/developers/applications)
2. Click en **New Application**
3. Ingresar nombre (ej: `ModBot`) y crear
4. En pestaña **General Information**:
   - Subir avatar del bot (opcional)
   - Copiar **Application ID** → `DISCORD_CLIENT_ID`

## Paso 2: Configurar el Bot

1. Ir a pestaña **Bot** → **Add Bot**
2. Configurar:
   - **Username**: nombre del bot
   - **Token**: click en **Reset Token** → copiar y guardar como `DISCORD_TOKEN`
   - **Public Bot**: ON
   - **Requires OAuth2 Code Grant**: OFF

3. **Privileged Gateway Intents** (obligatorio):
   - ✅ **Presence Intent**
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**

> [!warning] El token solo se muestra una vez. Guárdalo en `.env` inmediatamente.

## Paso 3: Invitar el Bot al Servidor

1. Ir a pestaña **OAuth2** → **URL Generator**
2. Scopes:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Bot Permissions:
   - ✅ `Send Messages`
   - ✅ `Read Message History`
   - ✅ `Kick Members`
   - ✅ `Ban Members`
   - ✅ `Moderate Members`
4. Copiar la URL generada y abrir en navegador
5. Seleccionar servidor y confirmar

## Variables de Entorno

```env
DISCORD_TOKEN=MTk4NjIyNjg2ODQ5MjQzMjMy.Gu4R8x.xxxx
DISCORD_CLIENT_ID=123456789012345678
DISCORD_GUILD_ID=987654321098765432
```

> [!tip] El `GUILD_ID` se obtiene activando **Developer Mode** en Discord → click derecho en servidor → **Copy ID**.

## Referencias

- [[Arquitectura Bot Discord]]
- [[Configurar NestJS + Prisma]]
