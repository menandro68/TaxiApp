const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParseLib = require('pdf-parse');
const pdfParse = pdfParseLib.default || pdfParseLib;
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
    const match = line.match(/(\d{2}\/\d{2}\/\d{4})\s+(\S+)\s+(.+?)\s{2,}([\d,]+\.\d{2})\s/);
    if (!match) continue;

    const [, date, confirmationNumber, description, amountStr] = match;
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    if (!amount || amount <= 0) continue;

    // Extraer nombre del conductor
    let driverName = null;
    const transMatch = description.match(/TRANSFERENCIA\s+RECIBIDA\s+DE\s+(.+)/i);
    const depoMatch = description.match(/DEPOSITO[:\s]+(.+)/i);

    if (transMatch) driverName = transMatch[1].trim();
    else if (depoMatch) driverName = depoMatch[1].trim();

    // Tomar solo los 2 primeros nombres
    let searchName = null;
    if (driverName) {
      const parts = driverName.split(/\s+/);
      searchName = parts.slice(0, 2).join(' ');
    }

    deposits.push({
      date,
      confirmationNumber,
      description: description.trim(),
      amount,
      searchName
    });
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

      // Buscar conductor por nombre (2 primeros nombres)
      let driverName = null;
      let driverId = null;
      let driverCode = null;
      if (dep.searchName) {
        const driverResult = await pool.query(
          `SELECT id, name, driver_code FROM drivers 
           WHERE UPPER(name) ILIKE UPPER($1) 
           OR UPPER(name) ILIKE UPPER($2)
           LIMIT 1`,
          [`${dep.searchName}%`, `%${dep.searchName}%`]
        );
        if (driverResult.rows.length > 0) {
          driverName = driverResult.rows[0].name;
          driverId = driverResult.rows[0].id;
          driverCode = driverResult.rows[0].driver_code;
        }
      }

      const status = !dep.searchName ? 'sin_nombre'
                   : !driverId ? 'conductor_no_encontrado'
                   : 'listo';

      return { ...dep, status, driverName, driverId, driverCode };
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

router.get('/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const result = await pool.query(
            `SELECT wd.*, d.name as driver_name
            FROM wallet_deposits wd
            LEFT JOIN drivers d ON wd.driver_id = d.id
            ORDER BY wd.processed_at DESC
            LIMIT $1`,
            [limit]
        );
        res.json({ deposits: result.rows });
    } catch (err) {
        console.error('Error historial wallet:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;