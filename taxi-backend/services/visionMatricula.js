// Lectura automatica de la matricula (certificado DGII) con Google Cloud Vision
const https = require('https');

function llamarVision(base64) {
  return new Promise((resolve, reject) => {
    const key = process.env.GOOGLE_VISION_API_KEY;
    if (!key) return reject(new Error('Falta GOOGLE_VISION_API_KEY'));

    const payload = JSON.stringify({
      requests: [{ image: { content: base64 }, features: [{ type: 'TEXT_DETECTION' }] }]
    });

    const req = https.request({
      hostname: 'vision.googleapis.com',
      path: `/v1/images:annotate?key=${key}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.error) return reject(new Error(j.error.message));
          resolve(j.responses?.[0]?.fullTextAnnotation?.text || '');
        } catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const COLORES = ['BLANCO','NEGRO','GRIS','PLATEADO','ROJO','AZUL','VERDE','AMARILLO','MARRON','BEIGE','DORADO','VINO','NARANJA','CELESTE'];
const TIPOS = ['JEEP','AUTOMOVIL','CAMIONETA','MOTOCICLETA','AUTOBUS','CAMION','MINIBUS'];
const MARCAS = ['TOYOTA','HONDA','FORD','NISSAN','HYUNDAI','KIA','CHEVROLET','MITSUBISHI','SUZUKI','MAZDA','BMW','MERCEDES','AUDI','VOLKSWAGEN','JEEP','LEXUS','ISUZU','DAIHATSU','SUBARU','PEUGEOT','RENAULT','YAMAHA','BAJAJ','LONCIN','SUPERMOTO'];

// El texto de Vision llega desordenado: se busca cada dato por su forma, no por posicion
function parsearMatricula(texto) {
  if (!texto) return null;
  const T = texto.toUpperCase();
  const lineas = T.split('\n').map(l => l.trim()).filter(Boolean);

  const placa = (T.match(/\b([A-Z]\d{6})\b/) || [])[1] || null;
  const color = COLORES.find(c => lineas.includes(c)) || null;
  const tipo = TIPOS.find(t => lineas.includes(t)) || null;
  const marca = MARCAS.find(m => lineas.includes(m)) || null;

  // El año de fabricación va junto al modelo; el año de expedición aparece con la fecha
  let anio = null;
  const actual = new Date().getFullYear();
  const idxExp = lineas.findIndex(l => l.includes('EXPEDICI'));
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/^(19[5-9]\d|20[0-4]\d)$/);
    if (!m) continue;
    const val = Number(m[1]);
    if (val > actual) continue;
    // Descartar el año que acompaña a la fecha de expedición
    if (idxExp >= 0 && i > idxExp && i <= idxExp + 4 && val >= actual - 1) continue;
    anio = m[1];
  }

  // El modelo aparece en su propia linea, sin ser ninguna de las etiquetas conocidas
  let modelo = null;
  const idx = lineas.findIndex(l => l === anio);
  if (idx > 0) {
    const prev = lineas[idx - 1];
    if (prev && prev.length >= 3 && prev.length <= 30 && !/[0-9]{5,}/.test(prev) && prev !== marca) {
      modelo = prev;
    }
  }

  return { placa, marca, modelo, anio, color, tipo };
}

async function leerMatricula(documentUrl) {
  const base64 = (documentUrl || '').includes(',') ? documentUrl.split(',')[1] : documentUrl;
  const texto = await llamarVision(base64);
  return { datos: parsearMatricula(texto), texto };
}

module.exports = { leerMatricula, parsearMatricula };