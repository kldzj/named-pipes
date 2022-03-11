import { Writable, WritableOptions } from 'stream';
import { Server, Socket } from 'net';
import { NamedPipe } from '..';
import { EventMap, BaseSender, SenderOptions } from '../base';

export const DEFAULT_SOCKET_SENDER_OPTIONS: SenderOptions = { autoDestroy: true };

export class SocketSenderWritable extends Writable {
  private _sender: SocketSender;

  get sender(): SocketSender {
    return this._sender;
  }

  constructor(sender: SocketSender, opts?: WritableOptions) {
    super(opts);
    this._sender = sender;
  }

  _write(chunk: any, _encoding?: any, callback?: any): boolean {
    const sockets = this.sender.getSockets();
    if (!sockets.length) {
      return false;
    }

    function write(socket?: Socket) {
      if (!socket) return callback();
      if (socket.writable) {
        socket.write(chunk, () => write(sockets.shift()));
      } else {
        write(sockets.shift());
      }
    }

    write(sockets.shift());
    return true;
  }
}

export class SocketSender extends BaseSender {
  private server?: Server;
  private sockets: Socket[] = [];

  constructor(pipe: NamedPipe, opts: SenderOptions = DEFAULT_SOCKET_SENDER_OPTIONS) {
    super(pipe, opts, 'socket');
  }

  public getWritableStream(opts?: WritableOptions): SocketSenderWritable {
    return new SocketSenderWritable(this, opts);
  }

  public getServer(): Server | undefined {
    return this.server;
  }

  public getSockets(): Socket[] {
    return this.sockets;
  }

  public connect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isConnected()) {
        return resolve();
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
        this.emit('connected');
        this.connected = true;
        resolve();
      });
    });
  }

  public write(data: any): boolean {
    if (!this.isConnected()) {
      throw new Error('Not connected');
    }

    const sockets = this.sockets.filter((socket) => socket.writable);
    this.debug('Writing %d bytes to %d socket(s)', data.length, sockets.length);
    sockets.forEach((socket) => socket.write(data));

    return sockets.length > 0;
  }

  public destroy(): this {
    for (const socket of this.sockets) {
      socket.destroy(new Error('Pipe destroyed'));
    }

    this.debug('Destroying SocketSender');
    this.server?.close();
    this.server = undefined;
    this.connected = false;

    return this;
  }
}
