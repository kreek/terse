# Harper 2.7.0 vendored runtime

Terse vendors the minimum `harper.js` runtime needed for offline grammar
checks. The files came from the published `harper.js@2.7.0` npm package:

- package: `https://registry.npmjs.org/harper.js/-/harper.js-2.7.0.tgz`
- npm integrity: `sha512-INDnUMNJvQzv5Zv9lhgGuIRYNIpDvOXcieCbo5ED/dwn8V/02zVW5kKvU6jSJJHq1MpY0VDyg+5RjE7z5D+FeA==`
- upstream: `https://github.com/Automattic/harper`
- license: Apache-2.0, reproduced in `LICENSE`

SHA-256 checksums:

```text
8332e02000e07fa6625765c3f3de6d75787181586fd6d4a607b1d263af42e926  index.js
6c408881cf9d54a32bf7a732b63e0b190132d32b250c34dc8128d50f5174dda0  binary.js
e7d39bb29884349a0f629813f9b317d631edb7963fda2d9c9ac5b9c8a2e8829c  BinaryModule-Aj1vLnwf.js
116210e8c7ceaa8c7834145179ed09885c9d3a3cad83c1f6174c00d5da7970f2  harper_wasm_bg.wasm
516659b5ebca507444fa0fc6ed97a01863ce081c2a04771c6f0cd7befcef1008  LICENSE
```

Do not update one file in isolation. Replace the runtime from one published
package, update every checksum, and rerun the grammar admission suite.
