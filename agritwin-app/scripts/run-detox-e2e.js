const { spawn } = require('child_process');
const http = require('http');

const config = process.argv[2] || 'android.att.release';
const passthroughArgs = process.argv.slice(3).filter((arg) => arg !== '--build');
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
  return spawn(command(name), args, {
    shell: isWindows,
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
        resolve(response.statusCode === 200 && body.includes('packager-status:running'));
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
  metroProcess = spawnCommand('npx', [
    'expo',
    'start',
    '--dev-client',
    '--localhost',
  ]);

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

function runDetox(args) {
  return new Promise((resolve) => {
    const detox = spawnCommand('npx', args);

    detox.on('exit', (code, signal) => {
      if (signal) {
        console.error(`Detox exited with signal ${signal}`);
        resolve(1);
        return;
      }

      resolve(code || 0);
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
    const buildExitCode = await runDetox(detoxBuildArgs);

    if (buildExitCode !== 0) {
      process.exit(buildExitCode);
    }
  }

  const exitCode = await runDetox(detoxTestArgs);

  if (usesMetro && !metroAlreadyRunning) {
    stopMetro();
  }

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
