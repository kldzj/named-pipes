import { existsSync } from 'fs';
import { getDebugLogger, SocketReceiver, SocketSender, FIFOMode } from '.';
import { BaseSender, BaseReceiver, ReceiverOptions, SenderOptions } from './base';
import { FIFOReceiver, FIFOSender } from './fifo';

export class NamedPipe {
  private _path: string;
  private sender?: BaseSender;
  private receivers: BaseReceiver[] = [];
  private debug = getDebugLogger('pipe');

  get path() {
    return this._path;
  }

  constructor(path: string) {
    this._path = path;
  }

  public exists(): boolean {
    return existsSync(this.path);
  }

  public createReceiver(opts?: ReceiverOptions): BaseReceiver {
    let receiver: BaseReceiver;
    this.debug('Creating receiver');
    if (process.platform === 'win32') {
      this.debug('Falling back to SocketReceiver');
      receiver = new SocketReceiver(this, opts);
    } else {
      receiver = new FIFOReceiver(this, opts);
    }

    this.receivers.push(receiver);
    return receiver;
  }

  public createSender(opts?: SenderOptions): BaseSender {
    if (this.sender) {
      return this.sender;
    }

    this.debug('Creating sender');
    if (process.platform === 'win32') {
      this.sender = new SocketSender(this, opts);
    } else {
      this.sender = new FIFOSender(this, opts);
    }

    return this.sender;
  }

  public destroy(): this {
    this.debug('Destroying pipe');
    this.sender?.destroy();
    this.receivers.forEach((receiver) => receiver.destroy());
    return this;
  }
}
