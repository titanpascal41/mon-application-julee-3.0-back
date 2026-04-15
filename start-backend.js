const { spawn } = require('child_process');

const process = spawn('npx', ['tsx', 'src/index.ts'], {
  stdio: 'inherit',
  shell: true
});

process.on('close', (code) => {
  console.log(`Processus terminé avec le code ${code}`);
});
