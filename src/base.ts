import { TypedEmitter, ListenerSignature } from 'tiny-typed-emitter';
import { NamedPipe } from '.';

export type EventMap = ListenerSignature<unknown>;
interface BaseEvents extends EventMap {
  connected: () => void;
  close: () => void;
  error: (error: Error) => void;
}

export abstract class Base<T extends ListenerSignature<T>, O extends {}> extends TypedEmitter<BaseEvents & T> {
  protected pipe: NamedPipe;
  protected connected: boolean;
  protected options: O;

  constructor(pipe: NamedPipe, opts: O) {
    super();
    this.pipe = pipe;
    this.connected = false;
    this.options = opts;
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
