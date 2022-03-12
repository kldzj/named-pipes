import { existsSync } from 'fs';
import { getDebugLogger, SocketReceiver, SocketSender, FIFOReceiver, FIFOSender } from '.';
import { BaseSender, BaseReceiver } from './base';

export class NamedPipe {
  private _path: string;
  private _mode?: number;
  private sender?: BaseSender;
  private receivers: BaseReceiver[] = [];
  private debug = getDebugLogger('pipe');

  get path() {
    return this._path;
  }

  get mode() {
    return this._mode;
  }

  constructor(path: string, mode?: number) {
    this._path = path;
    this._mode = mode;
  }

  public exists(): boolean {
    return existsSync(this.path);
  }

  public createReceiver(): BaseReceiver {
    let receiver: BaseReceiver;
    this.debug('Creating receiver');
    if (process.platform === 'win32') {
      this.debug('Falling back to SocketReceiver');
      receiver = new SocketReceiver(this);
    } else {
      receiver = new FIFOReceiver(this);
    }

    this.receivers.push(receiver);
    return receiver;
  }

  public createSender(): BaseSender {
    if (this.sender) {
      return this.sender;
    }

    this.debug('Creating sender');
    if (process.platform === 'win32') {
      this.sender = new SocketSender(this);
    } else {
      this.sender = new FIFOSender(this);
    }

    return this.sender;
  }

  public async destroy(): Promise<this> {
    this.debug('Destroying pipe');
    await Promise.all(this.receivers.map((receiver) => receiver.destroy()));
    await this.sender?.destroy();
    return this;
  }
}
