# INCIDENT RESPONSE - Squid Apps

> Guia profesional para manejar incidentes en produccion.
> Apps: Squid Conductor (driver) + Squidd Usuario (passenger).
> Ultima actualizacion: Mayo 28, 2026

---

## ARQUITECTURA

Cliente movil (Android/iOS)
   |
api.squidapps.org (Cloudflare DNS + Worker failover)
   |
Cloudflare Worker (squid-failover)
   |
Railway responde en <5seg?
   SI  -> Railway PRIMARIO -> Neon PostgreSQL
   NO  -> Render FAILOVER (Starter 7 USD/mes, no duerme) -> Neon PostgreSQL

Monitoreo: UptimeRobot cada 5 min -> menandro1968@gmail.com

---

## APPS EN PRODUCCION

| App | Package ID | Plataforma | Estado |
|---|---|---|---|
| Squid Conductor | com.squidappsrd.conductor | Google Play | Activo |
| Squidd Usuario | com.squidappsrd.pasajero | Google Play | Activo |

iOS: codigo 100% preparado, pendiente compra Mac Mini M2.

---

## URLs CRITICAS

| Servicio | URL |
|---|---|
| Backend publico | https://api.squidapps.org |
| Railway (primario) | https://web-production-99844.up.railway.app |
| Render (failover) | https://squid-apps-failover.onrender.com |
| Sitio web | https://squidapps.org |
| Health check | /health |

---

## DASHBOARDS

| Recurso | URL |
|---|---|
| Railway | https://railway.app/dashboard |
| Render | https://dashboard.render.com (servicio: squid-apps-failover) |
| Cloudflare DNS | https://dash.cloudflare.com -> squidapps.org -> DNS |
| Cloudflare Worker | https://dash.cloudflare.com -> Workers -> squid-failover |
| Neon DB | https://console.neon.tech |
| UptimeRobot | https://dashboard.uptimerobot.com/monitors |
| Google Play Console | https://play.google.com/console |
| GitHub repo | https://github.com/menandro68/TaxiApp (branch: main) |

---

## CUENTA DEMO GOOGLE PLAY REVIEW

| Campo | Valor |
|---|---|
| App | Squid Conductor |
| Email | googledemo@squidappsrd.com |
| Password | Google2026Squid! |
| driver_id | 107 |
| Status | active |

Mantener inactiva pero valida para futuras revisiones.

---

## ESCENARIOS DE INCIDENTES

### ESCENARIO 1: api.squidapps.org devuelve 502/503/timeout

Diagnostico rapido (PowerShell):

    Invoke-WebRequest -Uri "https://api.squidapps.org/health" -Method GET | Select-Object StatusCode
    Invoke-WebRequest -Uri "https://web-production-99844.up.railway.app/health" -Method GET | Select-Object StatusCode
    Invoke-WebRequest -Uri "https://squid-apps-failover.onrender.com/health" -Method GET | Select-Object StatusCode

Interpretacion:
- Si los 3 estan en 200 -> problema temporal de propagacion. Esperar 2-3 min.
- Si Railway 502 y Render 200 -> Worker debe estar haciendo failover automatico.
- Si Railway y Render fallan -> revisar Neon DB (escenario 3).

Accion:
1. Revisar logs del Worker: Cloudflare -> squid-failover -> Observabilidad.
2. Revisar deployments Railway.
3. Si Railway tiene deploy fallido reciente -> rollback al ultimo deploy exitoso.

---

### ESCENARIO 2: Railway completamente caido (proveedor)

Diagnostico:
- Status: https://status.railway.com
- Monitores UptimeRobot en rojo para web-production-99844.up.railway.app.

Accion:
- El Worker debe enrutar automaticamente a Render (sin accion manual).
- Verificar Render funcionando: api.squidapps.org/health debe dar 200.
- Si todo OK por Render -> esperar restauracion Railway, no tocar nada.
- Si Render tambien degradado -> escalar instance type en Render (Starter -> Standard).

---

### ESCENARIO 3: Neon PostgreSQL caido

Sintomas: Apps no pueden login, no cargan viajes, no aceptan trips.

Accion:
1. Verificar status Neon: https://neonstatus.com
2. Verificar dashboard Neon: console.neon.tech.
3. Si Neon caido -> no hay failover de DB. Esperar restauracion (SLA 99.95%).
4. Comunicar a conductores y usuarios via WhatsApp.

---

### ESCENARIO 4: Crash de la app en celulares

Sintomas: Multiples reportes de crash al abrir/usar la app.

Diagnostico:
1. Google Play Console -> Squid Conductor / Squidd Usuario -> Crashes y errores.
2. Identificar stack trace y version afectada.

Accion:
1. Si el crash afecta a TODOS los usuarios -> hotfix urgente.
2. Si afecta a una version vieja -> forzar actualizacion (update minimo en Play Console).
3. Subir nueva versionCode con fix siguiendo PROTOCOLO 7 PASOS.

---

### ESCENARIO 5: Google Play rechaza nueva version

Sintomas: Email de Play Console rechazando submission.

Causas comunes:
- Misleading Claims: nombre de app o icono no coincide con listing.
- Permisos sin justificar.
- Politicas de privacidad obsoletas.

Accion:
1. Leer email de Play Console con motivo exacto.
2. Corregir issue especifico (no cambiar lo no relacionado).
3. Resubir con versionCode incrementado.
4. Mantener cuenta DEMO activa: googledemo@squidappsrd.com.

---

### ESCENARIO 6: Render dormido o lento

Sintomas: Primera request a squid-apps-failover.onrender.com tarda 30-60 seg.

Verificacion:
- Render -> squid-apps-failover -> debe mostrar plan Starter (NO Free).
- Si dice Free -> upgrade a Starter (7 USD/mes) inmediatamente.

Accion: Plan Starter ya activo (mayo 2026).

---

### ESCENARIO 7: Cloudflare Worker dejo de funcionar

Sintomas: api.squidapps.org no responde, pero backends directos si.

Diagnostico:
- Cloudflare -> Workers -> squid-failover -> Observabilidad.
- Probar URL directa: https://squid-failover.menandro1968.workers.dev/health

Accion:
1. Si Worker tiene errores de codigo -> revisar ultimo deploy y revertir.
2. Si Worker OK pero dominio no enruta -> Cloudflare DNS -> verificar Worker route.
3. Emergencia extrema: cambiar DNS api a CNAME directo a Railway temporalmente.

---

## COMANDOS DE EMERGENCIA

Verificar todo el stack rapido (PowerShell):

    Write-Host "=== PUBLICO ==="; Invoke-WebRequest "https://api.squidapps.org/health" | Select StatusCode
    Write-Host "=== RAILWAY ==="; Invoke-WebRequest "https://web-production-99844.up.railway.app/health" | Select StatusCode
    Write-Host "=== RENDER ==="; Invoke-WebRequest "https://squid-apps-failover.onrender.com/health" | Select StatusCode

Probar failover manual (riesgo CONTROLADO):
1. Cloudflare -> squid-failover -> Editar codigo.
2. Cambiar const PRIMARY a URL invalida (ej: https://nonexistent-test-12345.example.invalid).
3. Desplegar.
4. Verificar api.squidapps.org/health -> debe dar 200 (sirve desde Render).
5. REVERTIR INMEDIATAMENTE: restaurar PRIMARY a https://web-production-99844.up.railway.app y desplegar.

---

## PROTOCOLO 7 PASOS - VERIFICAR CAMBIOS JS EN APK ANTES DE PLAY STORE

1. Verificar codigo con Get-Content + Select-String.
2. cd android; .\gradlew clean.
3. Borrar bundles viejos.
4. cd ..; npx react-native bundle.
5. Verificar bundle con findstr.
6. cd android; .\gradlew assembleDebug.
7. Verificar APK final extrayendo + findstr.

REGLA: SIEMPRE probar APK release (sin Metro) antes de subir AAB.
REGLA: Notas de version OBLIGATORIAS antes de "Enviar a revision" en Play Console.

---

## CONTACTOS Y RECURSOS

| Servicio | Recurso |
|---|---|
| Railway support | https://railway.app/help |
| Render support | https://render.com/docs/support |
| Cloudflare support | https://dash.cloudflare.com -> Soporte |
| Neon support | https://console.neon.tech -> Help |
| UptimeRobot | https://uptimerobot.com/contact |
| Google Play | https://support.google.com/googleplay/android-developer |

---

## COSTOS MENSUALES FIJOS

| Servicio | Plan | Costo |
|---|---|---|
| Railway | Hobby (workspace) | 0 USD |
| Render | Starter instance | 7 USD/mes |
| Cloudflare | Free + Workers Free | 0 USD |
| Neon | Free tier | 0 USD |
| UptimeRobot | Free | 0 USD |
| Google Play (one-time) | Developer | 25 USD pagado |
| TOTAL recurrente | | 7 USD/mes |

Cobro automatico: Visa terminada en 2745.

---

## HISTORIAL DE INCIDENTES

| Fecha | Incidente | Resolucion | Tiempo |
|---|---|---|---|
| Sin incidentes registrados | | | |

---

Mantenido por: Menandro
Repo: github.com/menandro68/TaxiApp
