import { Socket } from 'net';
import { FileHandle } from 'fs/promises';
import { promises as fs, constants as FSC } from 'fs';
import { PassThrough, Readable, TransformOptions } from 'stream';
import { NamedPipe, mkfifo } from '..';
import { BaseReceiver } from '../base';

export class FIFOReceiver extends BaseReceiver {
  private handle?: FileHandle;
  private readable?: Readable;

  constructor(pipe: NamedPipe) {
    super(pipe, 'fifo');
  }

  public getReadableStream(opts?: TransformOptions): Readable {
    if (!this.readable) {
      throw new Error('Socket not connected');
    }

    return this.readable.pipe(new PassThrough(opts));
  }

  public async connect(): Promise<this> {
    if (this.isConnected()) {
      return this;
    }

    if (!this.exists()) {
      throw new Error('FIFO does not exist');
    }

    this.handle = await fs.open(this.pipe.path, FSC.O_RDWR | FSC.O_NONBLOCK);
    const socket = new Socket({ fd: this.handle.fd, writable: false });
    this.readable = socket;
    this.readable.on('error', (err) => this.emit('error', err));
    this.readable.on('close', () => this.emit('close'));
    this.readable.on('data', (c) => {
      this.debug(`Received ${c.length} bytes`);
      this.emit('data', c);
    });

    this.connected = true;
    this.emit('connect');

    return this;
  }

  public async destroy(): Promise<this> {
    this.debug('Destroying FIFOReceiver');
    this.readable?.destroy();
    this.readable = undefined;
    this.connected = false;

    if (this.exists()) {
      await fs.unlink(this.pipe.path);
    }

    return this;
  }
}
