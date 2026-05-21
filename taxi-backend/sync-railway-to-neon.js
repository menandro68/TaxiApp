require('dotenv').config({ path: '.env' });
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const neonEnv = dotenv.parse(fs.readFileSync('.env.neon'));
const { Client } = require('pg');

const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);
const logFile = path.join(LOG_DIR, `sync-${new Date().toISOString().slice(0,10)}.log`);
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
};

(async () => {
  const railway = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const neon = new Client({
    user: neonEnv.PGUSER, password: neonEnv.PGPASSWORD,
    host: 'ep-soft-haze-apiqtt0m-pooler.c-7.us-east-1.aws.neon.tech',
    database: 'neondb', port: 5432, ssl: { rejectUnauthorized: false }
  });

  try {
    await railway.connect();
    await neon.connect();
    log('Conectado a Railway y Neon');

    const tablesQuery = await railway.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    );
    const tableNames = tablesQuery.rows.map(r => r.tablename);

    const fkOrder = await railway.query(`
      SELECT tc.table_name AS child, ccu.table_name AS parent
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    `);

    const deps = {};
    tableNames.forEach(t => deps[t] = new Set());
    fkOrder.rows.forEach(r => { if (r.child !== r.parent) deps[r.child].add(r.parent); });

    const ordered = [];
    const remaining = new Set(tableNames);
    while (remaining.size > 0) {
      let added = false;
      for (const t of [...remaining]) {
        if ([...deps[t]].every(d => !remaining.has(d))) {
          ordered.push(t); remaining.delete(t); added = true;
        }
      }
      if (!added) { ordered.push(...remaining); break; }
    }

    // Deshabilitar FK constraints temporalmente para TRUNCATE en cascada


    let totalCopied = 0;
    let mismatches = 0;

    for (const tbl of ordered) {
      const colsRes = await railway.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1
        ORDER BY ordinal_position
      `, [tbl]);

      const cols = colsRes.rows.map(c => `"${c.column_name}"`);
      const colNames = colsRes.rows.map(c => c.column_name);
      const jsonCols = new Set(colsRes.rows.filter(c =>
        c.data_type === 'json' || c.data_type === 'jsonb'
      ).map(c => c.column_name));

      const data = await railway.query(`SELECT * FROM "${tbl}"`);
      if (data.rows.length === 0) continue;

      await neon.query(`TRUNCATE TABLE "${tbl}" RESTART IDENTITY CASCADE`);

      const batchSize = 100;
      for (let i = 0; i < data.rows.length; i += batchSize) {
        const batch = data.rows.slice(i, i + batchSize);
        const values = [];
        const placeholders = [];
        let paramIdx = 1;

        for (const row of batch) {
          const rowPh = colNames.map(() => `$${paramIdx++}`);
          placeholders.push(`(${rowPh.join(',')})`);
          for (const col of colNames) {
            let val = row[col];
            if (jsonCols.has(col) && val !== null && typeof val === 'object') val = JSON.stringify(val);
            values.push(val);
          }
        }

        await neon.query(`INSERT INTO "${tbl}" (${cols.join(',')}) VALUES ${placeholders.join(',')}`, values);
      }

      const seqRes = await neon.query(`
        SELECT column_name, pg_get_serial_sequence($1, column_name) AS seq
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$2 AND column_default LIKE 'nextval%'
      `, [`"${tbl}"`, tbl]);

      for (const s of seqRes.rows) {
        if (s.seq) {
          await neon.query(`SELECT setval('${s.seq}', COALESCE((SELECT MAX("${s.column_name}") FROM "${tbl}"), 1))`);
        }
      }

      totalCopied += data.rows.length;
    }



    // Verificacion final
    for (const tbl of ordered) {
      const rw = await railway.query(`SELECT COUNT(*)::int AS c FROM "${tbl}"`);
      const nn = await neon.query(`SELECT COUNT(*)::int AS c FROM "${tbl}"`);
      if (rw.rows[0].c !== nn.rows[0].c) {
        log(`DIFF ${tbl}: Railway=${rw.rows[0].c} Neon=${nn.rows[0].c}`);
        mismatches++;
      }
    }

    log(`SYNC OK | Filas: ${totalCopied} | Diferencias: ${mismatches}`);
    await railway.end();
    await neon.end();
    process.exit(0);
  } catch (e) {
    log(`ERROR FATAL: ${e.message}`);
    process.exit(1);
  }
})();
