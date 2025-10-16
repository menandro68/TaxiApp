import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

class PenaltyService {
  constructor() {
    this.PENALTY_KEY = '@driver_penalties';
    this.SUSPENSION_KEY = '@driver_suspension';
    
    // Umbrales de penalización
    this.THRESHOLDS = {
      MIN_ACCEPTANCE_RATE: 80,      // Mínimo 80% de aceptación
      MAX_CANCELLATION_RATE: 10,    // Máximo 10% de cancelación
      MIN_RATING: 4.0,              // Mínimo 4.0 estrellas
      WARNING_STRIKES: 3,           // 3 advertencias antes de suspensión
      TEMP_SUSPENSION_HOURS: 24,    // Suspensión de 24 horas
    };

    // Tipos de penalización
    this.PENALTY_TYPES = {
      WARNING: 'WARNING',
      TEMP_SUSPENSION: 'TEMP_SUSPENSION',
      PERMANENT_SUSPENSION: 'PERMANENT_SUSPENSION'
    };
  }

  // Verificar y aplicar penalizaciones
  async checkAndApplyPenalties(driverStats) {
    try {
      const violations = [];
      
      // Verificar tasa de aceptación
      if (driverStats.acceptanceRate < this.THRESHOLDS.MIN_ACCEPTANCE_RATE) {
        violations.push({
          type: 'LOW_ACCEPTANCE',
          message: `Tasa de aceptación muy baja: ${driverStats.acceptanceRate}%`,
          severity: this.calculateSeverity(driverStats.acceptanceRate, 80, 60, 40)
        });
      }

      // Verificar tasa de cancelación
      if (driverStats.cancellationRate > this.THRESHOLDS.MAX_CANCELLATION_RATE) {
        violations.push({
          type: 'HIGH_CANCELLATION',
          message: `Tasa de cancelación muy alta: ${driverStats.cancellationRate}%`,
          severity: this.calculateSeverity(driverStats.cancellationRate, 10, 20, 30, true)
        });
      }

      // Verificar calificación (si está disponible)
      if (driverStats.rating && driverStats.rating < this.THRESHOLDS.MIN_RATING) {
        violations.push({
          type: 'LOW_RATING',
          message: `Calificación muy baja: ${driverStats.rating} estrellas`,
          severity: this.calculateSeverity(driverStats.rating, 4.0, 3.5, 3.0)
        });
      }

      // Si hay violaciones, aplicar penalización
      if (violations.length > 0) {
        return await this.applyPenalty(violations, driverStats);
      }

      return { success: true, penaltyApplied: false };
      
    } catch (error) {
      console.error('Error verificando penalizaciones:', error);
      return { success: false, error: error.message };
    }
  }

  // Calcular severidad de la violación
  calculateSeverity(value, warning, suspension, permanent, inverse = false) {
    if (inverse) {
      if (value >= permanent) return 'PERMANENT';
      if (value >= suspension) return 'SUSPENSION';
      if (value >= warning) return 'WARNING';
    } else {
      if (value <= permanent) return 'PERMANENT';
      if (value <= suspension) return 'SUSPENSION';
      if (value <= warning) return 'WARNING';
    }
    return 'NONE';
  }

  // Aplicar penalización basada en violaciones
  async applyPenalty(violations, driverStats) {
    try {
      // Obtener historial de penalizaciones
      const history = await this.getPenaltyHistory();
      
      // Determinar la penalización más severa
      const severestViolation = violations.reduce((prev, current) => {
        const severityOrder = { 'PERMANENT': 3, 'SUSPENSION': 2, 'WARNING': 1, 'NONE': 0 };
        return severityOrder[current.severity] > severityOrder[prev.severity] ? current : prev;
      });

      // Contar advertencias previas
      const warningCount = history.filter(p => p.type === this.PENALTY_TYPES.WARNING).length;

      let penaltyType;
      let penaltyAction;

      // Determinar tipo de penalización
      if (severestViolation.severity === 'PERMANENT') {
        penaltyType = this.PENALTY_TYPES.PERMANENT_SUSPENSION;
        penaltyAction = await this.applyPermanentSuspension(severestViolation.message);
      } else if (severestViolation.severity === 'SUSPENSION' || warningCount >= this.THRESHOLDS.WARNING_STRIKES) {
        penaltyType = this.PENALTY_TYPES.TEMP_SUSPENSION;
        penaltyAction = await this.applyTempSuspension(severestViolation.message);
      } else {
        penaltyType = this.PENALTY_TYPES.WARNING;
        penaltyAction = await this.applyWarning(severestViolation.message, warningCount + 1);
      }

      // Guardar en historial
      await this.savePenaltyToHistory({
        type: penaltyType,
        reason: severestViolation.message,
        violations: violations,
        stats: driverStats,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        penaltyApplied: true,
        penaltyType,
        ...penaltyAction
      };

    } catch (error) {
      console.error('Error aplicando penalización:', error);
      return { success: false, error: error.message };
    }
  }

  // Aplicar advertencia
  async applyWarning(reason, warningNumber) {
    const remainingWarnings = this.THRESHOLDS.WARNING_STRIKES - warningNumber;
    
    Alert.alert(
      '⚠️ ADVERTENCIA DE DESEMPEÑO',
      `${reason}\n\nEsta es tu advertencia #${warningNumber}.\n${remainingWarnings > 0 
        ? `Te quedan ${remainingWarnings} advertencias antes de una suspensión temporal.` 
        : 'La próxima violación resultará en suspensión temporal.'}`,
      [
        { text: 'Entendido', style: 'default' }
      ]
    );

    return {
      warningNumber,
      remainingWarnings,
      message: reason
    };
  }

  // Aplicar suspensión temporal
  async applyTempSuspension(reason) {
    const suspensionEndTime = new Date();
    suspensionEndTime.setHours(suspensionEndTime.getHours() + this.THRESHOLDS.TEMP_SUSPENSION_HOURS);

    await AsyncStorage.setItem(this.SUSPENSION_KEY, JSON.stringify({
      type: 'TEMPORARY',
      reason,
      startTime: new Date().toISOString(),
      endTime: suspensionEndTime.toISOString(),
      hoursRemaining: this.THRESHOLDS.TEMP_SUSPENSION_HOURS
    }));

    Alert.alert(
      '🔒 SUSPENSIÓN TEMPORAL',
      `Tu cuenta ha sido suspendida temporalmente.\n\nRazón: ${reason}\nDuración: ${this.THRESHOLDS.TEMP_SUSPENSION_HOURS} horas\n\nDebes mejorar tus métricas para evitar una suspensión permanente.`,
      [
        { text: 'Aceptar', style: 'default' }
      ]
    );

    return {
      suspensionHours: this.THRESHOLDS.TEMP_SUSPENSION_HOURS,
      endTime: suspensionEndTime.toISOString(),
      message: reason
    };
  }

  // Aplicar suspensión permanente
  async applyPermanentSuspension(reason) {
    await AsyncStorage.setItem(this.SUSPENSION_KEY, JSON.stringify({
      type: 'PERMANENT',
      reason,
      startTime: new Date().toISOString(),
      requiresAppeal: true
    }));

    Alert.alert(
      '❌ CUENTA SUSPENDIDA',
      `Tu cuenta ha sido suspendida permanentemente.\n\nRazón: ${reason}\n\nPara apelar esta decisión, contacta soporte:\n📧 soporte@taxiapp.com\n📞 1-800-TAXIAPP`,
      [
        { text: 'Contactar Soporte', onPress: () => this.contactSupport() },
        { text: 'Cerrar', style: 'cancel' }
      ]
    );

    return {
      permanent: true,
      requiresAppeal: true,
      message: reason
    };
  }

  // Verificar si el conductor está suspendido
  async checkSuspensionStatus() {
    try {
      const suspensionData = await AsyncStorage.getItem(this.SUSPENSION_KEY);
      
      if (!suspensionData) {
        return { isSuspended: false };
      }

      const suspension = JSON.parse(suspensionData);

      // Verificar suspensión permanente
      if (suspension.type === 'PERMANENT') {
        return {
          isSuspended: true,
          type: 'PERMANENT',
          reason: suspension.reason,
          requiresAppeal: true
        };
      }

      // Verificar suspensión temporal
      if (suspension.type === 'TEMPORARY') {
        const endTime = new Date(suspension.endTime);
        const now = new Date();

        if (now < endTime) {
          const hoursRemaining = Math.ceil((endTime - now) / (1000 * 60 * 60));
          return {
            isSuspended: true,
            type: 'TEMPORARY',
            reason: suspension.reason,
            hoursRemaining,
            endTime: suspension.endTime
          };
        } else {
          // Suspensión expirada, limpiar
          await AsyncStorage.removeItem(this.SUSPENSION_KEY);
          return { isSuspended: false, recentlyExpired: true };
        }
      }

      return { isSuspended: false };

    } catch (error) {
      console.error('Error verificando suspensión:', error);
      return { isSuspended: false, error: error.message };
    }
  }

  // Obtener historial de penalizaciones
  async getPenaltyHistory() {
    try {
      const history = await AsyncStorage.getItem(this.PENALTY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return [];
    }
  }

  // Guardar penalización en historial
  async savePenaltyToHistory(penalty) {
    try {
      const history = await this.getPenaltyHistory();
      history.push(penalty);
      
      // Mantener solo las últimas 50 penalizaciones
      if (history.length > 50) {
        history.shift();
      }

      await AsyncStorage.setItem(this.PENALTY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error guardando penalización:', error);
    }
  }

  // Limpiar advertencias (para testing o reseteo mensual)
  async clearWarnings() {
    try {
      const history = await this.getPenaltyHistory();
      const filteredHistory = history.filter(p => p.type !== this.PENALTY_TYPES.WARNING);
      await AsyncStorage.setItem(this.PENALTY_KEY, JSON.stringify(filteredHistory));
      return { success: true };
    } catch (error) {
      console.error('Error limpiando advertencias:', error);
      return { success: false, error: error.message };
    }
  }

  // Contactar soporte (placeholder)
  contactSupport() {
    // Aquí podrías abrir WhatsApp, email, o una pantalla de soporte
    console.log('Abriendo soporte...');
  }
}

export default new PenaltyService();