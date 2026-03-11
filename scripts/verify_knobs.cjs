const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./src/data/aquant_products.json', 'utf8'));

const knobs1331 = data.filter(p => p.productCode.startsWith('1331'));
console.log(`Found ${knobs1331.length} 1331 series knobs:`);
console.log(JSON.stringify(knobs1331, null, 2));

const knobs1332 = data.filter(p => p.productCode.startsWith('1332'));
console.log(`Found ${knobs1332.length} 1332 series knobs:`);
console.log(JSON.stringify(knobs1332, null, 2));
