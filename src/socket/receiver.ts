import { Socket } from 'net';
import { PassThrough, Readable, TransformOptions } from 'stream';
import { NamedPipe } from '..';
import { EventMap, BaseReceiver, ReceiverOptions } from '../base';

export interface SocketReceiverEvents extends EventMap {
  end: () => void;
  data: (data: Buffer) => void;
  ready: () => void;
  drain: () => void;
  timeout: () => void;
}

export const DEFAULT_SOCKET_RECEIVER_OPTIONS: ReceiverOptions = {
  autoDestroy: true,
  allowHalfOpen: false,
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class SocketReceiver extends BaseReceiver {
  private socket?: Socket;

  constructor(pipe: NamedPipe, opts: ReceiverOptions = DEFAULT_SOCKET_RECEIVER_OPTIONS) {
    super(pipe, opts, 'socket');
  }

  public getReadableStream(opts?: TransformOptions): Readable {
    if (!this.socket || !this.isConnected()) {
      throw new Error('Socket not connected');
    }

    return this.socket.pipe(new PassThrough(opts));
  }

  public getSocket(): Socket | undefined {
    return this.socket;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.exists()) {
        return reject(new Error('Pipe not found'));
      }

      if (this.isConnected()) {
        return resolve();
      }

      this.socket = new Socket({
        allowHalfOpen: this.options.allowHalfOpen,
      });

      this.socket.on('end', () => {
        this.debug('Socket ended');
        if (this.options.autoDestroy) {
          this.destroy();
        }

        this.emit('end');
      });

      this.socket.on('close', () => this.emit('close'));
      this.socket.on('timeout', () => this.emit('timeout'));
      this.socket.on('connect', () => this.emit('connect'));
      this.socket.on('error', (e) => this.emit('error', e));
      this.socket.on('data', (c) => {
        this.debug('Reading %d bytes', c.length);
        this.emit('data', c);
      });

      this.debug('Connecting to pipe');
      this.socket.connect({ path: this.pipe.path }, () => {
        this.debug('Connected to pipe');
        this.connected = true;

        // Windows seems to need a little bit of time to connect
        if (process.platform === 'win32') {
          delay(10).then(() => resolve());
        } else {
          resolve();
        }
      });
    });
  }

  public destroy() {
    this.debug('Destroying SocketReceiver');
    this.socket?.destroy();
    this.socket = undefined;
    this.connected = false;
  }
}
