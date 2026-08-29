import { spawn } from 'child_process';
const child = spawn('node', ['test-payments.js']);
child.stdout.on('data', d => process.stdout.write(d));
child.stderr.on('data', d => process.stderr.write(d));
setTimeout(() => {
  console.log("Test timed out");
  child.kill();
}, 20000);
