import { createNamedPipe } from '../src';

describe('NamedPipe', () => {
  it('should be able to create a pipe without a name', () => {
    const pipe = createNamedPipe();
    expect(pipe.path).toBeDefined();
  });

  it('should be able to create a pipe with a name', () => {
    const name = 'test';
    const pipe = createNamedPipe(name);
    expect(pipe.path).toContain(name);
  });

  it('should allow absolute paths', () => {
    const path = '/tmp/test';
    const pipe = createNamedPipe(path);
    expect(pipe.path).toContain(path);
  });
});
