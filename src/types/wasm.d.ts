declare module '*.wasm' {
  const wasm: WebAssembly.Module
  export default wasm
}

declare module '*.ttf' {
  const data: ArrayBuffer
  export default data
}
