## named-pipes

### Installation

Using npm: `$ npm i -S @kldzj/named-pipes`

Using yarn: `$ yarn add @kldzj/named-pipes`

### Example usage

```typescript
import { createNamedPipe } from '@kldzj/named-pipes';

const pipe = createNamedPipe();
const sender = pipe.createSender();
await sender.connect();

const receiver = pipe.createReceiver();
receiver.on('data', (c) => console.log(c.toString()));
await receiver.connect();

sender.write('hello world');
sender.destroy();
```