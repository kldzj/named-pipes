import { join } from "path";
import { tmpdir } from "os";
import { mkdtempSync, unlinkSync } from "fs";
import { delay } from ".";
import { createNamedPipe, NamedPipe } from "../src";

let dir: string | undefined;
let pipe: NamedPipe | undefined;
afterEach(async () => {
  await pipe?.destroy();
  pipe = undefined;

  if (dir) {
    try {
      unlinkSync(dir);
    } catch (_) {}
  }
});

describe("Receiver", () => {
  it("should be able to connect", async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();
    const receiver = pipe.createReceiver();

    await sender.connect();
    await receiver.connect();
    await new Promise<void>((resolve) => {
      sender.once("connected", resolve);
    });

    expect(sender.isConnected()).toBe(true);
    expect(receiver.isConnected()).toBe(true);
  });

  it("should be able to read", async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();
    const receiver = pipe.createReceiver();

    const callback = jest.fn();
    receiver.on("data", callback);

    await sender.connect();
    await receiver.connect();

    await new Promise<void>((resolve, reject) => {
      sender.once("connected", () => {
        sender.write("test", (err) => {
          if (err) {
            return reject(err);
          }

          resolve();
        });
      });
    });

    await sender.destroy();
    await delay(100);
    expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it("should be able to read with mode", async () => {
    pipe = createNamedPipe("mode", 0o640);
    const sender = pipe.createSender();
    const receiver = pipe.createReceiver();

    const callback = jest.fn();
    receiver.on("data", callback);

    await sender.connect();
    await receiver.connect();

    await new Promise<void>((resolve, reject) => {
      sender.once("connected", () => {
        sender.write("test", (err) => {
          if (err) {
            return reject(err);
          }

          resolve();
        });
      });
    });

    await sender.destroy();
    await delay(100);
    expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it("should be able to read from readable", async () => {
    pipe = createNamedPipe();
    const sender = pipe.createSender();
    const receiver = pipe.createReceiver();

    const callback = jest.fn();
    await sender.connect();
    await receiver.connect();

    await new Promise<void>((resolve, reject) => {
      sender.once("connected", () => {
        receiver.getReadableStream().on("data", callback);
        sender.write("hello", () => {
          sender.write("world", (err) => {
            if (err) {
              return reject(err);
            }

            resolve();
          });
        });
      });
    });

    await sender.destroy();
    await delay(100);
    expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it("should be able to read with absolute path", async () => {
    dir =
      process.platform === "win32"
        ? "test"
        : mkdtempSync(join(tmpdir(), "named-pipe-test-"));
    pipe = createNamedPipe(join(dir, "sock"));

    const callback = jest.fn();
    const sender = pipe.createSender();
    const receiver = pipe.createReceiver();
    receiver.on("data", callback);

    await sender.connect();
    await receiver.connect();

    await new Promise<void>((resolve, reject) => {
      sender.once("connected", () => {
        sender.write("test", (err) => {
          if (err) {
            return reject(err);
          }

          resolve();
        });
      });
    });

    await sender.destroy();
    await delay(100);
    expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
  });

  it("should handle multiple pipes without blocking", async () => {
    await Promise.all(
      new Array(15).fill(0).map(async (_, i) => {
        const pipe = createNamedPipe(`multi-${i}`);
        const sender = pipe.createSender();
        const receiver = pipe.createReceiver();

        const callback = jest.fn();
        receiver.on("data", callback);

        await sender.connect();
        await receiver.connect();

        await new Promise<void>((resolve, reject) => {
          sender.once("connected", () => {
            sender.write("hello");
            sender.write("world", (err) => {
              if (err) {
                return reject(err);
              }

              resolve();
            });
          });
        });

        await sender.destroy();
        await pipe.destroy();
        await delay(100);
        expect(callback).toHaveBeenCalledWith(expect.any(Buffer));
      })
    );
  });
});
