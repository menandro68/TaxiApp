const text = ' 10/03/2026  5227068  TRANSFERENCIA RECIBIDA DE IRMA MIYARES  RD$ 50.00  RD$ 15,177.60';
const match = text.trim().match(/^(\d{2}\/\d{2}\/\d{4})\s+(\S+)\s+(.+?)\s+RD\$\s*([\d,]+\.\d{2})\s+RD\$\s*[\d,]+\.\d{2}/);
console.log(match ? 'MATCH: ' + JSON.stringify(match.slice(1)) : 'NO MATCH');