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

  it('should throw when trying to write to destroyed pipe', async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();
    await sender.connect();
    sender.destroy();
    expect(() => sender.write('test')).toThrow();
  });

  it('should be able to produce a writable stream', async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();
    await sender.connect();
    const stream = sender.getWritableStream();

    const callback = jest.fn();
    const receiver = pipe.createReceiver();
    receiver.on('data', callback);
    await receiver.connect();

    expect(stream.writable).toBe(true);
    stream.write('hello', () => [
      stream.write('world', () => {
        stream.end(() => {
          expect(callback).toHaveBeenCalledTimes(2);
          expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
        });
      }),
    ]);
  });
});
