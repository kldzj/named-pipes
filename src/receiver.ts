import { Socket } from 'net';
import { PassThrough, Readable, TransformOptions } from 'stream';
import { getDebugLogger, NamedPipe } from '.';
import { EventMap, Base } from './base';

export interface ReceiverEvents extends EventMap {
  end: () => void;
  data: (data: Buffer) => void;
  ready: () => void;
  drain: () => void;
  timeout: () => void;
}

export interface ReceiverOptions {
  /**
   * Automatically destroy socket when stream is ended
   * @default true
   */
  autoDestroy: boolean;
  /**
   * If allowHalfOpen is true, then the socket won't automatically send
   * a FIN packet when the other end of the socket sends a FIN packet.
   * @default false
   */
  allowHalfOpen: boolean;
}

export const DEFAULT_RECEIVER_OPTIONS: ReceiverOptions = {
  autoDestroy: true,
  allowHalfOpen: false,
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class Receiver extends Base<ReceiverEvents, ReceiverOptions> {
  private socket?: Socket;
  private debug = getDebugLogger('receiver');

  constructor(pipe: NamedPipe, opts: ReceiverOptions = DEFAULT_RECEIVER_OPTIONS) {
    super(pipe, opts);
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
      this.socket.on('ready', () => this.emit('ready'));
      this.socket.on('drain', () => this.emit('drain'));
      this.socket.on('timeout', () => this.emit('timeout'));
      this.socket.on('connect', () => this.emit('connected'));
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
    this.debug('Destroying socket');
    this.socket?.destroy();
    this.socket = undefined;
    this.connected = false;
  }
}
