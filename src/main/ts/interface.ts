export type TPackageRef = {
  name: string
  version: string
  registry: string
}

export type TRepoRef = {
  type: string
  url: string
  hash?: string
}

export type TSourcemap = {
  version: string
  sources: string[]
  sourcesContent: string[]
  mappings: string,
  names: string[]
}

export type TPackument = {
  name: string
  version: string
}

export type TOptions = {
  name: string,
  version: string
  registry?: string
}

export type TRawAttestation = {
  predicateType: string
  bundle: {
    mediaType: string
    verificationMaterial: any
    dsseEnvelope: {
      payload: string
      payloadType: string
      signatures: Array<{
        sig: string
        keyid: string
      }>
    }
  }
  [index: string]: any
}

export type TAttestation = {
  context: any
  raw: TRawAttestation
}


export type TTrack = {
  coherence: null | number
  refs: string[]
  checks?: Record<string, any>
  // verifications: TVerification[]
}

export type TSearchContext = {
  name: string
  targets: Record<string, string>
  sources: Record<string, string>
  root: string
}

export type TDigest = {
  tracks: Record<string, Record<string, TTrack | null>>
  meta: {
    pkgRef: TPackageRef
    repoRef: TRepoRef
  }
}
