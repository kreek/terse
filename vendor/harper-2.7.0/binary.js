import { BinaryModuleImpl } from "./BinaryModule-Aj1vLnwf.js";
const binaryUrl = "" + new URL("harper_wasm_bg.wasm", import.meta.url).href;
const binary = /* @__PURE__ */ BinaryModuleImpl.create(binaryUrl, "full");
export {
  binary
};
