import { Socket } from 'net';
import { FileHandle } from 'fs/promises';
import { TransformOptions, Writable } from 'stream';
import { promises as fs, constants as FSC } from 'fs';
import { mkfifo, NamedPipe } from '..';
import { BaseSender, delay, SenderOptions } from '../base';

export const DEFAULT_FIFO_SENDER_OPTIONS: SenderOptions = { autoDestroy: true };

export class FIFOSenderWritable extends Writable {
  private _sender: FIFOSender;

  get sender(): FIFOSender {
    return this._sender;
  }

  constructor(sender: FIFOSender, opts?: TransformOptions) {
    super(opts);
    this._sender = sender;
  }

  _write(chunk: any, _encoding?: any, callback?: any): boolean {
    return this.sender.write(chunk, callback);
  }

  _destroy(_error: Error | null, callback: (error?: Error | null) => void): void {
    this.sender
      .destroy()
      .then(() => callback())
      .catch(callback);
  }
}

export class FIFOSender extends BaseSender {
  private handle?: FileHandle;
  private socket?: Socket;
  private writable?: Writable;

  constructor(pipe: NamedPipe, opts: SenderOptions = DEFAULT_FIFO_SENDER_OPTIONS) {
    super(pipe, opts, 'fifo');
  }

  public getSocket(): Socket | undefined {
    return this.socket as Socket | undefined;
  }

  public getWritableStream(opts?: TransformOptions): Writable {
    if (!this.socket) {
      throw new Error('Not connected');
    }

    if (!this.writable) {
      this.writable = new FIFOSenderWritable(this, opts);
    }

    return this.writable;
  }

  public async connect(): Promise<this> {
    if (this.isConnected()) {
      return this;
    }

    if (!this.exists()) {
      this.debug('Creating FIFO');
      await mkfifo(this.pipe.path, this.pipe.mode);
    }

    this.handle = await fs.open(this.pipe.path, FSC.O_RDWR | FSC.O_NONBLOCK);
    const socket = new Socket({ fd: this.handle.fd, readable: false });
    this.socket = socket;
    socket.on('error', (err) => this.emit('error', err));
    socket.on('close', () => this.emit('close'));

    delay(10).then(() => {
      this.debug('Connected');
      this.connected = true;
      this.emit('connected');
    });

    return this;
  }

  public write(chunk: any, callback?: (err?: Error) => void): boolean {
    if (!this.socket) {
      return callback?.(new Error('Not connected')) ?? false;
    }

    this.debug(`Writing ${chunk.length} bytes`);
    return this.socket.write(chunk, callback);
  }

  public async destroy(): Promise<this> {
    this.debug('Destroying FIFOSender');
    this.writable?.destroy();
    this.socket?.destroy();
    this.socket = undefined;
    this.writable = undefined;
    this.connected = false;

    if (this.exists()) {
      await fs.unlink(this.pipe.path);
    }

    return this;
  }
}
