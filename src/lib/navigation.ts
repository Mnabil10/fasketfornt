import type { NavigateOptions } from "react-router-dom";

type Navigator = (path: string, options?: NavigateOptions) => void;

let navigator: Navigator | null = null;

export function registerNavigator(fn: Navigator) {
  navigator = fn;
}

export function navigateTo(path: string, options?: NavigateOptions) {
  if (navigator) {
    navigator(path, options);
    return;
  }
  // Fallback for very early calls before registration
  if (options?.replace) {
    window.history.replaceState({}, "", path);
  } else {
    window.history.pushState({}, "", path);
  }
}
