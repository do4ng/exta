(function(modules) {
  var __serpack_module_cache__={};
  function __serpack_require__(id){
    if (!id.startsWith("sp:")) return require(id);
    if (__serpack_module_cache__[id.slice(3)]) return __serpack_module_cache__[id.slice(3)];
    const module={exports:{}};
    __serpack_module_cache__[id.slice(3)]="__serpack_module_pending__";
    modules[id.slice(3)].call(module.exports, __serpack_require__, require, module, module.exports);
    __serpack_module_cache__[id.slice(3)]=module.exports;
    return module.exports;
  }
  module.exports=__serpack_require__("sp:0");
})({
/* D:\nudo\scripts\build.ts */ "0": (function(__serpack_require__,__non_serpack_require__,module,exports) { Object.defineProperty(exports, "__esModule", {
  value: !0
});
const e = __serpack_require__("esbuild"), t = __serpack_require__("esbuild-node-externals"), r = __serpack_require__("node:fs"), n = (function (e, t) {
  if (e && e.__esModule) return e;
  if (null === e || "object" != typeof e && "function" != typeof e) return {
    default: e
  };
  var r = c(t);
  if (r && r.has(e)) return r.get(e);
  var n = {
    __proto__: null
  }, o = Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (var i in e) if ("default" !== i && Object.prototype.hasOwnProperty.call(e, i)) {
    var s = o ? Object.getOwnPropertyDescriptor(e, i) : null;
    s && (s.get || s.set) ? Object.defineProperty(n, i, s) : n[i] = e[i];
  }
  return (n.default = e, r && r.set(e, n), n);
})(__serpack_require__("glob")), o = __serpack_require__("node:path"), i = __serpack_require__('sp:1');
function c(e) {
  if ("function" != typeof WeakMap) return null;
  var t = new WeakMap(), r = new WeakMap();
  return (c = function (e) {
    return e ? r : t;
  })(e);
}
const s = n.globSync(['packages/**/*/build.json']), u = !process.argv.includes('--dev');
for (const n of s) {
  console.log(`> ${((0, o.join))(process.cwd(), n)}`);
  let c = JSON.parse(((0, r.readFileSync))(((0, o.join))(process.cwd(), n), 'utf-8')), s = ((0, o.dirname))(n), a = ((0, o.join))(s, 'dist'), l = ((0, o.join))(s, 'types');
  (((0, r.existsSync))(a) && ((0, r.rmSync))(a, {
    recursive: !0,
    force: !0
  }), ((0, r.existsSync))(l) && ((0, r.rmSync))(l, {
    recursive: !0,
    force: !0
  }));
  let p = {
    entryPoints: c.map(e => ((0, o.join))(s, e)),
    logLevel: 'info',
    platform: 'node',
    outbase: ((0, o.join))(s, './src'),
    outdir: ((0, o.join))(s, './dist'),
    metafile: !0,
    external: ['$exta-manifest', '$exta-client', '$exta-router', '$exta-pages'],
    jsx: 'automatic',
    plugins: [((0, t.nodeExternalsPlugin))({
      packagePath: ((0, o.join))(s, 'package.json')
    }), i.esmSplitCodeToCjs]
  };
  (console.log(a), ((0, e.build))((function (e, t) {
    return (t = null != t ? t : {}, Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : (function (e, t) {
      var r = Object.keys(e);
      if (Object.getOwnPropertySymbols) {
        var n = Object.getOwnPropertySymbols(e);
        r.push.apply(r, n);
      }
      return r;
    })(Object(t)).forEach(function (r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
    }), e);
  })((function (e) {
    for (var t = 1; t < arguments.length; t++) {
      var r = null != arguments[t] ? arguments[t] : {}, n = Object.keys(r);
      ("function" == typeof Object.getOwnPropertySymbols && (n = n.concat(Object.getOwnPropertySymbols(r).filter(function (e) {
        return Object.getOwnPropertyDescriptor(r, e).enumerable;
      }))), n.forEach(function (t) {
        var n;
        (n = r[t], (t in e) ? Object.defineProperty(e, t, {
          value: n,
          enumerable: !0,
          configurable: !0,
          writable: !0
        }) : e[t] = n);
      }));
    }
    return e;
  })({}, p), {
    format: 'esm',
    bundle: !0,
    chunkNames: 'chunks/[hash]',
    minifySyntax: !0,
    outExtension: {
      '.js': '.mjs'
    },
    define: {
      __DEV__: (!u).toString()
    }
  })));
}
 }),
/* D:\nudo\scripts\splitting.ts */ "1": (function(__serpack_require__,__non_serpack_require__,module,exports) { var e;
(Object.defineProperty(exports, "__esModule", {
  value: !0
}), Object.defineProperty(exports, "esmSplitCodeToCjs", {
  enumerable: !0,
  get: function () {
    return o;
  }
}));
const t = (e = __serpack_require__("esbuild")) && e.__esModule ? e : {
  default: e
};
function n(e, t, n, o, r, i, u) {
  try {
    var s = e[i](u), l = s.value;
  } catch (e) {
    n(e);
    return;
  }
  s.done ? t(l) : Promise.resolve(l).then(o, r);
}
const o = {
  name: 'esmSplitCodeToCjs',
  setup(e) {
    e.onEnd(o => {
      var r;
      return ((r = function* () {
        var n, r;
        let i = Object.keys(null != (r = null == (n = o.metafile) ? void 0 : n.outputs) ? r : {}).filter(e => e.endsWith('mjs') || e.endsWith('js'));
        yield t.default.build({
          outdir: e.initialOptions.outdir,
          entryPoints: i,
          allowOverwrite: !0,
          format: 'cjs',
          logLevel: 'info',
          outExtension: {
            '.js': '.js'
          }
        });
      }, function () {
        var e = this, t = arguments;
        return new Promise(function (o, i) {
          var u = r.apply(e, t);
          function s(e) {
            n(u, o, i, s, l, "next", e);
          }
          function l(e) {
            n(u, o, i, s, l, "throw", e);
          }
          s(void 0);
        });
      }))();
    });
  }
};
 }),
});