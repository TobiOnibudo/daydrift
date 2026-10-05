import { vi } from 'vitest';

type Listener = (event: MessageEvent<string>) => void;

/** A controllable stand-in for the browser EventSource, driven by tests via `emit`. */
export class MockEventSource {
  static instances: MockEventSource[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly url: string;
  readonly withCredentials: boolean;
  readyState = MockEventSource.OPEN;
  onerror: (() => void) | null = null;
  closed = false;
  private listeners = new Map<string, Listener[]>();

  constructor(url: string, init?: { withCredentials?: boolean }) {
    this.url = url;
    this.withCredentials = init?.withCredentials ?? false;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close() {
    this.closed = true;
    this.readyState = MockEventSource.CLOSED;
  }

  /** Deliver a server event with a JSON payload, as the API does. */
  emit(type: string, data: unknown) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data: JSON.stringify(data) } as MessageEvent<string>);
    }
  }

  /** Simulate the connection failing. */
  fail(readyState: number) {
    this.readyState = readyState;
    this.onerror?.();
  }

  static install() {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
  }

  static get last(): MockEventSource {
    const source = MockEventSource.instances.at(-1);
    if (!source) throw new Error('No EventSource was opened');
    return source;
  }
}
