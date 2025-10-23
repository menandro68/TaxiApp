const express = require('express');
const router = express.Router();
const DocumentModel = require('../models/documents');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear carpeta uploads si no existe
const uploadsDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.params.driverId}-${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos JPEG, PNG y PDF'));
    }
  }
});

// Obtener todos los documentos pendientes (para admin)
router.get('/pending', async (req, res) => {
  try {
    const documents = await DocumentModel.getPendingDocuments();
    res.json({
      success: true,
      count: documents.length,
      documents
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener estadísticas de documentos
router.get('/stats', async (req, res) => {
  try {
    const stats = await DocumentModel.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener documentos de un conductor específico
router.get('/driver/:driverId', async (req, res) => {
  try {
    const documents = await DocumentModel.getByDriverId(req.params.driverId);
    res.json({
      success: true,
      count: documents.length,
      documents
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Subir nuevo documento
router.post('/driver/:driverId/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No se subió ningún archivo' 
      });
    }

    const documentData = {
      driver_id: req.params.driverId,
      document_type: req.body.document_type,
      document_url: `/uploads/documents/${req.file.filename}`,
      document_name: req.file.originalname,
      expiry_date: req.body.expiry_date || null
    };

    const newDocument = await DocumentModel.create(documentData);
    
    res.json({
      success: true,
      message: 'Documento subido exitosamente',
      document: newDocument
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Aprobar documento
router.put('/:id/approve', async (req, res) => {
  try {
    const { reviewed_by } = req.body;
    const result = await DocumentModel.updateStatus(
      req.params.id, 
      'approved', 
      reviewed_by || 1
    );
    
    if (!result || result.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Documento no encontrado' 
      });
    }

    res.json({
      success: true,
      message: 'Documento aprobado exitosamente'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Rechazar documento
router.put('/:id/reject', async (req, res) => {
  try {
    const { reviewed_by, rejection_reason } = req.body;
    
    if (!rejection_reason) {
      return res.status(400).json({ 
        success: false, 
        error: 'Debe proporcionar una razón de rechazo' 
      });
    }

    const result = await DocumentModel.updateStatus(
      req.params.id, 
      'rejected', 
      reviewed_by || 1,
      rejection_reason
    );
    
    if (!result || result.rowCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Documento no encontrado' 
      });
    }

    res.json({
      success: true,
      message: 'Documento rechazado'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Obtener un documento específico
router.get('/:id', async (req, res) => {
  try {
    const document = await DocumentModel.getById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ 
        success: false, 
        error: 'Documento no encontrado' 
      });
    }

    res.json({
      success: true,
      document
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;