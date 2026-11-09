if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrix {}
  // @ts-ignore
  globalThis.DOMMatrix = DOMMatrix;
}
