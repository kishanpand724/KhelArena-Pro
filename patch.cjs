const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  'const lockDoc = await transaction.get(creditLockRef).catch',
  'console.log("Checking lockDoc..."); const lockDoc = await transaction.get(creditLockRef).catch'
);
code = code.replace(
  'const paymentDoc = await transaction.get(paymentRef).catch',
  'console.log("Checking paymentDoc..."); const paymentDoc = await transaction.get(paymentRef).catch'
);
code = code.replace(
  'const settingsDoc = await transaction.get(settingsRef);',
  'console.log("Checking settingsDoc..."); const settingsDoc = await transaction.get(settingsRef);'
);
code = code.replace(
  'const currentUserDoc = await transaction.get(userRef).catch',
  'console.log("Checking currentUserDoc..."); const currentUserDoc = await transaction.get(userRef).catch'
);
code = code.replace(
  'transaction.update(userRef, {',
  'console.log("Updating userRef..."); transaction.update(userRef, {'
);
fs.writeFileSync('server.ts', code);
