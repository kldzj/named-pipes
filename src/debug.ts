import Debug from 'debug';

export function getDebugLogger(name: string) {
  return Debug(`named-pipe:${name}`);
}

export type Debugger = Debug.Debugger;
