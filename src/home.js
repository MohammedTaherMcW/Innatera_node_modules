import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const GITHUB_REPO_URL = 'https://github.com/Ineshmcw/Innatera_home.git';
const REPO_LOCAL_PATH = path.join(__dirname, 'Innatera_home');

async function cloneAndBuildRepo() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(REPO_LOCAL_PATH)) {
      // Clone the repository
      exec(`git clone ${GITHUB_REPO_URL} ${REPO_LOCAL_PATH}`, (cloneErr) => {
        if (cloneErr) {
          return reject(cloneErr);
        }
        // Navigate to the repo directory and run build commands
        exec(`cd ${REPO_LOCAL_PATH} && npm install && npm run build`, (buildErr) => {
          if (buildErr) {
            return reject(buildErr);
          }
          resolve();
        });
      });
    } else {
      // If already cloned, pull the latest changes and rebuild
      exec(`cd ${REPO_LOCAL_PATH} && git pull && npm install && npm run build`, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    }
  });
}

async function _ensureServerStarted(options = {}) {
  await cloneAndBuildRepo();

  if (_HTTP_PORT === 0) {
    _HTTP_PORT = options.port || (await findFreePort());
  }
  if (options.host) {
    _HTTP_HOST = options.host;
  }
  if (!(await isServerStarted())) {
    await new Promise((resolve, reject) => {
      const timeoutID = setTimeout(
        () => reject(new Error('Could not start PIO Home server: Timeout error')),
        SERVER_LAUNCH_TIMEOUT * 1000,
      );
      let output = '';
      runPIOCommand(
        [
          'home',
          '--port',
          _HTTP_PORT,
          '--host',
          _HTTP_HOST,
          '--session-id',
          SESSION_ID,
          '--shutdown-timeout',
          SERVER_AUTOSHUTDOWN_TIMEOUT,
          '--no-open',
        ],
        (code, stdout, stderr) => {
          if (code !== 0) {
            _HTTP_PORT = 0;
            return reject(new Error(stderr));
          }
        },
        {
          onProcStdout: (data) => {
            output += data.toString();
            if (output.includes('PIO Home has been started')) {
              clearTimeout(timeoutID);
              resolve(true);
            }
          },
        },
      );
    });
  }
  if (options.onIDECommand) {
    listenIDECommands(options.onIDECommand);
  }
  return {
    host: _HTTP_HOST,
    port: _HTTP_PORT,
    sessionId: SESSION_ID,
  };
}

export async function getWebviewContent(startUrl) {
  this._lastStartUrl = startUrl;
  await ensureServerStarted({
    port: extension.getConfiguration('pioHomeServerHttpPort'),
    host: extension.getConfiguration('pioHomeServerHttpHost'),
    onIDECommand: await this.onIDECommand.bind(this),
  });

  const theme = this.getTheme();
  const iframeId = `pioHomeIFrame-${vscode.env.sessionId}`;
  const iframeScript = `
<script>
  function execCommand(data) {
    document.getElementById('${iframeId}').contentWindow.postMessage({'command': 'execCommand', 'data': data}, '*');
  }
  for (const command of ['copy', 'paste', 'cut']) {
    document.addEventListener(command, (e) => {
      execCommand(command);
    });
  }
  document.addEventListener('selectstart', (e) => {
    execCommand('selectAll');
    e.preventDefault();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'z' && e.metaKey) {
      execCommand(e.shiftKey ? 'redo' : 'undo');
    }
  });
  window.addEventListener('message', (e) => {
    if (e.data.command === 'kbd-event') {
      window.dispatchEvent(new KeyboardEvent('keydown', e.data.data));
    }
  });
</script>
  `;
  return `<!DOCTYPE html>
    <html lang="en">
    <head>${IS_OSX ? iframeScript : ''}</head>
    <body style="margin: 0; padding: 0; height: 100%; overflow: hidden; background-color: ${
      theme === 'light' ? '#FFF' : '#1E1E1E'
    }">
      <iframe id="${iframeId}" src="file://${path.join(REPO_LOCAL_PATH, 'build', 'index.html')}"
        width="100%"
        height="100%"
        frameborder="0"
        style="border: 0; left: 0; right: 0; bottom: 0; top: 0; position:absolute;" />
    </body>
    </html>
  `;
}
