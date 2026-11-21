/* Regression checks for the consumers affected by security dependency updates. */
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

async function collect(stream, input) {
  stream.end(input);
  const values = [];
  for await (const value of stream) values.push(value);
  return values;
}

async function main() {
  const query = require('query-string');
  assert.deepEqual(
    { ...query.parse('fieldId=42&name=Tom%C3%A0quet&next=%2Fapp%2Fcrops') },
    { fieldId: '42', name: 'Tomàquet', next: '/app/crops' },
  );
  assert.deepEqual(
    query.parse('crop[]=tomato&crop[]=lettuce', { arrayFormat: 'bracket' })
      .crop,
    ['tomato', 'lettuce'],
  );
  assert.equal(
    query.parseUrl('/crop-detail?id=42&unit=m%C2%B2').url,
    '/crop-detail',
  );
  assert.equal(query.parse('unit=m%C2%B2').unit, 'm²');
  const decode = require('decode-uri-component');
  assert.equal(decode('%F0%9F%8C%B1'), '🌱');
  assert.equal(decode('%zz'), '%zz');
  assert.equal(decode('%41x%42y%zz'), 'AxBy%zz');
  assert.throws(() => decode(null), TypeError);

  const cliRequire = createRequire(require.resolve('expo/package.json'));
  const cliPath = cliRequire.resolve('@expo/cli/package.json');
  const cliRoot = path.dirname(cliPath);
  const { PluginSchema, DevToolsPluginOutputSchema } = require(
    path.join(cliRoot, 'build/src/start/server/DevToolsPlugin.schema.js'),
  );
  const plugin = {
    packageName: 'local-demo',
    packageRoot: '/local-demo',
    cliExtensions: {
      description: 'Local fixture',
      entryPoint: 'index.js',
      commands: [
        {
          name: 'inspect',
          title: 'Inspect',
          environments: ['cli', 'mcp'],
          parameters: [{ name: 'field', type: 'number' }],
        },
      ],
    },
  };
  assert.equal(PluginSchema.safeParse(plugin).success, true);
  assert.equal(
    PluginSchema.safeParse({ ...plugin, packageName: '' }).success,
    false,
  );
  assert.equal(
    DevToolsPluginOutputSchema.safeParse([
      { type: 'text', text: 'ok', level: 'info' },
    ]).success,
    true,
  );
  const { createMCPDevToolsExtensionSchema } = require(
    path.join(
      cliRoot,
      'build/src/start/server/createMCPDevToolsExtensionSchema.js',
    ),
  );
  const schema = createMCPDevToolsExtensionSchema(plugin);
  assert.equal(
    schema.safeParse({ command: 'inspect', field: 42 }).success,
    true,
  );
  assert.equal(
    schema.safeParse({ command: 'inspect', extra: true }).success,
    false,
  );

  const JsonlParser = require('stream-json/jsonl/Parser');
  assert.deepEqual(
    await collect(
      JsonlParser.make({ checkErrors: true }),
      '{"level":30,"msg":"ready"}\n{"level":40,"msg":"warning"}\n',
    ),
    [
      { key: 0, value: { level: 30, msg: 'ready' } },
      { key: 1, value: { level: 40, msg: 'warning' } },
    ],
  );
  const StreamArray = require('stream-json/streamers/StreamArray.js');
  assert.deepEqual(
    await collect(
      StreamArray.withParser(),
      '[{"name":"garden"},{"name":"crop"}]',
    ),
    [
      { key: 0, value: { name: 'garden' } },
      { key: 1, value: { name: 'crop' } },
    ],
  );
  const DetoxJSONLParser = require('detox/src/logger/utils/streams/DetoxJSONLParser');
  const detox = new DetoxJSONLParser({ debug() {} }).createTransformer();
  const detoxRecords = (async () => {
    const records = [];
    for await (const item of detox.readable) records.push(item);
    return records;
  })();
  detox.writable.end('{"msg":"detox-ready"}\n');
  assert.deepEqual(await detoxRecords, [
    { key: 0, value: { msg: 'detox-ready' } },
  ]);
  // Constructing the actual logger and environment verifies legacy import paths.
  assert.equal(typeof require('bunyamin'), 'object');
  assert.ok(require('jest-environment-emit'));
  const safe = await collect(
    StreamArray.withParser(),
    '[{"__proto__":{"securityFixture":true},"name":"garden"}]',
  );
  assert.equal({}.securityFixture, undefined);
  assert.equal(Object.hasOwn(safe[0].value, '__proto__'), true);

  const fixture = mkdtempSync(
    path.join(tmpdir(), 'agritwin-security-dependencies-'),
  );
  try {
    writeFileSync(path.join(fixture, 'garden.txt'), 'dummy');
    writeFileSync(path.join(fixture, 'crop.json'), '{}');
    const configRequire = createRequire(
      require.resolve('@expo/config-plugins'),
    );
    const glob = configRequire('glob');
    assert.deepEqual(glob.globSync('*.txt', { cwd: fixture }), ['garden.txt']);
    assert.deepEqual(await glob.glob('*.txt', { cwd: fixture }), [
      'garden.txt',
    ]);
    const controller = new AbortController();
    controller.abort(new Error('fixture cancelled'));
    await assert.rejects(
      glob.glob('**/*', { cwd: fixture, signal: controller.signal }),
      /fixture cancelled/,
    );
    const fingerprintRequire = createRequire(
      require.resolve('@expo/fingerprint'),
    );
    const { Minimatch } = fingerprintRequire('minimatch');
    assert.equal(new Minimatch('**/*.tsx').match('src/app/home.tsx'), true);
    assert.equal(new Minimatch('**/*.tsx').match('src/app/home.json'), false);
    const Ajv = require('ajv');
    const validate = new Ajv().compile({
      type: 'object',
      properties: { count: { type: 'integer' } },
      required: ['count'],
    });
    assert.equal(validate({ count: 2 }), true);
    assert.equal(validate({ count: 'two' }), false);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
  console.log(
    'Security dependency regressions passed: URL decoding, Expo schemas, JSON logs, prototype safety, glob cancellation, ignore patterns and JSON schema validation.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
