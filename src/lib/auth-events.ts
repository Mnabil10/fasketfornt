type AuthEvent = "logout" | "refresh";

type Listener = () => void;

const listeners: Record<AuthEvent, Set<Listener>> = {
  logout: new Set(),
  refresh: new Set(),
};

export function onAuthEvent(event: AuthEvent, listener: Listener) {
  listeners[event].add(listener);
  return () => listeners[event].delete(listener);
}

export function emitAuthEvent(event: AuthEvent) {
  listeners[event].forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("auth event listener error", error);
    }
  });
}
