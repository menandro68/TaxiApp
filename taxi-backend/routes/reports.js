const express = require('express');
const router = express.Router();
const FinancialReports = require('../reports/financial-reports');
const TrendsAnalytics = require('../reports/trends-analytics');
const KPIAnalytics = require('../reports/kpi-analytics');

// Reportes Financieros
router.get('/financial/revenue/:period', async (req, res) => {
    try {
        const { period } = req.params;
        const endDate = new Date().toISOString();
        const startDate = new Date();
        
        switch(period) {
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(startDate.getMonth() - 3);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 30);
        }
        
        const data = await FinancialReports.getRevenueByPeriod(startDate.toISOString(), endDate);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/financial/driver-profitability/:days', async (req, res) => {
    try {
        const days = parseInt(req.params.days) || 30;
        const data = await FinancialReports.getDriverProfitability(days);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/financial/commissions/:period', async (req, res) => {
    try {
        const { period } = req.params;
        const endDate = new Date().toISOString();
        const startDate = new Date();
        
        switch(period) {
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 30);
        }
        
        const data = await FinancialReports.getCommissionsReport(startDate.toISOString(), endDate);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/financial/cashflow/:days', async (req, res) => {
    try {
        const days = parseInt(req.params.days) || 30;
        const data = await FinancialReports.getCashFlow(days);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Análisis de Tendencias
router.get('/trends/monthly-comparison', async (req, res) => {
    try {
        const data = await TrendsAnalytics.getMonthlyComparison();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/trends/growth/:days', async (req, res) => {
    try {
        const days = parseInt(req.params.days) || 90;
        const data = await TrendsAnalytics.getGrowthAnalysis(days);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/trends/projections', async (req, res) => {
    try {
        const data = await TrendsAnalytics.getProjections();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// KPIs
router.get('/kpi/by-period/:period', async (req, res) => {
    try {
        const { period } = req.params;
        const data = await KPIAnalytics.getKPIsByPeriod(period);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/kpi/year-over-year', async (req, res) => {
    try {
        const data = await KPIAnalytics.getYearOverYearComparison();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/kpi/zones', async (req, res) => {
    try {
        const data = await KPIAnalytics.getZoneAnalytics();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/kpi/peak-hours', async (req, res) => {
    try {
        const data = await KPIAnalytics.getPeakHoursAnalysis();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reporte Dashboard Completo
router.get('/dashboard/complete', async (req, res) => {
    try {
        const [
            monthlyTrends,
            driverProfitability,
            cashFlow,
            projections,
            peakHours,
            zones
        ] = await Promise.all([
            TrendsAnalytics.getMonthlyComparison(),
            FinancialReports.getDriverProfitability(30),
            FinancialReports.getCashFlow(30),
            TrendsAnalytics.getProjections(),
            KPIAnalytics.getPeakHoursAnalysis(),
            KPIAnalytics.getZoneAnalytics()
        ]);

        res.json({
            success: true,
            data: {
                monthly_trends: monthlyTrends.slice(0, 6),
                top_drivers: driverProfitability.slice(0, 5),
                cash_flow: cashFlow.slice(0, 7),
                projections,
                peak_hours: peakHours.peak_hours,
                top_zones: zones.slice(0, 5)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;