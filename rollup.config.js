import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { dts } from "rollup-plugin-dts";

const external = ["crypto", "jose", "axios", "tweetnacl", "bs58", "tweetnacl-util", "ed2curve", "@bufbuild/protobuf"];

export default [
  // ESM build
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.js",
      format: "esm",
      sourcemap: true,
    },
    external,
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        sourceMap: true,
      }),
    ],
  },
  // CommonJS build
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.cjs",
      format: "cjs",
      sourcemap: true,
      exports: "named",
      interop: "auto",
    },
    external,
    plugins: [
      resolve({
        preferBuiltins: true,
      }),
      commonjs({
        transformMixedEsModules: true,
        requireReturnsDefault: "auto",
      }),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        sourceMap: true,
      }),
    ],
  },
  // Types
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.d.ts",
      format: "esm",
    },
    plugins: [dts()],
  },
];
