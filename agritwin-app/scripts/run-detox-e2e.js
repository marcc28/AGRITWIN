const path = require('node:path');
const { spawn } = require('node:child_process');
const http = require('node:http');
process.env.APP_ENV = 'e2e';

const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../.env.e2e'),
});

const allowedConfigs = new Set([
  'android.att.release',
  'android.att.debug',
  'ios.att.release',
  'ios.att.debug',
]);

const requestedConfig = process.argv[2] || 'android.att.release';

if (!allowedConfigs.has(requestedConfig)) {
  throw new Error('Configuració no vàlida');
}

const config = requestedConfig;

const allowedTestArgs = new Set(['--record-logs', '--take-screenshots']);

const passthroughArgs = process.argv.slice(3).filter((arg) => {
  if (arg === '--build') return false;

  if (!allowedTestArgs.has(arg)) {
    throw new Error(`Argument no permès: ${arg}`);
  }

  return true;
});

const shouldBuild = process.argv.slice(3).includes('--build');

const detoxTestArgs = ['detox', 'test', '-c', config, ...passthroughArgs];
const detoxBuildArgs = ['detox', 'build', '-c', config];
const metroStatusUrl = 'http://localhost:8081/status';
const isWindows = process.platform === 'win32';
const usesMetro = config.includes('debug');

let metroProcess = null;

function command(name) {
  return isWindows ? `${name}.cmd` : name;
}

function spawnCommand(name, args) {
  if (name !== 'npx') {
    throw new Error(`Comanda no permesa: ${name}`);
  }

  const npxScript =
    process.platform === 'win32'
      ? path.join(
          path.dirname(process.execPath),
          'node_modules',
          'npm',
          'bin',
          'npx-cli.js',
        )
      : require.resolve('npm/bin/npx-cli.js');

  return spawn(process.execPath, [npxScript, ...args], {
    shell: false,
    stdio: 'inherit',
    windowsHide: true,
  });
}

function checkMetro() {
  return new Promise((resolve) => {
    const request = http.get(metroStatusUrl, (response) => {
      let body = '';

      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolve(
          response.statusCode === 200 &&
            body.includes('packager-status:running'),
        );
      });
    });

    request.on('error', () => resolve(false));
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function startMetro() {
  metroProcess = spawnExpo();

  metroProcess.on('error', (error) => {
    console.error(`No s'ha pogut iniciar Metro: ${error.message}`);
  });

  metroProcess.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`Metro exited with code ${code}`);
    }

    if (signal) {
      console.error(`Metro exited with signal ${signal}`);
    }
  });
}

async function waitForMetro() {
  const startedAt = Date.now();
  const timeoutMs = 120000;

  while (Date.now() - startedAt < timeoutMs) {
    if (await checkMetro()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error('Timed out waiting for Metro on port 8081');
}

function runDetox(operation, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const detox = spawnDetox(operation, config, extraArgs);

    detox.on('error', reject);

    detox.on('exit', (code, signal) => {
      if (signal) {
        console.error(`Detox exited with signal ${signal}`);
        resolve(1);
        return;
      }

      resolve(code ?? 1);
    });
  });
}

function stopMetro() {
  if (metroProcess && !metroProcess.killed) {
    metroProcess.kill();
  }
}

async function main() {
  const metroAlreadyRunning = usesMetro ? await checkMetro() : true;

  if (usesMetro && !metroAlreadyRunning) {
    startMetro();
    await waitForMetro();
  }
  if (shouldBuild) {
    const buildExitCode = await runDetox('build');

    if (buildExitCode !== 0) {
      stopMetro();
      process.exit(buildExitCode);
    }
  }

  const exitCode = await runDetox('test', passthroughArgs);

  stopMetro();
  process.exit(exitCode);
}

process.on('SIGINT', () => {
  stopMetro();
  process.exit(130);
});

process.on('SIGTERM', () => {
  stopMetro();
  process.exit(143);
});

main().catch((error) => {
  console.error(error.message);
  stopMetro();
  process.exit(1);
});
