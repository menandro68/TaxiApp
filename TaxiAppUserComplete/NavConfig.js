// Configuracion central del navegador SquidNav
// Cambiar de proveedor de mapas se hace SOLO desde este archivo

export const NAV_CONFIG = {
  // Interruptor maestro: 'propio' o 'google'
     PROVEEDOR: 'propio',

  // Servidor propio en Hetzner
  SERVIDOR: 'https://nav.squidapps.org',
  RUTA_PREFIJO: '/ruta',
  BUSCAR_PREFIJO: '/buscar',

  // Mapa visual
    TILES_URL: 'https://tiles.squidapps.org/styles/osm-bright/256/{z}/{x}/{y}.png?v=1',
  // true = tiles propios (tiles.squidapps.org) | false = mapa base de Google
  USE_OWN_TILES: false,

  // Tiempos de espera en milisegundos
  TIMEOUT_RUTA: 8000,
  TIMEOUT_BUSQUEDA: 5000,

  // Reintentos antes de caer al respaldo
  REINTENTOS: 2,

  // Si el servidor propio falla, usar Google automaticamente
  RESPALDO_GOOGLE: true,
};

export function urlRuta(desde, hasta) {
  return NAV_CONFIG.SERVIDOR + NAV_CONFIG.RUTA_PREFIJO +
    '/route/v1/driving/' +
    desde.join(',') + ';' + hasta.join(',') +
    '?overview=full&geometries=geojson&steps=true';
}

export function urlBuscar(texto) {
  return NAV_CONFIG.SERVIDOR + NAV_CONFIG.BUSCAR_PREFIJO +
    '/search?q=' + encodeURIComponent(texto) +
    '&format=json&limit=6&countrycodes=do&addressdetails=1';
}

async function fetchConTimeout(url, ms) {
  const control = new AbortController();
  const id = setTimeout(() => control.abort(), ms);
  try {
    const respuesta = await fetch(url, { signal: control.signal });
    clearTimeout(id);
    return respuesta;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function pedirRutaPropia(desde, hasta) {
  let ultimoError = null;

  for (let intento = 0; intento <= NAV_CONFIG.REINTENTOS; intento++) {
    try {
      const respuesta = await fetchConTimeout(
        urlRuta(desde, hasta),
        NAV_CONFIG.TIMEOUT_RUTA
      );
      const datos = await respuesta.json();
      if (datos.code !== 'Ok') throw new Error(datos.code);
      return datos.routes[0];
    } catch (error) {
      ultimoError = error;
    }
  }

  throw ultimoError;
}

export function urlReverse(lat, lng) {
  return NAV_CONFIG.SERVIDOR + NAV_CONFIG.BUSCAR_PREFIJO +
    '/reverse?lat=' + lat + '&lon=' + lng +
    '&format=json&addressdetails=1&accept-language=es';
}

export async function direccionDesdeCoordenadas(lat, lng) {
  const respuesta = await fetchConTimeout(
    urlReverse(lat, lng),
    NAV_CONFIG.TIMEOUT_BUSQUEDA
  );
  const datos = await respuesta.json();

  if (!datos || !datos.address) throw new Error('Sin direccion');

  const a = datos.address;
  const partes = [];

  if (a.road) partes.push(a.road);
  if (a.house_number) partes[0] = a.road + ' ' + a.house_number;
  if (a.neighbourhood) partes.push(a.neighbourhood);
  else if (a.suburb) partes.push(a.suburb);
  if (a.city) partes.push(a.city);
  else if (a.town) partes.push(a.town);

  const texto = partes.join(', ');
  return texto || datos.display_name;
}

export async function buscarDireccionPropia(texto) {
  const respuesta = await fetchConTimeout(
    urlBuscar(texto),
    NAV_CONFIG.TIMEOUT_BUSQUEDA
  );
  return await respuesta.json();
}

const GIROS_ES = {
  'left': 'Gira a la izquierda',
  'right': 'Gira a la derecha',
  'sharp left': 'Gira cerrado a la izquierda',
  'sharp right': 'Gira cerrado a la derecha',
  'slight left': 'Manten la izquierda',
  'slight right': 'Manten la derecha',
  'straight': 'Continua recto',
  'uturn': 'Haz un retorno',
};

const MANIOBRA_GOOGLE = {
  'left': 'turn-left',
  'right': 'turn-right',
  'sharp left': 'turn-sharp-left',
  'sharp right': 'turn-sharp-right',
  'slight left': 'turn-slight-left',
  'slight right': 'turn-slight-right',
  'straight': 'straight',
  'uturn': 'uturn-left',
};

function textoDistancia(metros) {
  if (metros >= 1000) return (metros / 1000).toFixed(1) + ' km';
  return Math.round(metros) + ' m';
}

function textoDuracion(segundos) {
  const min = Math.round(segundos / 60);
  if (min < 60) return min + ' min';
  const horas = Math.floor(min / 60);
  const resto = min % 60;
  return horas + ' h ' + resto + ' min';
}

function instruccionEspanol(paso) {
  const m = paso.maneuver || {};
  const calle = paso.name ? ' en ' + paso.name : '';
  const giro = GIROS_ES[m.modifier] || 'Continua';

  switch (m.type) {
    case 'depart': return 'Inicia el recorrido' + calle;
    case 'arrive': return 'Has llegado a tu destino';
    case 'turn': return giro + calle;
    case 'new name': return 'Continua' + calle;
    case 'continue': return 'Continua' + calle;
    case 'merge': return 'Incorporate' + calle;
    case 'on ramp': return 'Toma la rampa' + calle;
    case 'off ramp': return 'Toma la salida' + calle;
    case 'fork': return giro + ' en la bifurcacion' + calle;
    case 'end of road': return 'Al final de la via, ' + giro.toLowerCase() + calle;
    case 'roundabout':
    case 'rotary': {
      const salida = m.exit ? ' y toma la salida ' + m.exit : '';
      return 'Entra a la rotonda' + salida + calle;
    }
    default: return 'Continua' + calle;
  }
}

export function traducirAFormatoGoogle(ruta) {
  const pasos = ruta.legs[0].steps;

  const steps = pasos.map((paso, index) => {
    const fin = paso.maneuver && paso.maneuver.location
      ? paso.maneuver.location
      : [0, 0];
    return {
      index,
      instruction: instruccionEspanol(paso),
      distance: textoDistancia(paso.distance),
      endLat: fin[1],
      endLng: fin[0],
           maneuver: (m => {
        if (m.type === 'depart') return 'straight';
        if (m.type === 'arrive') return 'straight';
        return MANIOBRA_GOOGLE[m.modifier] || 'straight';
      })(paso.maneuver || {}),
    };
  });

  const points = ruta.geometry.coordinates.map(c => ({
    latitude: c[1],
    longitude: c[0],
  }));

  return {
    points,
    steps,
    distanceText: textoDistancia(ruta.distance),
    durationText: textoDuracion(ruta.duration),
    durationMinutes: Math.round(ruta.duration / 60),
    distanceMeters: ruta.distance,
    durationSeconds: ruta.duration,
  };
}

export function urlEstilo() {
  return 'https://tiles.squidapps.org/styles/osm-bright/style.json';
}
