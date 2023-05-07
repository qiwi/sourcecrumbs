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

export type TVerifyOptions = {
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

export type TVerification = {
  type: string
  reliability: number
}

export type TFileEntry = {
  sources: Record<string, string>
  // verifications: TVerification[]
}

export type TVerifyDigest = {
  // attestations: {
  //   publish?: TAttestation
  //   provenance?: TAttestation
  // }
  // repository: TRepository
  // contents: Record<string, any>
  entries: Record<string, TFileEntry>
}
