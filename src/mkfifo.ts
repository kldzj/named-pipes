import { existsSync } from 'fs';
import { exec } from 'child_process';
import { getDebugLogger } from './debug';

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

function _mkfifo(path: string, mode?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (existsSync(path)) {
      return reject(new Error(`File '${path}' already exists`));
    }

    debug(`Creating FIFO at '${path}' ${mode ? `with mode ${mode?.toString(8)}` : 'without mode'}`);
    const command = ['mkfifo', ...(mode ? [`-m="${mode.toString(8)}"`] : []), `"${path}"`].join(' ');
    exec(command, (err, stdout, stderr) => {
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
export async function mkfifo(path: string, mode?: number) {
  if (process.platform === 'win32') {
    throw new Error('mkfifo is not supported on Windows');
  }

  if (exists || (exists = await unixCommandExists('mkfifo'))) {
    await _mkfifo(path, mode);
  } else {
    throw new Error('Unsupported platform: mkfifo is not available');
  }
}
