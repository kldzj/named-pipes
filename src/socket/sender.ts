import { TransformOptions, Writable } from 'stream';
import { Server, Socket } from 'net';
import { NamedPipe } from '..';
import { BaseSender, SenderOptions } from '../base';

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
  private sockets: Socket[] = [];

  constructor(pipe: NamedPipe, opts: SenderOptions = DEFAULT_SOCKET_SENDER_OPTIONS) {
    super(pipe, opts, 'socket');
  }

  public getWritableStream(opts?: TransformOptions): SocketSenderWritable {
    return new SocketSenderWritable(this, opts);
  }

  public getServer(): Server | undefined {
    return this.server;
  }

  public getSockets(): Socket[] {
    return this.sockets;
  }

  public connect(): Promise<this> {
    return new Promise((resolve) => {
      if (this.isConnected()) {
        return resolve(this);
      }

      this.server = new Server((socket) => {
        this.debug('New socket connected');
        socket.on('end', () => {
          this.debug('Connection ended');
          this.sockets = this.sockets.filter((s) => s !== socket);

          if (this.options.autoDestroy && this.sockets.length === 0) {
            this.debug('All sockets are ended, destroying pipe');
            this.destroy();
          }
        });

        this.sockets.push(socket);
      });

      this.server.on('close', () => this.emit('close'));
      this.server.on('error', (e) => this.emit('error', e));

      this.server.listen(this.pipe.path, () => {
        this.debug('Listening on %s', this.pipe.path);
        this.emit('connect');
        this.connected = true;
      });

      resolve(this);
    });
  }

  public write(chunk: any, callback?: (err?: Error) => void): boolean {
    const sockets = this.getSockets();
    if (!sockets.length) {
      return false;
    }

    function write(socket?: Socket) {
      if (!socket) return callback?.() ?? false;
      if (socket.writable) {
        socket.write(chunk, () => write(sockets.shift()));
      } else {
        write(sockets.shift());
      }
    }

    write(sockets.shift());
    return true;
  }

  public destroy(): Promise<this> {
    return new Promise((resolve) => {
      for (const socket of this.sockets) {
        socket.destroy();
      }

      this.debug('Destroying SocketSender');
      this.server?.close(() => resolve(this));
      this.server = undefined;
      this.connected = false;
    });
  }
}
