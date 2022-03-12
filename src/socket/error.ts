import { SocketSender } from '.';

export class SocketWriteError extends Error {
  private _sender: SocketSender;
  private _errors: Error[];

  get sender() {
    return this._sender;
  }

  get errors() {
    return this._errors;
  }

  constructor(message: string, sender: SocketSender, errors: Error[]) {
    super(message);
    this._sender = sender;
    this._errors = errors;
  }
}
