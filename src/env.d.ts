/// <reference types="vite/client" />

declare module '*?worker' {
  const WorkerConstructor: {
    new (): Worker
  }
  export default WorkerConstructor
}

declare module '*?worker&url' {
  const workerUrl: string
  export default workerUrl
}
