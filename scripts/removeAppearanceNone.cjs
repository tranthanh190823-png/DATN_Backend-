const fs = require('fs');
const path = require('path');

const checkoutPath = path.join(__dirname, '../../frontend/src/pages/Checkout.tsx');
let content = fs.readFileSync(checkoutPath, 'utf8');

content = content.replace(/appearance-none/g, '');

fs.writeFileSync(checkoutPath, content);
console.log("Appearance-none removed");
