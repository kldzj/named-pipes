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

    sender.once('connect', () => {
      expect(sender.isConnected()).toBe(true);
    });
  });

  it('should be able to write', async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();
    await sender.connect();

    sender.once('connect', () => {
      expect(() => sender.write('test')).not.toThrow();
    });
  });

  it('should be able to produce a writable stream', async () => {
    pipe = createNamedPipe();
    const callback = jest.fn();
    const sender = pipe.createSender();
    sender.once('connect', () => {
      const stream = sender.getWritableStream();
      stream.write('hello', () => {
        stream.write('world', () => {
          stream.end(() => {
            expect(callback).toHaveBeenCalledTimes(2);
            expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
          });
        });
      });
    });

    await sender.connect();
    await pipe.createReceiver().on('data', callback).connect();
  });
});
