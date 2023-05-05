import cp from 'node:child_process'
import path from 'node:path'
import {Readable} from 'node:stream'
import {ReadableStream} from 'node:stream/web'
import tar from 'tar'
import fs from 'fs-extra'
import smv from 'sourcemap-validator'
import {globby} from 'globby'
import {temporaryDirectory} from 'tempy'
import parseUrl from 'parse-url'

export type TPackument = {
  name: string
  version: string
}

export type TVerifyOptions = {
  name: string,
  version: string
  registry?: string
}

type TRawAttestation = {
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

type TAttestation = {
  context: any
  raw: TRawAttestation
}

export type TRepository = {
  type: string
  url: string
  hash?: string
}

export type TVerifyDigest = {
  attestations: {
    publish?: TAttestation
    provenance?: TAttestation
  }
  repository: TRepository
  contents: Record<string, any>
}

const normalizeRepoUrl = (url: string) => {
  const opts = parseUrl(url)
  return `git@${opts.resource}:${opts.pathname.slice(1)}`
}

export const verifyPkg = async ({
                                  name,
                                  version,
                                  registry = 'https://registry.npmjs.org'
                                }: TVerifyOptions) => {
  const packument = await fetchPackument({name, version, registry})
  const repository: TRepository = {...packument.repository, hash: packument.gitHead}
  const targets = await fetchPkg({name, version, registry})
  const sources = await fetchSources(repository)
  const attestations = await getAttestation({name, version, registry})
  const entries = verifyFiles(targets, sources)
  // const results = await verifyFiles(files)

  return {
    entries
  }

  // const contents = files.reduce<Record<string, any>>((m, file, i) => {
  //   m[path.relative(pkgDir, file)] = results[i]
  //   return m
  // }, {})

  // return {
  //   repository,
  //   attestations,
  //   contents,
  //   packument
  // }
}

const extractPayload = (v: string): any => JSON.parse(Buffer.from(v, 'base64').toString('utf8'))

export const getAttestation = async ({name, version, registry}: any) => {
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

export const fetchSources = async ({url, hash = 'HEAD'}: TRepository) => {
  const cwd = await fetchCommit({repo: normalizeRepoUrl(url), commit: hash})
  return getFiles(cwd)
}

export const getPackumentUrl = (registry: string, name: string, version: string) => `${registry}/${name}/${version}`

export const getTarballUrl = (registry: string, name: string, version: string) => `${registry}/${name}/-/${name.replace(/^.+(%2f|\/)/, '')}-${version}.tgz`

export const fetchAttestation = async ({name, registry, version}: any) =>
  (await fetch(`${registry}/-/npm/v1/attestations/${name}@${version}`)).json()

export const fetchPackument = async ({name, version, registry}: any) =>
  (await fetch(getPackumentUrl(registry, name, version))).json()

export const fetchCommit = async ({repo, commit, cwd = temporaryDirectory()}: {
  repo: string,
  commit: string,
  cwd?: string
}): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = cp.spawn(`git clone -n --depth=1 ${repo} ${cwd} && git checkout ${commit}`, {
      cwd,
      shell: true,
      // stdio: 'inherit'
    })
    child.on('error', reject)
    child.on('close', () => resolve(cwd))
  })

export const fetchPkg = async ({
                                 name,
                                 version,
                                 registry = 'https://registry.npmjs.org',
                                 cwd = temporaryDirectory()
                               }: any) => {
  const id = `${name}@${version}`

  try {
    const tarballUrl = getTarballUrl(registry, name, version)
    const file = path.resolve(cwd, 'package.tgz')

    await fetch(tarballUrl)
      .then(({body}) =>
        new Promise((resolve, reject) => {
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
    console.error(`fetching '${id}' failed`)
    throw e
  }

  return getFiles(cwd)
}

export const validateSourcemap = (minifiedCode: string, sourceMap?: string | null, sources?: Record<string, string>): boolean => {
  if (!sourceMap) {
    return false
  }
  try {
    smv(minifiedCode, sourceMap, sources)
    return true
  } catch (e) {
    console.error(e)
  }

  return false
}

export const verifyFiles = (targets: Record<string, string>, sources?: Record<string, string>) => {
  const findMatch = (contents: string, file: string, sources: Record<string, string> = {}) =>
    sources[file] === contents ? file : Object.keys(sources).find(key => sources[key] === contents) || null

  // const sources

  return Object.entries(targets).reduce((m, [file, contents]) => {
    const sm = targets[`${file}.map`]
    const smdata = sm ? JSON.parse(sm) : null
    const match = findMatch(contents, file, sources || {})

    m[file] = {
      match,
      sourcemap: sm ? {
        sources: smdata,
        valid: validateSourcemap(contents, targets[`${file}.map`], sources)
      } : null
    }

    return m
  },
  {} as Record<string, any>)
}

export const getFiles = async (cwd: string, absolute = false) => {
  const files = await globby(['**/*'], {cwd, onlyFiles: true, absolute})
  const contents = await Promise.all(files.map((file) => fs.readFile(path.join(cwd, file), 'utf8')))

  return files.reduce<Record<string, string>>((m, file, i) => {
    m[file] = contents[i]
    return m
  }, {})
}

export const getPackageFiles = (cwd: string) => globby(['**/*'], {cwd, onlyFiles: true, absolute: true})

// https://nodejs.org/api/packages.html
// https://webpack.js.org/guides/package-exports/
type Entry = string | string[] | Record<string, string | string[] | Record<string, string | string[]>>

export const getExportsEntries = (exports: string | Entry): [string, string[]][] => {
  const entries: [string, Entry][] = Object.entries(exports)
  const parseConditional = (e: Entry): string[] => typeof e === 'string' ? [e] : Object.values(e).map(parseConditional).flat(2)

  // has subpaths
  if (typeof exports !== 'string' && Object.keys(exports).some((k) => k.startsWith('.'))) {
    return entries.map(([k, v]) => [k, parseConditional(v)])
  }

  return [['.', parseConditional(exports)]]
}
