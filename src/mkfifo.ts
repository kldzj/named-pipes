import { exec } from 'child_process';
import { getDebugLogger } from './debug';

export type FIFOMode = 'r' | 'w';

const debug = getDebugLogger('mkfifo');

function unixCommandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    debug(`Checking if command '${command}' exists`);
    exec(`command -v ${command}`, (error) => {
      if (error) {
        debug(`Command '${command}' does not exist`);
        resolve(false);
      } else {
        debug(`Command '${command}' exists`);
        resolve(true);
      }
    });
  });
}

function _mkfifo(path: string, mode: FIFOMode): Promise<void> {
  return new Promise((resolve, reject) => {
    debug(`Creating FIFO at '${path}' with mode '${mode}'`);
    exec(`mkfifo "${path}"`, (err, stdout, stderr) => {
      if (stdout) debug(stdout);
      if (err) {
        debug(stderr);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

let exists: boolean;
export async function mkfifo(path: string, mode: FIFOMode) {
  if (process.platform === 'win32') {
    throw new Error('mkfifo is not supported on Windows');
  }

  if (exists || (exists = await unixCommandExists('mkfifo'))) {
    await _mkfifo(path, mode);
  } else {
    throw new Error('Unsupported platform: mkfifo is not available');
  }
}
