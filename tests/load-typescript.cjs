const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
// Run the real TS modules with native/network boundaries replaced. No emulator required.
function loader(mocks = {}) {
  const cache = new Map();
  function load(relative) {
    const file = path.resolve(__dirname, '..', relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const requireModule = (name) => {
      if (name in mocks) return mocks[name];
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.resolve(__dirname, '..', name.slice(2)) : path.resolve(path.dirname(file), name);
        const target = ['.ts', '.tsx', '/index.ts'].map(ext => base + ext).find(fs.existsSync);
        if (!target) throw new Error('Unmocked module ' + name);
        return load(path.relative(path.resolve(__dirname, '..'), target));
      }
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(requireModule, module, module.exports);
    return module.exports;
  }
  return load;
}
module.exports = { loader };
