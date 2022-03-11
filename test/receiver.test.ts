import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, unlinkSync } from 'fs';
import { delay } from '.';
import { createNamedPipe, NamedPipe } from '../src';

let dir: string | undefined;
let pipe: NamedPipe | undefined;
afterEach(() => {
  pipe?.destroy();
  pipe = undefined;

  if (dir) {
    try {
      unlinkSync(dir);
    } catch (_) {}
  }
});

describe('Receiver', () => {
  it('should be able to connect', async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();
    const receiver = pipe.createReceiver();

    const callback = jest.fn();
    receiver.on('connect', callback);
    await sender.connect();
    await receiver.connect();

    sender.once('connect', () => {
      expect(receiver.isConnected()).toBe(true);
      expect(callback).toBeCalledTimes(1);
    });
  });

  it('should be able to read', async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();
    const receiver = pipe.createReceiver();
    await sender.connect();
    await receiver.connect();

    const callback = jest.fn();
    receiver.on('data', callback);

    sender.once('connect', () => {
      sender.write('test', () => {
        expect(callback).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
      });
    });
  });

  it('should be able to read and destroy', async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();
    const receiver = pipe.createReceiver();
    await sender.connect();
    await receiver.connect();

    const callback = jest.fn();
    receiver.on('data', callback);

    sender.once('connect', () => {
      sender.write('test', () => {
        pipe = undefined;
        expect(callback).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
      });
    });
  });

  it('should be able to read with mode', async () => {
    pipe = createNamedPipe('mode', 0o640);
    const sender = pipe.createSender();
    const receiver = pipe.createReceiver();
    await sender.connect();
    await receiver.connect();

    const callback = jest.fn();
    receiver.on('data', callback);

    sender.once('connect', () => {
      sender.write('test', () => {
        expect(callback).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
      });
    });
  });

  it('should be able to read from readable', async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();
    await sender.connect();

    const receiver = pipe.createReceiver();
    await receiver.connect();

    const callback = jest.fn();
    receiver.getReadableStream().on('data', callback);

    sender.once('connect', () => {
      sender.write('test', () => {
        expect(callback).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
      });
    });
  });

  it('should be able to read with absolute path', async () => {
    dir = process.platform === 'win32' ? 'test' : mkdtempSync(join(tmpdir(), 'named-pipe-test-'));
    pipe = createNamedPipe(join(dir, 'sock'));

    const sender = pipe.createSender();
    await sender.connect();

    const callback = jest.fn();
    const receiver = pipe.createReceiver();
    receiver.on('data', callback);
    await receiver.connect();

    sender.once('connect', () => {
      sender.write('test', () => {
        expect(callback).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
      });
    });
  });

  it('should handle multiple pipes without blocking', async () => {
    await Promise.all(
      new Array(15).fill(0).map(async (_, i) => {
        const pipe = createNamedPipe(`multi-${i}`);
        const sender = pipe.createSender();
        const receiver = pipe.createReceiver();

        const callback = jest.fn();
        receiver.on('data', callback);

        await sender.connect();
        await receiver.connect();

        if (process.platform === 'win32') {
          await new Promise<void>((resolve) => {
            if (sender.isConnected()) {
              return resolve();
            }

            sender.once('connect', resolve);
          });
        }

        await new Promise<void>((resolve, reject) => {
          sender.write('test', (err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        });

        await delay(25);
        await pipe.destroy();
        expect(callback).toBeCalledWith(expect.any(Buffer));
      })
    );
  });
});
