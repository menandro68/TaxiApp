const Database = require('better-sqlite3');
const path = require('path');

class SuspensionsModel {
    constructor() {
        this.db = new Database(path.join(__dirname, '..', 'taxiapp.db'));
    }

    // Obtener todas las suspensiones activas
    getActiveSuspensions() {
        const sql = `
            SELECT 
                ds.*,
                d.name as driver_name,
                d.email as driver_email,
                d.phone as driver_phone,
                d.vehicle_plate
            FROM driver_suspensions ds
            JOIN drivers d ON ds.driver_id = d.id
            WHERE ds.status = 'active'
            ORDER BY ds.suspended_at DESC
        `;
        return this.db.prepare(sql).all();
    }

    // Obtener historial completo de suspensiones
    getAllSuspensions() {
        const sql = `
            SELECT 
                ds.*,
                d.name as driver_name,
                d.email as driver_email,
                d.vehicle_plate
            FROM driver_suspensions ds
            JOIN drivers d ON ds.driver_id = d.id
            ORDER BY ds.suspended_at DESC
            LIMIT 100
        `;
        return this.db.prepare(sql).all();
    }

    // Obtener suspensiones de un conductor específico
    getDriverSuspensions(driverId) {
        const sql = `
            SELECT * FROM driver_suspensions 
            WHERE driver_id = ?
            ORDER BY suspended_at DESC
        `;
        return this.db.prepare(sql).all(driverId);
    }

    // Crear nueva suspensión
    createSuspension(driverId, type, reason, durationHours = null, createdBy = 'admin') {
        // Primero obtenemos el nombre del conductor
        const driver = this.db.prepare('SELECT name FROM drivers WHERE id = ?').get(driverId);
        if (!driver) {
            throw new Error('Conductor no encontrado');
        }

        // Calculamos la fecha de expiración si es temporal
        let expiresAt = null;
        if (type === 'temporal' && durationHours) {
            const expDate = new Date();
            expDate.setHours(expDate.getHours() + durationHours);
            expiresAt = expDate.toISOString();
        }

        const sql = `
            INSERT INTO driver_suspensions 
            (driver_id, driver_name, type, reason, duration_hours, expires_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const stmt = this.db.prepare(sql);
        const result = stmt.run(driverId, driver.name, type, reason, durationHours, expiresAt, createdBy);

        // Actualizar el estado del conductor
        this.updateDriverStatus(driverId, 'suspended');

        return { id: result.lastInsertRowid, success: true };
    }

    // Levantar suspensión
    liftSuspension(suspensionId, liftedBy, liftedReason) {
        // Obtener información de la suspensión
        const suspension = this.db.prepare('SELECT * FROM driver_suspensions WHERE id = ?').get(suspensionId);
        if (!suspension) {
            throw new Error('Suspensión no encontrada');
        }

        // Actualizar la suspensión
        const sql = `
            UPDATE driver_suspensions 
            SET status = 'lifted',
                lifted_at = CURRENT_TIMESTAMP,
                lifted_by = ?,
                lifted_reason = ?
            WHERE id = ?
        `;

        this.db.prepare(sql).run(liftedBy, liftedReason, suspensionId);

        // Reactivar el conductor
        this.updateDriverStatus(suspension.driver_id, 'active');

        return { success: true };
    }

    // Actualizar estado del conductor
    updateDriverStatus(driverId, status) {
        const sql = 'UPDATE drivers SET status = ? WHERE id = ?';
        this.db.prepare(sql).run(status, driverId);
    }

    // Verificar y actualizar suspensiones expiradas
    checkExpiredSuspensions() {
        // Obtener suspensiones temporales que han expirado
        const sql = `
            SELECT * FROM driver_suspensions 
            WHERE type = 'temporal' 
            AND status = 'active'
            AND expires_at < datetime('now')
        `;

        const expired = this.db.prepare(sql).all();

        expired.forEach(suspension => {
            // Marcar como expirada
            this.db.prepare(`
                UPDATE driver_suspensions 
                SET status = 'expired' 
                WHERE id = ?
            `).run(suspension.id);

            // Reactivar el conductor
            this.updateDriverStatus(suspension.driver_id, 'active');
        });

        return expired.length;
    }

    // Obtener estadísticas de suspensiones
    getStatistics() {
        const stats = {
            active: this.db.prepare("SELECT COUNT(*) as count FROM driver_suspensions WHERE status = 'active'").get().count,
            temporal: this.db.prepare("SELECT COUNT(*) as count FROM driver_suspensions WHERE type = 'temporal' AND status = 'active'").get().count,
            permanent: this.db.prepare("SELECT COUNT(*) as count FROM driver_suspensions WHERE type = 'permanent' AND status = 'active'").get().count,
            lifted: this.db.prepare("SELECT COUNT(*) as count FROM driver_suspensions WHERE status = 'lifted'").get().count,
            expired: this.db.prepare("SELECT COUNT(*) as count FROM driver_suspensions WHERE status = 'expired'").get().count
        };
        return stats;
    }
}

module.exports = new SuspensionsModel();