import createDebugger from "@kldzj/debug";

const debug = createDebugger("named-pipe");

export function getDebugLogger(name: string) {
  return debug.createChild(name).createFunction();
}

export type Debugger = typeof debug.debug;
