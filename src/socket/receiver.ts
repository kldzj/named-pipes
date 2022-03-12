import { Socket } from 'net';
import { PassThrough, Readable, TransformOptions } from 'stream';
import { NamedPipe } from '..';
import { BaseReceiver, delay } from '../base';

export class SocketReceiver extends BaseReceiver {
  private socket?: Socket;

  constructor(pipe: NamedPipe) {
    super(pipe, 'socket');
  }

  public getReadableStream(opts?: TransformOptions): Readable {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    return this.socket.pipe(new PassThrough(opts));
  }

  public getSocket(): Socket | undefined {
    return this.socket;
  }

  public connect(): Promise<this> {
    return new Promise((resolve, reject) => {
      if (!this.exists()) {
        return reject(new Error('Pipe not found'));
      }

      if (this.isConnected()) {
        return resolve(this);
      }

      this.socket = new Socket({ writable: false });
      this.socket.on('timeout', () => this.emit('timeout'));
      this.socket.on('error', (e) => this.emit('error', e));
      this.socket.on('close', () => this.emit('close'));
      this.socket.on('end', () => {
        this.connected = false;
        this.emit('end');
      });

      this.socket.on('data', (c) => {
        this.debug('Received %d bytes', c.length);
        this.emit('data', c);
      });

      this.debug('Connecting to pipe', this.pipe.path);
      this.socket.connect({ path: this.pipe.path }, () => {
        this.debug('Connected to pipe');
        delay(10).then(() => {
          this.connected = true;
          this.emit('connect');
          resolve(this);
        });
      });
    });
  }

  public destroy(): Promise<this> {
    return new Promise((resolve) => {
      this.debug('Destroying SocketReceiver');
      this.socket?.destroy();
      this.socket = undefined;
      this.connected = false;
      resolve(this);
    });
  }
}
