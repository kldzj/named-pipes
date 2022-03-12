import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { join, resolve, sep } from 'path';
import { NamedPipe } from '.';

function _createUnixPipe(path: string, mode?: number): NamedPipe {
  return new NamedPipe(path, mode);
}

function _createWindowsPipe(name: string): NamedPipe {
  return new NamedPipe(`\\\\.\\pipe\\${name.replace(/:/g, '')}`);
}

/**
 *
 * @param name Name of the pipe, if omitted a random name will be generated
 * @param mode The mode of the pipe, if omitted the pipe will be created as a writable pipe. Will be ignored on Windows
 * @returns A NamedPipe instance
 */
export function createNamedPipe(name?: string, mode?: number) {
  if (!name) {
    name = randomBytes(8).toString('hex');
  }

  if (process.platform === 'win32') {
    return _createWindowsPipe(name);
  }

  if (!name.includes(sep)) {
    name = join(tmpdir(), `pipe-${name}`);
  }

  return _createUnixPipe(resolve(process.cwd(), name), mode);
}

export const internal = { _createUnixPipe, _createWindowsPipe };
