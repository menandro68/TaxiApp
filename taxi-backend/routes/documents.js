const express = require('express');
const router = express.Router();
const DocumentModel = require('../models/documents');
const multer = require('multer');

// Multer en memoria (Railway no tiene disco persistente)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo JPEG, PNG y PDF'));
  }
});

// Obtener todos los documentos (admin)
router.get('/all', async (req, res) => {
  try {
    const documents = await DocumentModel.getAllDocuments();
    res.json({ success: true, count: documents.length, documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener documentos pendientes
router.get('/pending', async (req, res) => {
  try {
    const documents = await DocumentModel.getPendingDocuments();
    res.json({ success: true, count: documents.length, documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Estadísticas
router.get('/stats', async (req, res) => {
  try {
    const stats = await DocumentModel.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Documentos de un conductor
router.get('/driver/:driverId', async (req, res) => {
  try {
    const documents = await DocumentModel.getByDriverId(req.params.driverId);
    res.json({ success: true, count: documents.length, documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Subir documento (base64 en BD)
router.post('/driver/:driverId/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No se subió ningún archivo' });

    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const newDocument = await DocumentModel.create({
      driver_id: req.params.driverId,
      document_type: req.body.document_type,
      document_url: base64,
      document_name: req.file.originalname,
      expiry_date: req.body.expiry_date || null
    });

    res.json({ success: true, message: 'Documento subido exitosamente', document: newDocument });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Aprobar documento
router.put('/:id/approve', async (req, res) => {
  try {
    const result = await DocumentModel.updateStatus(req.params.id, 'approved', req.body.reviewed_by || 1);
    if (!result) return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    res.json({ success: true, message: 'Documento aprobado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rechazar documento
router.put('/:id/reject', async (req, res) => {
  try {
    const { reviewed_by, rejection_reason } = req.body;
    if (!rejection_reason) return res.status(400).json({ success: false, error: 'Debe proporcionar una razón de rechazo' });
    const result = await DocumentModel.updateStatus(req.params.id, 'rejected', reviewed_by || 1, rejection_reason);
    if (!result) return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    res.json({ success: true, message: 'Documento rechazado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener documento por ID
router.get('/:id', async (req, res) => {
  try {
    const document = await DocumentModel.getById(req.params.id);
    if (!document) return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    res.json({ success: true, document });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Registrar conductor temporal para subir documentos
router.post('/register-temp', async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, error: 'Nombre y teléfono requeridos' });

    const pool = require('../config/database').pool;

    // Verificar si ya existe
    const existing = await pool.query('SELECT id FROM drivers WHERE phone = $1', [phone]);
    if (existing.rows.length > 0) {
      return res.json({ success: true, driver_id: existing.rows[0].id, existing: true });
    }

    const email = `temp_${phone}@squid.temp`;
    const password = Math.random().toString(36).slice(-8);

    const result = await pool.query(
      `INSERT INTO drivers (name, email, phone, password, status) VALUES ($1, $2, $3, $4, 'pending_docs') RETURNING id`,
      [name, email, phone, password]
    );

    res.json({ success: true, driver_id: result.rows[0].id, existing: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;