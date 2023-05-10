import path from 'node:path'
import smv from 'sourcemap-validator'
import diff from 'fast-diff'
import {TSourcemap, TTrack, TSearchContext, TDigest} from './interface'

export const findTracks = ({name, targets, sources = {}}: {name: string, targets: Record<string, string>, sources?: Record<string, string>}) => {
  // Git repository may contain several packages codebases (monorepo), so at first we need to resolve the root
  const root = findPkgRoot({name, sources})

  return Object.keys(targets).reduce((m, name) => {
    const ctx: TSearchContext = {name, sources, targets, root}
    m[name] = {
      source: findSource(ctx),
      sourcemap: findSourcemap(ctx)
    }

    return m
  },
  {} as TDigest['tracks'])
}

export const findPkgRoot = ({sources, name, cwd = '.'}: {sources: Record<string, string>, name: string, cwd?: string}): string =>
  path.dirname(Object.keys(sources).find((source) => source.endsWith('/package.json') && sources[source].includes(`"name": "${name}"`)) || path.join(cwd, 'package.json'))

export const findSourcemap = ({
  name,
  targets,
  sources,
  root
}: TSearchContext): TTrack | null => {
  const sm = targets[`${name}.map`]
  if (!sm) {
    return null
  }
  const contents = targets[name]
  const sourcemap: TSourcemap = JSON.parse(sm)

  sourcemap.sources = sourcemap.sources.map(src => path.join(root, path.join('/', src)))

  return {
    refs: sourcemap.sources,
    coherence: getBundleCoherence({name, contents, sourcemap, sources}),
    checks: {
      valid: validateSourcemap(contents, sm, sources),
    }
  }
}

export const findSource = ({
  name,
  targets,
  sources,
  root
}: TSearchContext): TTrack | null => {
  const contents = targets[name]
  const found = sources[name] === contents ? name : Object.keys(sources).find(key => sources[key] === contents)

  if (found) {
    return {
      refs: [found],
      coherence: 100
    }
  }

  const _name = path.join(root, name)
  const _source = sources[_name]
  if (_source !== undefined) {
    return {
      refs: [_name],
      coherence: getDiffCoherence(contents, _source)
    }
  }

  return null
}

export const getDiffCoherence = (a: string, b: string): number =>
  2 * diff(a, b).reduce((m, [d, value]) => m + (d === 0 ? value.length : 0), 0)
  / (a.length + b.length)

export const getBundleCoherence = ({
  name,
  contents,
  sources,
  sourcemap
}: {
  name: string
  contents: string
  sources: Record<string, string>
  sourcemap: TSourcemap
}): number | null => {
  return null
}

export const validateSourcemap = (contents: string, sourceMap?: string | null, sources?: Record<string, string>): boolean => {
  if (!sourceMap) {
    return false
  }
  try {
    smv(contents, sourceMap, sources)
    return true
  } catch (e) {
    console.error(e)
  }

  return false
}
