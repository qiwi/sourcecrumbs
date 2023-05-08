import smv from 'sourcemap-validator'
import {TSourcemap} from './interface'

export const verifyFiles = (targets: Record<string, string>, sources: Record<string, string> = {}) =>
  Object.entries(targets).reduce((m, [name, contents]) => {
    m[name] = {
      source: findSource({name, sources, contents}),
      sourcemap: findSourcemap({name, sources, targets})
    }

    return m
  },
  {} as Record<string, any>)


export const findSourcemap = ({name, targets, sources}: {
  name: string
  sources: Record<string, string>
  targets: Record<string, string>
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

  return {
    sources: sourcemap?.sources,
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
