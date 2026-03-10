const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const upload = multer({ storage: multer.memoryStorage() });

// Parsear PDF del BHD
function parseBHDPdf(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const deposits = [];

  for (const line of lines) {
    // Buscar líneas con fecha formato DD/MM/YYYY y monto RD$
    const match = line.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(.+?)\s+RD\$\s*([\d,]+\.\d{2})/);
    if (match) {
      const [, date, confirmationNumber, description, amountStr] = match;
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      
      // Extraer código del conductor desde la descripción
      // Formato esperado: "TRANSFERENCIA RECIBIDA DE SQUID-045"
      const codeMatch = description.match(/SQUID-\d+/i);
      const driverCode = codeMatch ? codeMatch[0].toUpperCase() : null;

      deposits.push({
        date,
        confirmationNumber,
        description: description.trim(),
        amount,
        driverCode
      });
    }
  }
  return deposits;
}

// POST /api/admin/wallet/upload-pdf - Preview del PDF
router.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    const data = await pdfParse(req.file.buffer);
    const rawDeposits = parseBHDPdf(data.text);

    if (rawDeposits.length === 0) {
      return res.status(400).json({ error: 'No se encontraron transferencias en el PDF' });
    }

    // Enriquecer con info del conductor y verificar duplicados
    const enriched = await Promise.all(rawDeposits.map(async (dep) => {
      // Verificar duplicado
      const dupCheck = await pool.query(
        'SELECT id FROM wallet_deposits WHERE confirmation_number = $1',
        [dep.confirmationNumber]
      );
      if (dupCheck.rows.length > 0) {
        return { ...dep, status: 'duplicado', driverName: null, driverId: null };
      }

      // Buscar conductor por código
      let driverName = null;
      let driverId = null;
      if (dep.driverCode) {
        const driverResult = await pool.query(
          'SELECT id, name FROM drivers WHERE driver_code = $1',
          [dep.driverCode]
        );
        if (driverResult.rows.length > 0) {
          driverName = driverResult.rows[0].name;
          driverId = driverResult.rows[0].id;
        }
      }

      const status = !dep.driverCode ? 'sin_codigo' 
                   : !driverId ? 'conductor_no_encontrado' 
                   : 'listo';

      return { ...dep, status, driverName, driverId };
    }));

    res.json({ 
      total: enriched.length,
      listos: enriched.filter(d => d.status === 'listo').length,
      deposits: enriched 
    });

  } catch (err) {
    console.error('❌ Error procesando PDF:', err);
    res.status(500).json({ error: 'Error procesando PDF: ' + err.message });
  }
});

// POST /api/admin/wallet/process-deposits - Procesar y acreditar
router.post('/process-deposits', async (req, res) => {
  const { deposits, pdfFilename } = req.body;
  
  if (!deposits || deposits.length === 0) {
    return res.status(400).json({ error: 'No hay depósitos para procesar' });
  }

  const results = [];
  
  for (const dep of deposits) {
    if (dep.status !== 'listo') {
      results.push({ ...dep, result: 'omitido' });
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insertar en wallet_deposits (falla si duplicado por UNIQUE)
      await client.query(
        `INSERT INTO wallet_deposits 
         (confirmation_number, driver_id, driver_code, amount, description, deposit_date, pdf_filename)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [dep.confirmationNumber, dep.driverId, dep.driverCode, 
         dep.amount, dep.description, dep.date, pdfFilename || 'unknown']
      );

      // Acreditar billetera del conductor
      await client.query(
        `UPDATE drivers SET wallet_balance = COALESCE(wallet_balance, 0) + $1 WHERE id = $2`,
        [dep.amount, dep.driverId]
      );

      await client.query('COMMIT');
      results.push({ ...dep, result: 'acreditado' });
      console.log(`✅ Acreditado RD$${dep.amount} a conductor ${dep.driverCode}`);

    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        results.push({ ...dep, result: 'duplicado' });
      } else {
        results.push({ ...dep, result: 'error', error: err.message });
      }
    } finally {
      client.release();
    }
  }

  const acreditados = results.filter(r => r.result === 'acreditado').length;
  const total = results.filter(r => r.result === 'acreditado')
                       .reduce((sum, r) => sum + parseFloat(r.amount), 0);

  res.json({ 
    message: `${acreditados} depósitos procesados`,
    totalAcreditado: total,
    results 
  });
});

module.exports = router;