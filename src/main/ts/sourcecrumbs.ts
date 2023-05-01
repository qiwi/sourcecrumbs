import {Readable} from 'node:stream'
import {ReadableStream} from 'node:stream/web'
import cp from 'node:child_process'
import tar from 'tar'
import fs from 'fs-extra'
import path from 'node:path'
import smv from 'sourcemap-validator'
import {globby} from 'globby'
import {temporaryDirectory} from 'tempy'

export type TVerifyOptions = {
  name: string,
  version: string
  registry?: string
}

export const verifyPkg = async ({
  name,
  version,
  registry
}: TVerifyOptions) => {
  const cwd = await fetchPkg({name, version, registry})
  const files = await getPackageFiles(cwd)
  const results = await verifyFiles(files)

  return files.reduce<Record<string, any>>((m, file, i) => {
    m[path.relative(cwd, file)] = results[i]
    return m
  }, {})
}

export const getManifestUrl = (registry: string, name: string, version: string) => `${registry}/${name}/${version}`

export const getTarballUrl = (registry: string, name: string, version: string) => `${registry}/${name}/-/${name.replace(/^.+(%2f|\/)/, '')}-${version}.tgz`

export const fetchCommit = async ({repo, commit, cwd = temporaryDirectory()}: {repo: string, commit: string, cwd?: string}) =>
  new Promise((resolve, reject) => {
    const child = cp.spawn('git', [`fetch --depth=1 ${repo} ${commit}`], {
      cwd
    })

    child.on('error', reject)
    child.on('close', () => resolve(cwd))
  })



export const fetchPkg = async ({
  name,
  version,
  registry = 'https://registry.npmjs.org',
  cwd = temporaryDirectory()
}: any): Promise<string> => {
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

  return cwd
}

export const validateSourcemap = (minifiedCode: string, sourceMap?: string | null): boolean => {
  if (!sourceMap) {
    return false
  }
  try {
    smv(minifiedCode, sourceMap)
    return true
  } catch (e) {
    console.error(e)
  }

  return false
}

export const verifyFiles = async (files: string[]) =>
  Promise.all(files.map(async (file) => {
    const contents = await fs.readFile(file, 'utf8')
    const mapFile = `${file}.map`
    const mapContents = await fs.exists(mapFile) ? await fs.readFile(mapFile, 'utf8') : null

    return {
      sourcemap: validateSourcemap(contents, mapContents)
    }
  }))

export const getPackageFiles = (cwd: string) => globby(['**/*'],{cwd, onlyFiles: true, absolute: true})

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