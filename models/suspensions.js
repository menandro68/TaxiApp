const db = require('../config/database');

class SuspensionsModel {
    // Obtener todas las suspensiones activas
    async getActiveSuspensions() {
        try {
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
            const result = await db.query(sql);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    // Obtener historial completo de suspensiones
    async getAllSuspensions() {
        try {
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
            const result = await db.query(sql);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    // Obtener suspensiones de un conductor específico
    async getDriverSuspensions(driverId) {
        try {
            const sql = `
                SELECT * FROM driver_suspensions 
                WHERE driver_id = $1
                ORDER BY suspended_at DESC
            `;
            const result = await db.query(sql, [driverId]);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    // Crear nueva suspensión
    async createSuspension(driverId, type, reason, durationHours = null, createdBy = 'admin') {
        try {
            // Primero obtenemos el nombre del conductor
            const driverResult = await db.query('SELECT name FROM drivers WHERE id = $1', [driverId]);
            if (driverResult.rows.length === 0) {
                throw new Error('Conductor no encontrado');
            }

            const driver = driverResult.rows[0];

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
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `;

            const result = await db.query(sql, [driverId, driver.name, type, reason, durationHours, expiresAt, createdBy]);

            // Actualizar el estado del conductor
            await this.updateDriverStatus(driverId, 'suspended');

            return { id: result.rows[0].id, success: true };
        } catch (error) {
            throw error;
        }
    }

    // Levantar suspensión
    async liftSuspension(suspensionId, liftedBy, liftedReason) {
        try {
            // Obtener información de la suspensión
            const suspensionResult = await db.query('SELECT * FROM driver_suspensions WHERE id = $1', [suspensionId]);
            if (suspensionResult.rows.length === 0) {
                throw new Error('Suspensión no encontrada');
            }

            const suspension = suspensionResult.rows[0];

            // Actualizar la suspensión
            const sql = `
                UPDATE driver_suspensions 
                SET status = 'lifted',
                    lifted_at = CURRENT_TIMESTAMP,
                    lifted_by = $1,
                    lifted_reason = $2
                WHERE id = $3
            `;

            await db.query(sql, [liftedBy, liftedReason, suspensionId]);

            // Reactivar el conductor
            await this.updateDriverStatus(suspension.driver_id, 'active');

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    // Actualizar estado del conductor
    async updateDriverStatus(driverId, status) {
        try {
            const sql = 'UPDATE drivers SET status = $1 WHERE id = $2';
            await db.query(sql, [status, driverId]);
        } catch (error) {
            throw error;
        }
    }

    // Verificar y actualizar suspensiones expiradas
    async checkExpiredSuspensions() {
        try {
            // Obtener suspensiones temporales que han expirado
            const sql = `
                SELECT * FROM driver_suspensions 
                WHERE type = 'temporal' 
                AND status = 'active'
                AND expires_at < NOW()
            `;

            const result = await db.query(sql);
            const expired = result.rows;

            for (const suspension of expired) {
                // Marcar como expirada
                await db.query(
                    `UPDATE driver_suspensions 
                     SET status = 'expired' 
                     WHERE id = $1`,
                    [suspension.id]
                );

                // Reactivar el conductor
                await this.updateDriverStatus(suspension.driver_id, 'active');
            }

            return expired.length;
        } catch (error) {
            throw error;
        }
    }

    // Obtener estadísticas de suspensiones
    async getStatistics() {
        try {
            const queries = [
                { key: 'active', sql: "SELECT COUNT(*) as count FROM driver_suspensions WHERE status = 'active'" },
                { key: 'temporal', sql: "SELECT COUNT(*) as count FROM driver_suspensions WHERE type = 'temporal' AND status = 'active'" },
                { key: 'permanent', sql: "SELECT COUNT(*) as count FROM driver_suspensions WHERE type = 'permanent' AND status = 'active'" },
                { key: 'lifted', sql: "SELECT COUNT(*) as count FROM driver_suspensions WHERE status = 'lifted'" },
                { key: 'expired', sql: "SELECT COUNT(*) as count FROM driver_suspensions WHERE status = 'expired'" }
            ];

            const stats = {};

            for (const query of queries) {
                const result = await db.query(query.sql);
                stats[query.key] = parseInt(result.rows[0]?.count || 0, 10);
            }

            return stats;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new SuspensionsModel();