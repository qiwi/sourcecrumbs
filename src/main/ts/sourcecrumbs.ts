import cp from 'node:child_process'
import path from 'node:path'
import {Readable} from 'node:stream'
import {ReadableStream} from 'node:stream/web'
import tar from 'tar'
import fs from 'fs-extra'
import {globby} from 'globby'
import {temporaryDirectory} from 'tempy'
import parseUrl from 'parse-url'

import {
  TVerifyOptions,
  TPackageRef,
  TRepoRef,
  TAttestation,
  TRawAttestation
} from './interface'
import { verifyFiles } from './verify'

export const verifyPkg = async ({
    name,
    version,
    registry = 'https://registry.npmjs.org'
  }: TVerifyOptions) => {
  const pkgRef = { name, version, registry }
  const [packument, targets, attestations] = await Promise.all([
    fetchPackument(pkgRef),
    fetchPkg(pkgRef),
    getAttestation(pkgRef)
  ])
  const hash = attestations?.provenance?.context?.predicate.invocation.configSource.digest.sha1 || packument.gitHead
  const repoRef: TRepoRef = {...packument.repository, hash}
  const sources = await fetchSources(repoRef)
  const entries = verifyFiles({name, targets, sources})

  return {
    entries,
    meta: {
      repoRef,
      pkgRef
    }
  }
}

export const extractPayload = <D = any>(v: string): D => JSON.parse(Buffer.from(v, 'base64').toString('utf8'))

export const getAttestation = async ({name, version, registry}: TPackageRef) => {
  const raw: { attestations: TRawAttestation[] } = await fetchAttestation({name, version, registry})
  const predicateTypesAliasMap: Record<string, string> = {
    'https://slsa.dev/provenance/v0.2': 'provenance',
    'https://github.com/npm/attestation/tree/main/specs/publish/v0.1': 'publish'
  }

  return raw.attestations.reduce((m: Record<string, TAttestation>, v) => {
    m[predicateTypesAliasMap[v.predicateType]] = {
      context: extractPayload(v.bundle.dsseEnvelope.payload),
      raw: v
    }

    return m
  }, {})
}


export const formatRepoUrl = (rawRepositoryUrl: string) => {
  const urlOpts = parseUrl(rawRepositoryUrl)
  return `git@${urlOpts.resource}:${urlOpts.pathname.slice(1)}`
}

export const formatAttestationUrl = ({registry, name, version}: TPackageRef) => `${registry}/-/npm/v1/attestations/${name}@${version}`

export const formatPackumentUrl = ({registry, name, version}: TPackageRef) => `${registry}/${name}/${version}`

export const formatTarballUrl = ({registry, name, version}: TPackageRef) => `${registry}/${name}/-/${name.replace(/^.+(%2f|\/)/, '')}-${version}.tgz`

export const fetchAttestation = async (pkgRef: TPackageRef) => (await fetch(formatAttestationUrl(pkgRef))).json()

export const fetchPackument = async (pkgRef: TPackageRef) => (await fetch(formatPackumentUrl(pkgRef))).json()

export const fetchCommit = async ({repo, commit, cwd = temporaryDirectory()}: {
  repo: string,
  commit: string,
  cwd?: string
}): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = cp.spawn(`git clone -n ${repo} ${cwd} && git checkout ${commit}`, {
      cwd,
      shell: true,
      // stdio: 'inherit' // debug
    })
    child.on('error', reject)
    child.on('close', () => resolve(cwd))
  })

export const fetchPkg = async ({
    name,
    version,
    registry,
    cwd = temporaryDirectory()
  }: TPackageRef & {cwd?: string}) => {
  const id = `${name}@${version}`

  try {
    const tarballUrl = formatTarballUrl({registry, name, version})
    const file = path.resolve(cwd, 'package.tgz')

    await fetch(tarballUrl)
      .then(({body}) => new Promise((resolve, reject) => {
          if (body) {
            // https://stackoverflow.com/questions/74324435/property-pipe-does-not-exist-on-type-readablestreamuint8array
            // https://2ality.com/2022/06/web-streams-nodejs.html#support-for-web-streams-in-node.js
            // https://exploringjs.com/nodejs-shell-scripting/ch_web-streams.html
            const _body = Readable.fromWeb(body as ReadableStream<any>)
            const dest = fs.createWriteStream(file)
            _body.pipe(dest)
            dest.on('close', resolve)
            dest.on('error', reject)
          } else {
            reject('empty package')
          }
      }))

    await tar.x({
      file,
      C: cwd,
      strip: 1,
    })
    await fs.remove(file)

  } catch (e) {
    console.error(`fetching ${id} ${registry} failed`)
    throw e
  }

  return readFiles(cwd)
}

export const fetchSources = async ({url, hash = 'HEAD'}: TRepoRef) => {
  const cwd = await fetchCommit({repo: formatRepoUrl(url), commit: hash})
  return readFiles(cwd)
}

export const readFiles = async (cwd: string, absolute = false) => {
  const files = await globby(['**/*'], {cwd, onlyFiles: true, absolute})
  const contents = await Promise.all(files.map((file) => fs.readFile(path.join(cwd, file), 'utf8')))

  return files.reduce<Record<string, string>>((m, file, i) => {
    m[file] = contents[i]
    return m
  }, Object.defineProperty({}, '__cwd', {value: cwd, enumerable: false}))
}
