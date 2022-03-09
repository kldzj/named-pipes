import { existsSync, unlinkSync } from 'fs';
import { getDebugLogger, Receiver, ReceiverOptions, Sender, SenderOptions } from '.';

export class NamedPipe {
  private _path: string;
  private sender?: Sender;
  private receivers: Receiver[] = [];
  private debug = getDebugLogger('pipe');

  get path() {
    return this._path;
  }

  constructor(path: string) {
    this._path = path;
  }

  public exists() {
    return existsSync(this.path);
  }

  public createReceiver(opts?: ReceiverOptions) {
    this.debug('Creating receiver');
    const receiver = new Receiver(this, opts);
    this.receivers.push(receiver);
    return receiver;
  }

  public createSender(opts?: SenderOptions) {
    if (this.sender) {
      return this.sender;
    }

    this.debug('Creating sender');
    this.sender = new Sender(this, opts);
    return this.sender;
  }

  public destroy() {
    this.debug('Destroying pipe');
    this.sender?.destroy();
    this.receivers.forEach((receiver) => receiver.destroy());

    if (process.platform !== 'win32' && this.exists()) {
      this.debug('Unlinking pipe');
      unlinkSync(this.path);
    }
  }
}
