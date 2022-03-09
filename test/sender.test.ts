import { delay } from '.';
import { createNamedPipe, NamedPipe } from '../src';

let pipe: NamedPipe | undefined;
afterEach(() => {
  pipe?.destroy();
  pipe = undefined;
});

describe('Sender', () => {
  it('should be able to connect', async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();
    await sender.connect();
    expect(sender.isConnected()).toBe(true);
  });

  it('should be able to write', async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();
    await sender.connect();
    expect(() => sender.write('test')).not.toThrow();
  });

  it('should throw when trying to write to destroyed socket', async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();
    await sender.connect();
    sender.destroy();
    expect(() => sender.write('test')).toThrow();
  });

  it('should emit when a socket connects', async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();

    const callback = jest.fn();
    sender.on('socket:connected', callback);
    await sender.connect();

    const receiver = pipe.createReceiver();
    await receiver.connect();

    await delay(100);

    expect(callback).toHaveBeenCalled();
  });
});
