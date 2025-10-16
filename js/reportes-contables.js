// Sistema de Reportes Contables - TaxiApp Rondón
const ReportesContables = {
    // Configuración inicial
    config: {
        empresa: 'TAXIAPP RONDÓN',
        rnc: '123456789',
        periodoFiscal: new Date().getFullYear(),
        moneda: 'RD$',
        tasaITBIS: 0.18
    },

    // Inicializar módulo
    init() {
        console.log('📊 Módulo de Reportes Contables inicializado');
        this.cargarDatos();
    },

    // Cargar datos desde localStorage
    cargarDatos() {
        const viajes = JSON.parse(localStorage.getItem('viajes') || '[]');
        const facturas = JSON.parse(localStorage.getItem('facturas') || '[]');
        return { viajes, facturas };
    },

    // Generar Estado de Resultados
    generarEstadoResultados(fechaInicio, fechaFin) {
        const { viajes } = this.cargarDatos();
        
        // Filtrar por período
        const viajesPeríodo = viajes.filter(v => {
            const fecha = new Date(v.fecha);
            return fecha >= new Date(fechaInicio) && fecha <= new Date(fechaFin);
        });

        // Calcular totales
        const ingresosBrutos = viajesPeríodo.reduce((total, v) => total + (v.tarifa || 0), 0);
        const comisiones = ingresosBrutos * 0.20; // 20% comisión
        const ingresosNetos = ingresosBrutos - comisiones;
        const itbis = ingresosNetos * this.config.tasaITBIS;

        return {
            periodo: `${fechaInicio} al ${fechaFin}`,
            ingresosBrutos,
            comisiones,
            ingresosNetos,
            itbis,
            utilidadNeta: ingresosNetos - itbis,
            cantidadViajes: viajesPeríodo.length
        };
    },

    // Generar Reporte 607 (Ventas para DGII)
    generar607(mes, año) {
        const { facturas } = this.cargarDatos();
        
        const facturasMes = facturas.filter(f => {
            const fecha = new Date(f.fecha);
            return fecha.getMonth() === mes - 1 && fecha.getFullYear() === año;
        });

        return facturasMes.map(f => ({
            rnc: f.clienteRNC || 'N/A',
            tipoId: f.clienteRNC ? '1' : '2',
            ncf: f.ncf,
            ncfModificado: '',
            fecha: f.fecha,
            montoFacturado: f.total,
            itbis: f.itbis,
            montoTotal: f.total + f.itbis
        }));
    },

    // Generar Reporte 606 (Compras para DGII)
    generar606(mes, año) {
        const compras = JSON.parse(localStorage.getItem('compras') || '[]');
        
        const comprasMes = compras.filter(c => {
            const fecha = new Date(c.fecha);
            return fecha.getMonth() === mes - 1 && fecha.getFullYear() === año;
        });

        return comprasMes.map(c => ({
            rncProveedor: c.rncProveedor || 'N/A',
            tipoId: c.rncProveedor ? '1' : '2',
            ncf: c.ncf || 'N/A',
            fechaComprobante: c.fecha,
            fechaPago: c.fechaPago || c.fecha,
            montoFacturado: c.subtotal || 0,
            itbisFact: c.itbis || 0,
            itbisRetenido: 0,
            itbisProporcional: c.itbis || 0,
            montoRetenido: c.retencion || 0,
            tipoRetencion: c.tipoRetencion || 'N/A'
        }));
    },

    // Calcular retenciones automáticas
    calcularRetenciones(monto, tipoServicio) {
        const retenciones = {
            isr: 0,
            itbis: 0
        };

        // Retención ISR según tipo de servicio
        if (tipoServicio === 'servicios_profesionales') {
            retenciones.isr = monto * 0.10; // 10% servicios profesionales
        } else if (tipoServicio === 'alquiler') {
            retenciones.isr = monto * 0.10; // 10% alquileres
        } else if (tipoServicio === 'otros_servicios') {
            retenciones.isr = monto * 0.02; // 2% otros servicios
        }

        // Retención ITBIS (30% del ITBIS para personas físicas)
        if (tipoServicio === 'servicios_pf') {
            retenciones.itbis = (monto * 0.18) * 0.30;
        }

        return retenciones;
    },

    // Generar calendario fiscal
    generarCalendarioFiscal(año) {
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        const calendario = [];
        
        meses.forEach((mes, index) => {
            // DGII - Declaración mensual (día 20 del siguiente mes)
            calendario.push({
                mes: mes,
                obligacion: 'DGII - IT-1 y 606/607',
                fechaLimite: new Date(año, index + 1, 20),
                estado: 'pendiente'
            });

            // TSS - Planilla (día 3 del siguiente mes)
            calendario.push({
                mes: mes,
                obligacion: 'TSS - Planilla',
                fechaLimite: new Date(año, index + 1, 3),
                estado: 'pendiente'
            });

            // Anticipo ISR (día 15)
            calendario.push({
                mes: mes,
                obligacion: 'Anticipo ISR',
                fechaLimite: new Date(año, index, 15),
                estado: 'pendiente'
            });
        });

        return calendario;
    },

    // Generar resumen fiscal mensual
    generarResumenFiscal(mes, año) {
        const ventas = this.generar607(mes, año);
        const compras = this.generar606(mes, año);
        
        const totalVentas = ventas.reduce((sum, v) => sum + v.montoFacturado, 0);
        const itbisVentas = ventas.reduce((sum, v) => sum + v.itbis, 0);
        
        const totalCompras = compras.reduce((sum, c) => sum + c.montoFacturado, 0);
        const itbisCompras = compras.reduce((sum, c) => sum + c.itbisFact, 0);
        
        return {
            periodo: `${mes}/${año}`,
            ventas: {
                total: totalVentas,
                itbis: itbisVentas,
                cantidad: ventas.length
            },
            compras: {
                total: totalCompras,
                itbis: itbisCompras,
                cantidad: compras.length
            },
            itbisPorPagar: itbisVentas - itbisCompras,
            isrEstimado: totalVentas * 0.015, // 1.5% anticipo
            totalAPagar: (itbisVentas - itbisCompras) + (totalVentas * 0.015)
        };
    },

    // Exportar a Excel (CSV)
    exportarExcel(datos, nombreArchivo) {
        let csv = '';
        
        // Obtener headers
        if (datos.length > 0) {
            csv = Object.keys(datos[0]).join(',') + '\n';
        }
        
        // Agregar filas
        datos.forEach(fila => {
            csv += Object.values(fila).join(',') + '\n';
        });
        
        // Crear y descargar archivo
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    },

    // Generar Dashboard de métricas
    generarDashboard() {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        
        const estadoResultados = this.generarEstadoResultados(
            inicioMes.toISOString().split('T')[0],
            hoy.toISOString().split('T')[0]
        );
        
        return {
            mesActual: estadoResultados,
            reporte607: this.generar607(hoy.getMonth() + 1, hoy.getFullYear())
        };
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    ReportesContables.init();
});