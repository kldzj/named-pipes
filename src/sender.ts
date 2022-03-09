import { chmodSync } from 'fs';
import { Server, Socket } from 'net';
import { getDebugLogger, NamedPipe } from '.';
import { EventMap, Base } from './base';

export interface SenderEvents extends EventMap {
  'socket:connected': (socket: Socket) => void;
  'socket:disconnected': (socket: Socket) => void;
  'socket:error': (socket: Socket, error: Error) => void;
  'socket:ended': (socket: Socket) => void;
}

export interface SenderOptions {
  /**
   * Automatically destroy server when all sockets are ended
   * @default true
   */
  autoDestroy: boolean;
}

export const DEFAULT_SENDER_OPTIONS: SenderOptions = { autoDestroy: true };

export class Sender extends Base<SenderEvents, SenderOptions> {
  private server?: Server;
  private sockets: Socket[] = [];
  private debug = getDebugLogger('sender');

  constructor(pipe: NamedPipe, opts: SenderOptions = DEFAULT_SENDER_OPTIONS) {
    super(pipe, opts);
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
        socket.on('error', (e) => this.emit('socket:error', socket, e));
        socket.on('close', () => this.emit('socket:disconnected', socket));
        socket.on('end', () => {
          this.debug('Connection ended');
          this.sockets = this.sockets.filter((s) => s !== socket);
          this.emit('socket:ended', socket);

          if (this.options.autoDestroy && this.sockets.length === 0) {
            this.debug('All sockets are ended, destroying pipe');
            this.destroy();
          }
        });

        this.emit('socket:connected', socket);
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

  public write(data: any): void {
    if (!this.isConnected()) {
      throw new Error('Not connected');
    }

    this.debug('Writing %d bytes to %d socket(s)', data.length, this.sockets.length);
    this.sockets.forEach((socket) => socket.writable && socket.write(data));
  }

  public destroy() {
    for (const socket of this.sockets) {
      socket.destroy(new Error('Pipe destroyed'));
    }

    this.debug('Destroying server');
    this.server?.close();
    this.server = undefined;
    this.connected = false;
  }
}
