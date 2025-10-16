// Sistema de Reportes Automatizados - TaxiApp
const cron = require('node-cron');
const db = require('./config/database');

// Configuración (cambiar con tus datos reales)
const CONFIG = {
    adminEmail: 'admin@taxiapp.com',
    adminPhone: '+18095551234', // Número con WhatsApp
    nombreEmpresa: 'TaxiApp Santo Domingo',
    comisionPorcentaje: 0.20 // 20%
};

// Función principal de reporte diario
async function generarReporteDiario() {
    const hoy = new Date().toISOString().split('T')[0];
    console.log(`📊 Generando reporte del día: ${hoy}`);
    
    try {
        // Obtener métricas del día
        const metricas = await obtenerMetricasDiarias(hoy);
        
        // Crear mensaje de reporte
        const mensaje = crearMensajeReporte(metricas, hoy);
        
        // Enviar reporte (por ahora solo console.log)
        console.log(mensaje);
        
        // TODO: Implementar envío por WhatsApp/Email
        
        return mensaje;
    } catch (error) {
        console.error('Error generando reporte:', error);
    }
}

// Obtener métricas del día
function obtenerMetricasDiarias(fecha) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                COUNT(*) as total_viajes,
                COUNT(DISTINCT driver_id) as conductores_activos,
                COUNT(DISTINCT user_id) as usuarios_unicos,
                COALESCE(SUM(price), 0) as ingresos_brutos,
                COALESCE(AVG(price), 0) as tarifa_promedio,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelaciones,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completados
            FROM trips 
            WHERE DATE(created_at) = ?
        `;
        
        db.get(query, [fecha], (err, row) => {
            if (err) reject(err);
            else resolve(row || {});
        });
    });
}

// Crear mensaje formateado
function crearMensajeReporte(metricas, fecha) {
    const comisiones = metricas.ingresos_brutos * CONFIG.comisionPorcentaje;
    const tasaCancelacion = metricas.total_viajes > 0 
        ? ((metricas.cancelaciones / metricas.total_viajes) * 100).toFixed(1)
        : 0;
    
    return `
📊 REPORTE DIARIO - ${CONFIG.nombreEmpresa}
📅 Fecha: ${fecha}
================================

💰 FINANZAS:
- Ingresos Brutos: RD$${metricas.ingresos_brutos.toFixed(2)}
- Comisiones (20%): RD$${comisiones.toFixed(2)}
- Ganancia Neta: RD$${(metricas.ingresos_brutos - comisiones).toFixed(2)}
- Tarifa Promedio: RD$${metricas.tarifa_promedio.toFixed(2)}

🚗 OPERACIONES:
- Total Viajes: ${metricas.total_viajes}
- Viajes Completados: ${metricas.completados}
- Conductores Activos: ${metricas.conductores_activos}
- Usuarios Únicos: ${metricas.usuarios_unicos}

📈 INDICADORES:
- Tasa de Cancelación: ${tasaCancelacion}%
- Promedio por Conductor: ${metricas.conductores_activos > 0 
    ? (metricas.ingresos_brutos / metricas.conductores_activos).toFixed(2) 
    : 0} RD$

${generarAlertas(metricas)}

================================
Generado automáticamente a las ${new Date().toLocaleTimeString('es-DO')}
`;
}

// Generar alertas según métricas
function generarAlertas(metricas) {
    let alertas = '⚠️ ALERTAS:\n';
    let hayAlertas = false;
    
    if (metricas.total_viajes === 0) {
        alertas += '• 🔴 No hay viajes registrados hoy\n';
        hayAlertas = true;
    }
    
    if (metricas.cancelaciones > metricas.completados) {
        alertas += '• 🟡 Más cancelaciones que viajes completados\n';
        hayAlertas = true;
    }
    
    if (metricas.conductores_activos < 3) {
        alertas += '• 🟡 Pocos conductores activos\n';
        hayAlertas = true;
    }
    
    return hayAlertas ? alertas : '✅ Sin alertas - Todo operando normal';
}

// Programar reportes
function iniciarReportesAutomaticos() {
    console.log('🚀 Sistema de Reportes Automatizados activado');
    
    // Reporte diario a las 8:00 PM
    cron.schedule('0 20 * * *', () => {
        console.log('⏰ Ejecutando reporte diario...');
        generarReporteDiario();
    });
    
    // Reporte de prueba cada minuto (SOLO PARA TESTING)
    // Comentar en producción
    cron.schedule('* * * * *', () => {
        console.log('🧪 Reporte de prueba (cada minuto)');
        generarReporteDiario();
    });
}

// Exportar funciones
module.exports = {
    generarReporteDiario,
    iniciarReportesAutomaticos,
    obtenerMetricasDiarias
};

// Si se ejecuta directamente, generar reporte de prueba
if (require.main === module) {
    console.log('🧪 Ejecutando reporte de prueba...');
    generarReporteDiario().then(reporte => {
        console.log('✅ Reporte generado exitosamente');
        process.exit(0);
    });
}