import path from 'node:path'
import smv from 'sourcemap-validator'
import {TSourcemap} from './interface'

export const verifyFiles = ({name, targets, sources = {}}: {name: string, targets: Record<string, string>, sources?: Record<string, string>}) => {
  // Git repository may contain several packages codebases (monorepo), so we need to resolve the root at first
  const root = findPkgRoot({name, sources})

  return Object.entries(targets).reduce((m, [name, contents]) => {
    m[name] = {
      source: findSource({name, sources, contents}),
      sourcemap: findSourcemap({name, sources, targets, root})
    }

    return m
  },
  {} as Record<string, any>)
}


export const findPkgRoot = ({sources, name, cwd = '.'}: {sources: Record<string, string>, name: string, cwd?: string}): string =>
  path.dirname(Object.keys(sources).find((source) => source.endsWith('/package.json') && sources[source].includes(`"name": "${name}"`)) || path.join(cwd, 'package.json'))

export const findSourcemap = ({name, targets, sources, root}: {
  name: string
  sources: Record<string, string>
  targets: Record<string, string>
  root: string
}): {
  sources: string[]
  valid: boolean
  coherence: number | null
} | null => {
  const sm = targets[`${name}.map`]
  if (!sm) {
    return null
  }
  const contents = targets[name]
  const sourcemap: TSourcemap = JSON.parse(sm)

  sourcemap.sources = sourcemap.sources.map(src => path.join(root, path.join('/', src)))

  return {
    sources: sourcemap.sources,
    valid: validateSourcemap(contents, sm, sources),
    coherence: getCoherence({name, contents, sourcemap, sources})
  }
}

export const findSource = ({
  name,
  contents,
  sources
}: {contents: string, name: string, sources: Record<string, string>}) => {
  // TODO add smth like git diff
  // https://stackoverflow.com/questions/11561498/how-to-compare-two-files-not-in-repo-using-git

  const found = sources[name] === contents ? name : Object.keys(sources).find(key => sources[key] === contents)
  if (!found) {
    return null
  }

  return {
    sources: [found],
    coherence: 100
  }
}

export const getCoherence = ({
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
