import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { join, resolve, sep } from 'path';
import { NamedPipe } from '.';

function _createUnixPipe(path: string): NamedPipe {
  return new NamedPipe(path);
}

function _createWindowsPipe(name: string): NamedPipe {
  return new NamedPipe(`\\\\.\\pipe\\${name}`);
}

/**
 * Creates a named pipe.
 * @param name Name of the pipe.
 * @returns NamedPipe
 */
export function createNamedPipe(name?: string): NamedPipe {
  if (!name) {
    name = randomBytes(6).toString('hex') + '.sock';
  }

  if (process.platform === 'win32') {
    name = name.replace(/:/g, '');
    return _createWindowsPipe(name);
  }

  if (!name.includes(sep)) {
    name = join(tmpdir(), `pipe-${name}`);
  }

  return _createUnixPipe(resolve(process.cwd(), name));
}

export const internal = { _createUnixPipe, _createWindowsPipe };
