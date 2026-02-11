const fs = require('fs');
let f = fs.readFileSync('C:/Users/menandro68/Documents/TaxiApp/taxi-backend/public/admins.html', 'utf8');
f = f.replace(/await fetch[]/g, 'await fetch(`');
f = f.replace(/api\/admin\/create/g, 'api/admin/users');
fs.writeFileSync('C:/Users/menandro68/Documents/TaxiApp/taxi-backend/public/admins.html', f);
console.log('DONE');
