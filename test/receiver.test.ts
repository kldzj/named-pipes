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
    await sender.connect();

    const callback = jest.fn();
    const receiver = pipe.createReceiver();
    receiver.on('connected', callback);
    await receiver.connect();

    expect(receiver.isConnected()).toBe(true);
    expect(callback).toBeCalledTimes(1);
  });

  it('should be able to read', async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();
    await sender.connect();

    const receiver = pipe.createReceiver();
    await receiver.connect();

    const callback = jest.fn();
    receiver.on('data', callback);

    expect(receiver.getSocket()?.writable).toBe(true);
    sender.write('test');

    await delay(100);

    expect(callback).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it('should be able to read (with absolute path)', async () => {
    dir = mkdtempSync(join(tmpdir(), 'named-pipe-test-'));
    pipe = createNamedPipe(join(dir, 'sock'));
    const sender = pipe.createSender();
    await sender.connect();

    const receiver = pipe.createReceiver();
    await receiver.connect();

    const callback = jest.fn();
    receiver.on('data', callback);

    expect(receiver.getSocket()?.writable).toBe(true);
    sender.write('test');

    await delay(100);

    expect(callback).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
  });
});
