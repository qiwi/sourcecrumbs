import {TSourcemap} from "./interface";

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
