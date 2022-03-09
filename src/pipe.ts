import { existsSync, unlinkSync, accessSync, constants as FSC } from 'fs';
import { getDebugLogger, Receiver, ReceiverOptions, Sender, SenderOptions } from '.';

export class NamedPipe {
  #path: string;

  #sender?: Sender;
  #receivers: Receiver[] = [];
  #debug = getDebugLogger('pipe');

  get path() {
    return this.#path;
  }

  constructor(path: string) {
    this.#path = path;
  }

  public exists() {
    return existsSync(this.#path);
  }

  public createReceiver(opts?: ReceiverOptions) {
    this.#debug('Creating receiver');
    const receiver = new Receiver(this, opts);
    this.#receivers.push(receiver);
    return receiver;
  }

  public createSender(opts?: SenderOptions) {
    if (this.#sender) {
      return this.#sender;
    }

    this.#debug('Creating sender');
    this.#sender = new Sender(this, opts);
    return this.#sender;
  }

  public destroy() {
    this.#debug('Destroying pipe');
    this.#sender?.destroy();
    this.#receivers.forEach((receiver) => receiver.destroy());

    if (process.platform !== 'win32' && this.exists()) {
      this.#debug('Unlinking pipe');
      unlinkSync(this.#path);
    }
  }
}
