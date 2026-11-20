# stream-json compatibility entry points

Legacy CommonJS paths used by Detox 20 and bunyamin delegate to official patched stream-json 3.9.0 (installed as stream-json-fixed). No legacy parser, filter or assembler implementation is retained. The adapters only preserve make/withParser entry points and Node stream output. Supported legacy paths are explicitly exported; unrelated legacy paths fail rather than silently load vulnerable code. Requires Node with synchronous require(ESM), as provided by the Expo-supported Node 20.19.4+ and the tested Node 22 runtime.
