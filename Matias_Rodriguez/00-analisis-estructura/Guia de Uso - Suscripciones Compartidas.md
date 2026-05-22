---
title: Guía de Uso — Suscripciones Compartidas
date: 2026-05-22
tags:
  - guia
  - usuario
  - suscripciones
  - discord-bot
aliases:
  - Cómo usar suscripciones compartidas
  - User Guide Subscriptions
cssclasses:
  - guia-usuario
---

# Guía de Uso — Suscripciones Compartidas

> [!info] ¿Qué es esto?
> Un sistema para gestionar **suscripciones compartidas** dentro de tu comunidad de Discord. Ideal para servicios como Spotify Familiar, Netflix, YouTube Premium, etc. donde un grupo de amigos divide el costo mensual.

---

## 📋 Comandos Disponibles

### Para todos los miembros (Público)

#### 1. Unirse a una suscripción

```
/suscripcion unirse nombre: spotify
```

Te registras como miembro de la suscripción. Solo puedes unirte si hay cupos disponibles.

> [!tip] El nombre de la suscripción te lo da el administrador que la creó. Puede ser `spotify`, `netflix`, `yt-premium`, etc.

#### 2. Ver el estado general

```
/suscripcion estado nombre: spotify
```

Muestra:
- 💰 **Cuota por persona** — cuánto le toca pagar a cada uno este mes
- 🏷️ **Cupos** — cuántos miembros hay vs el límite máximo (ej: `3/6`)
- 👥 **Lista de miembros** — quiénes están al día (💎) y quiénes deben (🔴)

#### 3. Ver tu historial de pagos

```
/suscripcion historial nombre: spotify
```

Muestra una línea de tiempo mes a mes con tus pagos:

```
📋 ESTADO TEMPORAL Y COBERTURA DE PAGOS
Suscripción: spotify | Usuario: @TuNombre
--------------------------------------------------------------
Mes         | Estado              | Fecha Pago | Detalle
--------------------------------------------------------------
Mayo 2026   | [🟢 AL DÍA]         | 2026-05-01 | Mes Actual
Junio 2026  | [💎 ADELANTADO]     | 2026-05-01 | Pago por Adelantado
Julio 2026  | [💎 ADELANTADO]     | 2026-05-01 | Pago por Adelantado
Agosto 2026 | [🔴 PENDIENTE]      | --         | Requiere Pago
--------------------------------------------------------------

📊 Resumen: Tienes 2 meses cubiertos por adelantado.
```

---

### Solo para administradores del servidor

> [!warning] Estos comandos requieren permiso **Administrador** en el servidor de Discord.

#### 4. Crear una suscripción

```
/suscripcion crear nombre: spotify monto_total: 6000 dia_cobro: 10 limite_usuarios: 6
```

| Opción | Descripción | Ejemplo |
|--------|-------------|---------|
| `nombre` | Nombre identificador (único) | `spotify` |
| `monto_total` | Costo total mensual en pesos | `6000` |
| `dia_cobro` | Día del mes en que se cobra (1-28) | `10` |
| `limite_usuarios` | Máximo de miembros permitidos | `6` |
| `canal_recordatorio` | (Opcional) Canal para alertas de pago | `#general` |

Al crear la suscripción, **quedas designado como Administrador de la Suscripción**.

#### 5. Modificar el monto total

```
/suscripcion modificar nombre: spotify nuevo_monto_total: 7200
```

> [!tip] Útil si la plataforma subió el precio. El cambio aplica para los ciclos siguientes.

---

### Solo para el Administrador de la Suscripción

> [!warning] El administrador de la suscripción es la persona que la creó (`adminDiscordId`). No necesariamente es Admin del servidor.

#### 6. Agregar un miembro manualmente

```
/suscripcion agregar nombre: spotify usuario: @Juan
```

Fuerza la entrada de un usuario específico, respetando el límite de cupos. Útil si alguien no puede usar el comando `/suscripcion unirse`.

#### 7. Remover un miembro

```
/suscripcion remover nombre: spotify usuario: @Maria
```

Da de baja a un usuario. Su cupo queda libre inmediatamente.

#### 8. Registrar un pago

```
/pagar suscripcion: spotify usuario: @Juan meses: 3
```

| Opción | Descripción |
|--------|-------------|
| `suscripcion` | Nombre de la suscripción |
| `usuario` | Miembro que realizó el pago |
| `meses` | Cantidad de meses que cubre (máx 12) |

> [!tip] El bot calcula automáticamente el monto: `(monto_total / miembros_activos) × meses`. Por ejemplo, si son 3 miembros y el total es $6000, cada mes son $2000 por persona.

**¿Qué pasa después del pago?**
1. Se registra en el historial del usuario.
2. Se suman los meses a su saldo (`meses_a_favor`).
3. El usuario recibe un **Mensaje Directo (MD)** del bot confirmando la transacción.

---

## 🧠 ¿Cómo funciona el sistema de "meses a favor"?

El concepto es simple: puedes **pagar por adelantado** para no preocuparte del cobro mensual.

**Ejemplo:**
- Hoy es 1 de mayo. Pagas 3 meses de una vez.
- Tu estado queda: **Mayo** 🟢 Al día → **Junio** 💎 Adelantado → **Julio** 💎 Adelantado
- En **Agosto** estarías 🔴 Pendiente.

Cada mes, el sistema **descuenta automáticamente 1 mes** de tu saldo. Mientras tengas meses a favor, no recibirás recordatorios de pago.

---

## 🤖 Automatizaciones

### Recordatorios automáticos

3 días antes del `dia_cobro`, el bot envía un mensaje al canal configurado mencionando solo a quienes **están pendientes de pago**. Si tienes meses a favor, no te molesta.

### Cierre de ciclo mensual

Al día siguiente del `dia_cobro`, el sistema:
- **Resta 1 mes** a quienes tienen saldo a favor.
- **Marca como pendientes** a quienes llegaron a 0.

---

## ❓ Preguntas Frecuentes

**¿Puedo unirme a una suscripción que ya está llena?**
No. Si el límite de usuarios ya se alcanzó, el comando `/suscripcion unirse` te rechazará. Pídele al administrador que aumente el límite o que remueva a alguien inactivo.

**¿Qué pasa si no pago?**
Recibirás recordatorios antes del cobro. Si al cierre del ciclo no tienes meses a favor, quedarás como **🔴 Pendiente**. El administrador decide cómo proceder.

**¿Puedo pagar por otro miembro?**
Sí, el administrador puede usar `/pagar` para cualquier miembro de la suscripción.

**¿Puedo pagar menos de 1 mes?**
No. El mínimo es 1 mes y el máximo es 12 meses por transacción.

**¿Qué hago si quiero salirme de la suscripción?**
Pídele al administrador que use `/suscripcion remover` para darte de baja.

---

> [!quote] ¿Problemas o dudas?
> Consulta con el administrador del servidor. Si el error persiste, revisa los logs del bot.

## Referencias

- [[Implementacion SuscripcionModule]] — documentación técnica del módulo
- [[Arquitectura Bot Discord]] — arquitectura general del bot
