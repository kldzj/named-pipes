This package allows you to work with named pipes to write to or read from. You can listen to arbitrary named pipes, or you can create named pipes and write to them. It works on both Windows using `net.Socket` and Unix using `mkfifo`.

## Installation

Using yarn:
```sh-session
$ yarn add @kldzj/named-pipes
```

Using npm:
```sh-session
$ npm i -S @kldzj/named-pipes
```

## Example usage

```typescript
import { createNamedPipe } from '@kldzj/named-pipes';

// You may also name the pipe yourself,
// or even pass a writable absolute path.
const pipe = createNamedPipe(/* '/var/cool.sock', 0o640 */);
console.log('Path to socket:', pipe.path);

const sender = pipe.createSender();
const receiver = pipe.createReceiver();

// sender.connect() will create the pipe
await sender.connect();
// receiver.connect() will fail if the pipe does not exist
await receiver.connect();

// handle data
receiver.on('data', (c) => console.log(c.toString()));
// or pipe it somewhere
receiver.getReadableStream().pipe(someDestinationStream);

// FIFO sender might not be ready yet,
// wait for socket to be connected
sender.once('connect', () => {
  // use the convenience write method
  sender.write('hello world');
  // or create a writable stream and pipe to it
  someSourceStream.pipe(sender.getWritableStream());
});

// once you're done, destroy the pipe
await pipe.destroy();
```

## Notes

It is recommended to use the `createNamedPipe` function instead of using the exported classes directly.

The order in which you connect the sender and receiver is important. If you are writing to a pipe and then reading from it, you should connect the sender first. If you're only reading from a pipe, you do not need a sender.

### `createNamedPipe(name?: string)`

In case the pipe name is not an absolute path, the pipe will be created in the os tmp directory. If the pipe name is omitted, a random name will be generated.

### NamedPipe

Is a reference to a named pipe. You can use it to create a sender or receiver, or to destroy the pipe. On its own, it's not going to do anything. You can use the `.path` property to get the absolute path.

To actually create a named pipe you need to create a `Sender` using `.createSender()`. Returns `SocketSender` on Windows and `FIFOSender` on Unix.

To listen to a named pipe you need to create a `Receiver` using `.createReceiver()`. Returns `SocketReceiver` on Windows and `FIFOReceiver` on Unix.

`.exists()` should be used to check if the pipe exists before creating a `Receiver`.

`.destroy()` will destroy all the receivers, the sender and all its existing connections.

### Sender

The sender will create a socket server on Windows or a FIFO on Unix and listen for incoming connections on the specified path. There will be a maximum of one sender per pipe. You must call `.connect()` to actually create the socket.

**Important:** The FIFO sender might not be ready after the `.connect()` promise has resolved, so you should use the `.once('connect', () => {})` event to wait for the socket to be connected before writing, otherwise you'll have thread blocking issues.

Use `.getWritableStream()` to get a writable stream that you can pipe to.

It will fail to connect (start the server) if:
- the path is already in use
- the path is not writable

### Receiver

The receiver will create a socket client and connect to the specified path. You must call `.connect()` before you can start reading.

Use `.getReadableStream()` to get a readable stream that you can pipe somewhere.

It will fail to connect if:
- the path does not exist
- the path is not readable
- the path is not a socket