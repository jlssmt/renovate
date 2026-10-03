# Renovate PGP

Renovate PGP library to decrypt pgp encrypted secrets.
It uses [Bouncy Castle](https://www.bouncycastle.org/) under the hood.

## Benchmarks

Benchmarks are computed on our workflow [job](.github/workflows/build.yml#L165) using [Vitest Benchmarking](https://vitest.dev/guide/features.html#benchmarking).

```plain
 ✓ test/test.bench.ts > decrypt 52644ms
     name              hz       min       max      mean       p75       p99      p995      p999     rme  samples
   · js-java       0.4580  2,176.53  2,192.50  2,183.49  2,187.23  2,192.50  2,192.50  2,192.50  ±0.17%       10
   · wasm-java    11.6627   83.2641   90.6778   85.7431   87.0643   90.6778   90.6778   90.6778  ±2.37%       10
   · wasm-dotnet   3.5100    281.38    294.01    284.90    285.21    294.01    294.01    294.01  ±0.95%       10
   · kbpgp         5.3614    184.19    191.10    186.52    186.57    191.10    191.10    191.10  ±0.91%       10
   · openpgp       136.11    7.0226    9.5628    7.3471    7.2888    9.5628    9.5628    9.5628  ±1.63%       69

 BENCH  Summary

  openpgp - test/test.bench.ts > decrypt
    11.67x faster than wasm-java
    25.39x faster than kbpgp
    38.78x faster than wasm-dotnet
    297.19x faster than js-java
```
