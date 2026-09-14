# Rutina semanal de mantenimiento - Squid Apps

Duracion: 5 minutos. Recomendado: lunes por la manana.

---

## Paso 1. Chequeo automatico (30 segundos)

Ejecutar en la terminal:

    cd C:\Users\DELL\Documents\TaxiApp
    powershell -ExecutionPolicy Bypass -File .\chequeo-semanal.ps1

Debe salir TODO EN ORDEN. Si sale alguna FALLA, atenderla antes de seguir.

---

## Paso 2. Revisar errores de la semana (1 minuto)

Abrir: https://squidapps.sentry.io/issues/

Mirar si hay errores nuevos. Si los hay, anotar cual se repite mas para trabajarlo despues.

---

## Paso 3. Confirmar el respaldo de anoche (30 segundos)

Railway, servicio Postgres, pestana Backups.

Verificar que el respaldo mas reciente sea de hoy o de ayer.

---

## Paso 4. Revisar los monitores (30 segundos)

Abrir: https://dashboard.uptimerobot.com/monitors

Confirmar que todos esten en verde y revisar si hubo incidentes durante la semana.

---

## Paso 5. Prueba real de punta a punta (2 minutos)

La mas importante y la unica que no se puede automatizar.

1. Conectarse en la app conductor
2. Solicitar un viaje desde la app usuario
3. Confirmar que llega la notificacion al conductor
4. Aceptar el viaje y verificar que el mapa carga bien
5. Cancelar el viaje

Si la notificacion no llega, hay un problema serio aunque todo lo demas este en verde.

---

## Paso 6. Anotar (30 segundos)

Si algo salio mal, anotarlo para trabajarlo en la proxima sesion.