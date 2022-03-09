## named-pipes

### Installation

Using npm: `$ npm i -S @kldzj/named-pipes`

Using yarn: `$ yarn add @kldzj/named-pipes`

### Example usage

```typescript
import { createNamedPipe } from '@kldzj/named-pipes';

// You may also name the pipe yourself,
// or even pass a writable absolute path.
const pipe = createNamedPipe(/* '/var/cool.sock' */);

const sender = pipe.createSender();
const receiver = pipe.createReceiver();
receiver.on('data', (c) => console.log(c.toString()));

// sender.connect() will create the socket
await sender.connect();

// receiver.connect() will fail if socket does not exist
await receiver.connect();

sender.write('hello world');

// once you're done, destroy the server,
// this will close all existing connections
sender.destroy();
```