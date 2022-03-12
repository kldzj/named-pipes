import { Readable, TransformOptions, Writable, WritableOptions } from 'stream';
import { TypedEmitter, ListenerSignature } from 'tiny-typed-emitter';
import { NamedPipe, Debugger, getDebugLogger } from '.';

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface BaseEvents extends ListenerSignature<unknown> {
  close: () => void;
  error: (error: Error) => void;
}

abstract class Base<T extends ListenerSignature<T>> extends TypedEmitter<BaseEvents & T> {
  protected debug: Debugger;
  protected pipe: NamedPipe;
  protected connected: boolean;

  constructor(pipe: NamedPipe, debugName: string) {
    super();
    this.pipe = pipe;
    this.connected = false;
    this.debug = getDebugLogger(debugName);
  }

  public getPipe(): NamedPipe {
    return this.pipe;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public abstract connect(): Promise<this>;

  public abstract destroy(): Promise<this>;

  protected exists(): boolean {
    return this.pipe.exists();
  }
}

export interface ReceiverEvents extends BaseEvents {
  connect: () => void;
  end: () => void;
  data: (data: Buffer) => void;
  timeout: () => void;
}

export abstract class BaseReceiver extends Base<ReceiverEvents> {
  constructor(pipe: NamedPipe, debugName: string) {
    super(pipe, `${debugName}:receiver`);
  }

  public abstract getReadableStream(opts?: TransformOptions): Readable;
}

export interface SenderEvents extends BaseEvents {
  connected: () => void;
}

export abstract class BaseSender extends Base<SenderEvents> {
  constructor(pipe: NamedPipe, debugName: string) {
    super(pipe, `${debugName}:sender`);
  }

  public abstract write(data: any, callback?: (err?: Error) => void): boolean;

  public abstract getWritableStream(opts?: WritableOptions): Writable;
}
