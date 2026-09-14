# Despliegue seguro a Railway
# Aborta si el servicio vinculado no es "web"

$SERVICIO_ESPERADO = "web"

Write-Host "Verificando servicio y entorno..." -ForegroundColor Cyan

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

# Detectar el entorno vinculado
$entornoActual = "desconocido"
if ($estado -match "Environment:\s*(\S+)") {
    $entornoActual = $Matches[1].Trim()
}

Write-Host "Entorno vinculado: $entornoActual" -ForegroundColor Cyan

if ($entornoActual -eq "production") {
    Write-Host ""
    Write-Host "ATENCION: vas a desplegar a PRODUCCION." -ForegroundColor Yellow
    Write-Host "Esto lo veran los clientes de inmediato." -ForegroundColor Yellow
    $respuesta = Read-Host "Escribe PRODUCCION para continuar, o cualquier otra cosa para cancelar"
    if ($respuesta -ne "PRODUCCION") {
        Write-Host "CANCELADO por el usuario." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Desplegando a $entornoActual..." -ForegroundColor Cyan

railway up