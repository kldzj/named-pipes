import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { which } from '@kldzj/which';
import { getDebugLogger } from './debug';

const debug = getDebugLogger('mkfifo');

function _mkfifo(path: string, mode?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (existsSync(path)) {
      return reject(new Error(`File '${path}' already exists`));
    }

    debug(`Creating FIFO at '${path}' ${mode ? `with mode ${mode?.toString(8)}` : 'without mode'}`);
    const args = [...(mode ? ['-m', mode.toString(8)] : []), path];
    const proc = spawn('mkfifo', args, { detached: false });
    proc.once('error', (err) => reject(err));
    proc.once('exit', (code) => {
      if (code !== 0) {
        return reject(new Error(`Failed to create FIFO at '${path}'`));
      }

      resolve();
    });
  });
}

let exists: boolean;
export async function mkfifo(path: string, mode?: number) {
  if (process.platform === 'win32') {
    throw new Error('mkfifo is not supported on Windows');
  }

  if (exists || (exists = which.sync('mkfifo') !== null)) {
    await _mkfifo(path, mode);
  } else {
    throw new Error('Unsupported platform: mkfifo is not available');
  }
}
