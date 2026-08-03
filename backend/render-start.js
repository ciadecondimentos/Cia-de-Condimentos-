const path = require('path');
const { spawn } = require('child_process');

const entry = path.join(__dirname, 'index.js');
const child = spawn(process.execPath, [entry], {
  stdio: 'inherit',
  env: process.env,
  cwd: __dirname
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code || 0);
  }
});
