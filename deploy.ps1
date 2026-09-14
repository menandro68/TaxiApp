# Despliegue seguro a Railway
# Aborta si el servicio vinculado no es "web"

$SERVICIO_ESPERADO = "web"

Write-Host "Verificando servicio vinculado..." -ForegroundColor Cyan

$estado = railway status 2>&1 | Out-String

if ($estado -notmatch "Linked service\s*\r?\n\s*(\S+)") {
    Write-Host "ABORTADO: no se pudo determinar el servicio vinculado." -ForegroundColor Red
    exit 1
}

$servicioActual = $Matches[1].Trim()

if ($servicioActual -ne $SERVICIO_ESPERADO) {
    Write-Host "ABORTADO: el servicio vinculado es '$servicioActual', se esperaba '$SERVICIO_ESPERADO'." -ForegroundColor Red
    Write-Host "Corrige con: railway service" -ForegroundColor Yellow
    exit 1
}

Write-Host "Servicio correcto: $servicioActual" -ForegroundColor Green
Write-Host "Desplegando..." -ForegroundColor Cyan

railway up