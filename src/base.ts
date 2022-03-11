import { Socket } from 'net';
import { Readable, TransformOptions, Writable, WritableOptions } from 'stream';
import { TypedEmitter, ListenerSignature } from 'tiny-typed-emitter';
import { NamedPipe } from '.';
import { Debugger, getDebugLogger } from './debug';

export type EventMap = ListenerSignature<unknown>;
interface BaseEvents extends EventMap {
  connect: () => void;
  close: () => void;
  error: (error: Error) => void;
}

abstract class Base<T extends ListenerSignature<T>, O extends {}> extends TypedEmitter<BaseEvents & T> {
  protected debug: Debugger;
  protected pipe: NamedPipe;
  protected connected: boolean;
  protected options: O;

  constructor(pipe: NamedPipe, opts: O, debugName: string) {
    super();
    this.pipe = pipe;
    this.connected = false;
    this.options = opts;
    this.debug = getDebugLogger(debugName);
  }

  public getOptions(): O {
    return this.options;
  }

  public getPipe(): NamedPipe {
    return this.pipe;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public abstract connect(): Promise<void>;

  public abstract destroy(): void;

  protected exists(): boolean {
    return this.pipe.exists();
  }
}

export interface ReceiverOptions {
  autoDestroy?: boolean;
  allowHalfOpen?: boolean;
}

export interface SocketReceiverEvents extends EventMap {
  end: () => void;
  data: (data: Buffer) => void;
  timeout: () => void;
}

export abstract class BaseReceiver extends Base<SocketReceiverEvents, ReceiverOptions> {
  constructor(pipe: NamedPipe, opts: ReceiverOptions, debugName: string) {
    super(pipe, opts, `receiver:${debugName}`);
  }

  public abstract getReadableStream(opts?: TransformOptions): Readable;
}

export interface SenderOptions {
  autoDestroy?: boolean;
}

export interface SenderEvents extends EventMap {
  connected: () => void;
}

export abstract class BaseSender extends Base<SenderEvents, SenderOptions> {
  constructor(pipe: NamedPipe, opts: SenderOptions, debugName: string) {
    super(pipe, opts, `sender:${debugName}`);
  }

  public abstract write(data: any): boolean;

  public abstract getWritableStream(opts?: WritableOptions): Writable;
}
