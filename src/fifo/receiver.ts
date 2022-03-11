import { Socket } from 'net';
import { open, close, constants as FSC } from 'fs';
import { PassThrough, Readable, TransformOptions } from 'stream';
import { NamedPipe } from '..';
import { BaseReceiver, ReceiverOptions } from '../base';
import { mkfifo } from '../mkfifo';

export const DEFAULT_FIFO_RECEIVER_OPTIONS: ReceiverOptions = {
  autoDestroy: true,
  allowHalfOpen: false,
};

export class FIFOReceiver extends BaseReceiver {
  private fd?: number;
  private readable?: Readable;

  constructor(pipe: NamedPipe, opts: ReceiverOptions = DEFAULT_FIFO_RECEIVER_OPTIONS) {
    super(pipe, opts, 'fifo');
  }

  public getReadableStream(opts?: TransformOptions): Readable {
    if (!this.readable) {
      throw new Error('Socket not connected');
    }

    return this.readable.pipe(new PassThrough(opts));
  }

  private open(): Promise<number> {
    return new Promise((resolve, reject) => {
      open(this.pipe.path, FSC.O_RDWR | FSC.O_NONBLOCK, (err, fd) => {
        if (err) {
          return reject(err);
        }

        resolve(fd);
      });
    });
  }

  public async connect(): Promise<void> {
    if (this.isConnected()) {
      return;
    }

    if (!this.exists()) {
      await mkfifo(this.pipe.path, 'r');
    }

    this.fd = await this.open();
    this.readable = new Socket({ fd: this.fd, readable: true, writable: false });
    this.readable.on('error', (err) => this.emit('error', err));
    this.readable.on('close', () => this.emit('close'));
    this.readable.on('data', (c) => {
      this.debug(`Received ${c.length} bytes`);
      this.emit('data', c);
    });

    this.emit('connect');
    this.connected = true;
  }

  public destroy() {
    this.debug('Destroying FIFOReceiver');
    this.readable?.destroy();
    if (this.fd) {
      close(this.fd);
    }
  }
}
