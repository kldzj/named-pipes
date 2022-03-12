import { TransformOptions, Writable } from 'stream';
import { Server, Socket } from 'net';
import { NamedPipe } from '..';
import { BaseSender, SenderOptions, delay } from '../base';
import { SocketWriteError } from './error';

export const DEFAULT_SOCKET_SENDER_OPTIONS: SenderOptions = { autoDestroy: true };

export class SocketSenderWritable extends Writable {
  private _sender: SocketSender;

  get sender(): SocketSender {
    return this._sender;
  }

  constructor(sender: SocketSender, opts?: TransformOptions) {
    super(opts);
    this._sender = sender;
  }

  _write(chunk: any, _encoding?: any, callback?: any): boolean {
    return this.sender.write(chunk, callback);
  }
}

export class SocketSender extends BaseSender {
  private server?: Server;
  private writable?: SocketSenderWritable;
  private sockets: Socket[] = [];

  constructor(pipe: NamedPipe, opts: SenderOptions = DEFAULT_SOCKET_SENDER_OPTIONS) {
    super(pipe, opts, 'socket');
  }

  public getWritableStream(opts?: TransformOptions): SocketSenderWritable {
    if (!this.writable) {
      this.writable = new SocketSenderWritable(this, opts);
    }

    return this.writable;
  }

  // public getServer(): Server | undefined {
  //   return this.server;
  // }

  public connect(): Promise<this> {
    return new Promise((resolve) => {
      if (this.isConnected()) {
        return resolve(this);
      }

      this.server = new Server((socket) => {
        this.sockets.push(socket);
        this.debug('New connection');

        socket.on('error', (err) => {
          this.debug('Socket error:', err.message);
          if (err.message.includes('EPIPE')) {
            socket.end();
          }
        });

        socket.on('close', (hadError) => {
          if (hadError) this.debug('Warning: Socket closed with error');
          this.sockets = this.sockets.filter((sock) => sock !== socket);
          this.debug('%d socket(s) remaining', this.sockets.length);

          if (this.sockets.length === 0) {
            this.server?.close();
            this.connected = false;
            this.emit('close');
          }
        });

        if (!this.isConnected()) {
          delay(10).then(() => {
            this.debug('Connection ready');
            this.connected = true;
            this.emit('connected');
          });
        }
      });

      this.server.on('error', (e) => this.emit('error', e));
      this.server.listen({ path: this.pipe.path }, () => {
        this.debug('Listening on %s', this.pipe.path);
        resolve(this);
      });
    });
  }

  public write(chunk: any, callback?: (err?: Error) => void): boolean {
    if (!this.isConnected()) {
      callback?.(new Error('Not connected'));
      return false;
    }

    const sockets = this.sockets.filter((socket) => socket.writable);
    const count = sockets.length;

    let finished = 0;
    let errors: Error[] = [];
    sockets.forEach((socket) => {
      socket.write(chunk, (err) => {
        if (err && !err.message.includes('EPIPE')) {
          this.debug('Failed to write to socket:', err.message);
          errors.push(err);
        }

        if (++finished === count) {
          if (errors.length) {
            callback?.(new SocketWriteError(`${errors.length} socket(s) failed to write`, this, errors));
            return;
          }

          callback?.();
        }
      });
    });

    this.debug('Writing %d bytes to %d socket(s)', chunk.length, sockets.length);
    return count > 0;
  }

  public destroy(): Promise<this> {
    return new Promise((resolve) => {
      for (const socket of this.sockets) {
        socket.destroy();
      }

      this.debug('Destroying SocketSender');
      this.connected = false;
      this.writable?.end();
      this.writable = undefined;
      this.server?.close(() => {
        this.server = undefined;
        resolve(this);
      });
    });
  }
}
