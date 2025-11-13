declare module 'umap-js' {
  export interface UMAPOptions {
    nComponents?: number
    nNeighbors?: number
    minDist?: number
    spread?: number
    localConnectivity?: number
    setOpMixRatio?: number
    random?: () => number
  }

  export class UMAP {
    constructor(options?: UMAPOptions)
    fit(data: number[][]): number[][]
    fitAsync(data: number[][], epochCallback?: (epoch: number) => void): Promise<number[][]>
  }

  export default UMAP
}
