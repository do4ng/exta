export interface BaseConfig {
  compileOptions?: CompileOptions;
}

export interface CompileOptions {
  /** @default {true} */
  ignoreSideEffects?: boolean;
  preserveSideEffects?: string[];
  outdir?: string;
}
