/// <reference types="vite/client" />

// `?inline` CSS imports resolve to the compiled stylesheet as a string. We adopt
// it into the overlay's shadow root (see src/content/index.ts).
declare module '*.css?inline' {
  const css: string
  export default css
}
