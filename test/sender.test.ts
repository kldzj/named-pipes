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
    const receiver = pipe.createReceiver();

    await sender.connect();
    await receiver.connect();
    await new Promise<void>((resolve) => {
      sender.once('connected', resolve);
    });

    expect(sender.isConnected()).toBe(true);
  });

  it('should be able to produce a writable stream', async () => {
    const pipe = createNamedPipe();
    const callback = jest.fn();
    const receiver = pipe.createReceiver();
    const sender = pipe.createSender();
    receiver.on('data', callback);

    await sender.connect();
    await receiver.connect();
    await new Promise<void>((resolve, reject) => {
      sender.once('connected', () => {
        const stream = sender.getWritableStream();
        stream.write('hello', () => {
          stream.write('world', (err) => {
            stream.end(() => {
              if (err) {
                return reject(err);
              }

              resolve();
            });
          });
        });
      });
    });

    await delay(100);
    await pipe.destroy();
    expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
  });
});
