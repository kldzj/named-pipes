import { Socket } from 'net';
import { Writable, WritableOptions } from 'stream';
import { createWriteStream, unlinkSync, open, close, constants as FSC } from 'fs';
import { NamedPipe } from '..';
import { BaseSender, SenderOptions } from '../base';
import { mkfifo } from '../mkfifo';

export const DEFAULT_FIFO_SENDER_OPTIONS: SenderOptions = { autoDestroy: true };

export class FIFOSender extends BaseSender {
  private fd?: number;
  private socket?: Socket;
  private writable?: Writable;

  constructor(pipe: NamedPipe, opts: SenderOptions = DEFAULT_FIFO_SENDER_OPTIONS) {
    super(pipe, opts, 'fifo');
  }

  public getWritableStream(opts?: WritableOptions): Writable {
    if (!this.fd || !this.isConnected()) {
      throw new Error('Not connected');
    }

    if (!this.writable) {
      this.socket = new Socket({ fd: this.fd, readable: false, writable: true });
      this.socket.on('connect', () => this.emit('connect'));
      this.socket.on('close', () => this.emit('close'));
      this.socket.on('error', (err) => this.emit('error', err));
      this.writable = new Writable({
        ...opts,
        write: (chunk: any, _: BufferEncoding, cb: (e?: Error | null) => void) => {
          this.debug(`Writing ${chunk.length} bytes`);
          return this.socket?.write(chunk, _, cb) ?? false;
        },
      });
    }

    return this.writable;
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
      this.debug('Creating FIFO');
      await mkfifo(this.pipe.path, 'w');
    }

    this.fd = await this.open();
    this.connected = true;
  }

  public write(data: any): boolean {
    if (!this.isConnected()) {
      throw new Error('Not connected');
    }

    return this.getWritableStream().write(data);
  }

  public destroy(): this {
    this.debug('Destroying FIFOSender');
    this.connected = false;
    this.writable?.destroy();

    if (this.fd) {
      close(this.fd, () => {
        if (this.exists()) {
          unlinkSync(this.pipe.path);
        }
      });
    }

    return this;
  }
}
