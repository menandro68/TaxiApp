# Chequeo semanal de salud de Squid
# Uso: powershell -ExecutionPolicy Bypass -File .\chequeo-semanal.ps1

$BASE = "https://squidapps.org"
$fallas = 0

function Consultar($ruta) {
    $req = [System.Net.WebRequest]::Create("$BASE$ruta")
    $req.Timeout = 30000
    try { $resp = $req.GetResponse() }
    catch [System.Net.WebException] { $resp = $_.Exception.Response }
    catch { return @{ codigo = 0; cuerpo = "sin respuesta" } }

    if (-not $resp) { return @{ codigo = 0; cuerpo = "sin respuesta" } }

    $codigo = [int]$resp.StatusCode
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $cuerpo = $sr.ReadToEnd()
    $sr.Close()
    return @{ codigo = $codigo; cuerpo = $cuerpo }
}

Write-Host ""
Write-Host "CHEQUEO SEMANAL DE SQUID - $(Get-Date -Format 'dd/MM/yyyy HH:mm')" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$pruebas = @(
    @{ nombre = "Servidor responde"; ruta = "/health" },
    @{ nombre = "Base de datos"; ruta = "/health/db" },
    @{ nombre = "Actividad de viajes"; ruta = "/health/business" },
    @{ nombre = "Notificaciones"; ruta = "/health/fcm" }
)

foreach ($p in $pruebas) {
    $r = Consultar $p.ruta
    if ($r.codigo -eq 200) {
        Write-Host ("OK    " + $p.nombre) -ForegroundColor Green
    } else {
        Write-Host ("FALLA " + $p.nombre + " (codigo " + $r.codigo + ")") -ForegroundColor Red
        Write-Host ("      " + $r.cuerpo) -ForegroundColor Yellow
        $fallas++
    }
}

Write-Host ""
Write-Host "--- Detalle ---" -ForegroundColor Cyan
$neg = Consultar "/health/business"
Write-Host $neg.cuerpo
$fcm = Consultar "/health/fcm"
Write-Host $fcm.cuerpo

Write-Host ""
if ($fallas -eq 0) {
    Write-Host "TODO EN ORDEN" -ForegroundColor Green
} else {
    Write-Host "$fallas PUNTO(S) CON PROBLEMA - revisar arriba" -ForegroundColor Red
}

Write-Host ""
Write-Host "Falta la prueba manual: solicitar un viaje de prueba y confirmar que llega la notificacion al conductor." -ForegroundColor Cyan
Write-Host ""