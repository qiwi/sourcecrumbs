# sourcecrumbs
> Make npm provenance attestation a bit more code bound

## Concept
> [The provenance attestation](https://docs.npmjs.com/generating-provenance-statements) is established by publicly providing a link to a package's source code and build instructions from the build environment. This allows developers to verify where and how your package was built before they download it.

_This allows_, so let's try to implement a working draft. Suppose we have published a package with [sourcemaps](https://sourcemaps.info/spec.html) and provenance telemetry in its [packument](https://github.com/npm/registry/blob/master/docs/responses/package-metadata.md).
We could try:
* match sourcemap data with the referenced git hosted sources via [sourcemap-validator](https://www.npmjs.com/package/sourcemap-validator)
* verify that pkg target (bundle, dist, whatever) corresponds its sources somehow. Hmm... This may require heuristics, unminification, AST comparison or something like that.

## Refs
* https://github.blog/2023-04-19-introducing-npm-package-provenance/
* https://docs.npmjs.com/generating-provenance-statements
* https://slsa.dev/provenance/v0.2
* https://www.mattzeunert.com/2016/02/14/how-do-source-maps-work.html
* https://blog.sentry.io/2018/10/18/4-reasons-why-your-source-maps-are-broken/
* https://stackoverflow.com/questions/44527036/how-can-i-check-source-map-transpiled-javascript-consistency
* https://stackoverflow.com/questions/72263693/how-can-i-assert-minified-javascript-is-equivalent-to-source
* https://sourcemaps.info/spec.html

## Licence
[MIT](./LICENSE)
