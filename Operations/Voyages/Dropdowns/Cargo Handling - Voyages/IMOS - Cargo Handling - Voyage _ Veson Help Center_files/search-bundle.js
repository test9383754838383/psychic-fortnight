var Oc = Object.defineProperty;
var is = (e) => {
  throw TypeError(e);
};
var wc = (e, t, n) => t in e ? Oc(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var ie = (e, t, n) => wc(e, typeof t != "symbol" ? t + "" : t, n), si = (e, t, n) => t.has(e) || is("Cannot " + n);
var Xt = (e, t, n) => (si(e, t, "read from private field"), n ? n.call(e) : t.get(e)), ut = (e, t, n) => t.has(e) ? is("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, n), Qt = (e, t, n, r) => (si(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n), En = (e, t, n) => (si(e, t, "access private method"), n);
import { _ as Fe, p as An, a as mo, O as Sc, k as de, K as ae, x as Z, d as W, A as D, y as z, q, l as os, b as v, R as G, T as U, c as jr, D as ht, $ as ga, g as dn, h as bo, C as ma, E as ze, e as ba, f as Nc, W as oe, r as _a, M as Ii, i as xc, F as ya, j as Ea } from "./compat.module-of3iNHE7.js";
import { g as Oa, c as tr } from "./_commonjsHelpers-DebK9D3O.js";
import { Q as V, c as Ac, d as Tc, e as wa, f as _o, h as Rc, i as Cc, j as Dc, b as yo, k as $c, l as Lc, m as Sa } from "./theme-Bgfzqi6k.js";
import { t as Pe, i as Pc } from "./i18n-DKG4M0Tj.js";
import { i as Tn } from "./index-BQkERkoW.js";
import { g as Eo } from "./get-random-string-CK0Qtika.js";
import { g as Oo } from "./placeholder-Duw3RDID.js";
import Ic from "./purify.es-CRlZ0Imf.js";
import { g as Na, b as wo } from "./i18nInstance-CmPW1jk_.js";
var ai, ss;
function Vc() {
  return ss || (ss = 1, ai = {
    area: !0,
    base: !0,
    br: !0,
    col: !0,
    embed: !0,
    hr: !0,
    img: !0,
    input: !0,
    link: !0,
    meta: !0,
    param: !0,
    source: !0,
    track: !0,
    wbr: !0
  }), ai;
}
var Fc = Vc();
const Mc = /* @__PURE__ */ Oa(Fc);
var jc = /\s([^'"/\s><]+?)[\s/>]|([^\s=]+)=\s?(".*?"|'.*?')/g;
function as(e) {
  var t = { type: "tag", name: "", voidElement: !1, attrs: {}, children: [] }, n = e.match(/<\/?([^\s]+?)[/\s>]/);
  if (n && (t.name = n[1], (Mc[n[1]] || e.charAt(e.length - 2) === "/") && (t.voidElement = !0), t.name.startsWith("!--"))) {
    var r = e.indexOf("-->");
    return { type: "comment", comment: r !== -1 ? e.slice(4, r) : "" };
  }
  for (var i = new RegExp(jc), o = null; (o = i.exec(e)) !== null; ) if (o[0].trim()) if (o[1]) {
    var s = o[1].trim(), a = [s, ""];
    s.indexOf("=") > -1 && (a = s.split("=")), t.attrs[a[0]] = a[1], i.lastIndex--;
  } else o[2] && (t.attrs[o[2]] = o[3].trim().substring(1, o[3].length - 1));
  return t;
}
var kc = /<[a-zA-Z0-9\-\!\/](?:"[^"]*"|'[^']*'|[^'">])*>/g, Bc = /^\s*$/, Uc = /* @__PURE__ */ Object.create(null);
function xa(e, t) {
  switch (t.type) {
    case "text":
      return e + t.content;
    case "tag":
      return e += "<" + t.name + (t.attrs ? function(n) {
        var r = [];
        for (var i in n) r.push(i + '="' + n[i] + '"');
        return r.length ? " " + r.join(" ") : "";
      }(t.attrs) : "") + (t.voidElement ? "/>" : ">"), t.voidElement ? e : e + t.children.reduce(xa, "") + "</" + t.name + ">";
    case "comment":
      return e + "<!--" + t.comment + "-->";
  }
}
var Hc = { parse: function(e, t) {
  t || (t = {}), t.components || (t.components = Uc);
  var n, r = [], i = [], o = -1, s = !1;
  if (e.indexOf("<") !== 0) {
    var a = e.indexOf("<");
    r.push({ type: "text", content: a === -1 ? e : e.substring(0, a) });
  }
  return e.replace(kc, function(l, c) {
    if (s) {
      if (l !== "</" + n.name + ">") return;
      s = !1;
    }
    var u, f = l.charAt(1) !== "/", h = l.startsWith("<!--"), d = c + l.length, p = e.charAt(d);
    if (h) {
      var g = as(l);
      return o < 0 ? (r.push(g), r) : ((u = i[o]).children.push(g), r);
    }
    if (f && (o++, (n = as(l)).type === "tag" && t.components[n.name] && (n.type = "component", s = !0), n.voidElement || s || !p || p === "<" || n.children.push({ type: "text", content: e.slice(d, e.indexOf("<", d)) }), o === 0 && r.push(n), (u = i[o - 1]) && u.children.push(n), i[o] = n), (!f || n.voidElement) && (o > -1 && (n.voidElement || n.name === l.slice(2, -1)) && (o--, n = o === -1 ? r : i[o]), !s && p !== "<" && p)) {
      u = o === -1 ? r : i[o].children;
      var b = e.indexOf("<", d), O = e.slice(d, b === -1 ? void 0 : b);
      Bc.test(O) && (O = " "), (b > -1 && o + u.length >= 0 || O !== " ") && u.push({ type: "text", content: O });
    }
  }), r;
}, stringify: function(e) {
  return e.reduce(function(t, n) {
    return t + xa("", n);
  }, "");
} };
const ur = (e, t, n, r) => {
  var o, s, a, l;
  const i = [n, {
    code: t,
    ...r || {}
  }];
  if ((s = (o = e == null ? void 0 : e.services) == null ? void 0 : o.logger) != null && s.forward)
    return e.services.logger.forward(i, "warn", "react-i18next::", !0);
  ke(i[0]) && (i[0] = `react-i18next:: ${i[0]}`), (l = (a = e == null ? void 0 : e.services) == null ? void 0 : a.logger) != null && l.warn ? e.services.logger.warn(...i) : console != null && console.warn && console.warn(...i);
}, ls = {}, Rn = (e, t, n, r) => {
  ke(n) && ls[n] || (ke(n) && (ls[n] = /* @__PURE__ */ new Date()), ur(e, t, n, r));
}, Aa = (e, t) => () => {
  if (e.isInitialized)
    t();
  else {
    const n = () => {
      setTimeout(() => {
        e.off("initialized", n);
      }, 0), t();
    };
    e.on("initialized", n);
  }
}, Vi = (e, t, n) => {
  e.loadNamespaces(t, Aa(e, n));
}, us = (e, t, n, r) => {
  if (ke(n) && (n = [n]), e.options.preload && e.options.preload.indexOf(t) > -1) return Vi(e, n, r);
  n.forEach((i) => {
    e.options.ns.indexOf(i) < 0 && e.options.ns.push(i);
  }), e.loadLanguages(t, Aa(e, r));
}, Gc = (e, t, n = {}) => !t.languages || !t.languages.length ? (Rn(t, "NO_LANGUAGES", "i18n.languages were undefined or empty", {
  languages: t.languages
}), !0) : t.hasLoadedNamespace(e, {
  lng: n.lng,
  precheck: (r, i) => {
    var o;
    if (((o = n.bindI18n) == null ? void 0 : o.indexOf("languageChanging")) > -1 && r.services.backendConnector.backend && r.isLanguageChangingTo && !i(r.isLanguageChangingTo, e)) return !1;
  }
}), ke = (e) => typeof e == "string", Lt = (e) => typeof e == "object" && e !== null, li = (e, t) => {
  var r;
  if (!e) return !1;
  const n = ((r = e.props) == null ? void 0 : r.children) ?? e.children;
  return t ? n.length > 0 : !!n;
}, ui = (e) => {
  var n, r;
  if (!e) return [];
  const t = ((n = e.props) == null ? void 0 : n.children) ?? e.children;
  return (r = e.props) != null && r.i18nIsDynamicList ? en(t) : t;
}, qc = (e) => Array.isArray(e) && e.every(An), en = (e) => Array.isArray(e) ? e : [e], Wc = (e, t) => {
  const n = {
    ...t
  };
  return n.props = Object.assign(e.props, t.props), n;
}, Ta = (e, t, n, r) => {
  if (!e) return "";
  let i = "";
  const o = en(e), s = t != null && t.transSupportBasicHtmlNodes ? t.transKeepBasicHtmlNodesFor ?? [] : [];
  return o.forEach((a, l) => {
    if (ke(a)) {
      i += `${a}`;
      return;
    }
    if (An(a)) {
      const {
        props: c,
        type: u
      } = a, f = Object.keys(c).length, h = s.indexOf(u) > -1, d = c.children;
      if (!d && h && !f) {
        i += `<${u}/>`;
        return;
      }
      if (!d && (!h || f) || c.i18nIsDynamicList) {
        i += `<${l}></${l}>`;
        return;
      }
      if (h && f === 1 && ke(d)) {
        i += `<${u}>${d}</${u}>`;
        return;
      }
      const p = Ta(d, t, n, r);
      i += `<${l}>${p}</${l}>`;
      return;
    }
    if (a === null) {
      ur(n, "TRANS_NULL_VALUE", "Passed in a null value as child", {
        i18nKey: r
      });
      return;
    }
    if (Lt(a)) {
      const {
        format: c,
        ...u
      } = a, f = Object.keys(u);
      if (f.length === 1) {
        const h = c ? `${f[0]}, ${c}` : f[0];
        i += `{{${h}}}`;
        return;
      }
      ur(n, "TRANS_INVALID_OBJ", "Invalid child - Object should only have keys {{ value, format }} (format is optional).", {
        i18nKey: r,
        child: a
      });
      return;
    }
    ur(n, "TRANS_INVALID_VAR", "Passed in a variable like {number} - pass variables for interpolation as full objects like {{number}}.", {
      i18nKey: r,
      child: a
    });
  }), i;
}, Kc = (e, t, n, r, i, o) => {
  if (t === "") return [];
  const s = r.transKeepBasicHtmlNodesFor || [], a = t && new RegExp(s.map((b) => `<${b}`).join("|")).test(t);
  if (!e && !a && !o) return [t];
  const l = {}, c = (b) => {
    en(b).forEach((_) => {
      ke(_) || (li(_) ? c(ui(_)) : Lt(_) && !An(_) && Object.assign(l, _));
    });
  };
  c(e);
  const u = Hc.parse(`<0>${t}</0>`), f = {
    ...l,
    ...i
  }, h = (b, O, _) => {
    var x;
    const E = ui(b), S = p(E, O.children, _);
    return qc(E) && S.length === 0 || (x = b.props) != null && x.i18nIsDynamicList ? E : S;
  }, d = (b, O, _, E, S) => {
    b.dummy ? (b.children = O, _.push(mo(b, {
      key: E
    }, S ? void 0 : O))) : _.push(...Sc.map([b], (x) => {
      const y = {
        ...x.props
      };
      return delete y.i18nIsDynamicList, Fe(x.type, {
        ...y,
        key: E,
        ref: x.ref
      }, S ? null : O);
    }));
  }, p = (b, O, _) => {
    const E = en(b);
    return en(O).reduce((x, y, R) => {
      var $, L;
      const T = ((L = ($ = y.children) == null ? void 0 : $[0]) == null ? void 0 : L.content) && n.services.interpolator.interpolate(y.children[0].content, f, n.language);
      if (y.type === "tag") {
        let N = E[parseInt(y.name, 10)];
        _.length === 1 && !N && (N = _[0][y.name]), N || (N = {});
        const P = Object.keys(y.attrs).length !== 0 ? Wc({
          props: y.attrs
        }, N) : N, M = An(P), B = M && li(y, !0) && !y.voidElement, Q = a && Lt(P) && P.dummy && !M, X = Lt(e) && Object.hasOwnProperty.call(e, y.name);
        if (ke(P)) {
          const j = n.services.interpolator.interpolate(P, f, n.language);
          x.push(j);
        } else if (li(P) || B) {
          const j = h(P, y, _);
          d(P, j, x, R);
        } else if (Q) {
          const j = p(E, y.children, _);
          d(P, j, x, R);
        } else if (Number.isNaN(parseFloat(y.name)))
          if (X) {
            const j = h(P, y, _);
            d(P, j, x, R, y.voidElement);
          } else if (r.transSupportBasicHtmlNodes && s.indexOf(y.name) > -1)
            if (y.voidElement)
              x.push(Fe(y.name, {
                key: `${y.name}-${R}`
              }));
            else {
              const j = p(E, y.children, _);
              x.push(Fe(y.name, {
                key: `${y.name}-${R}`
              }, j));
            }
          else if (y.voidElement)
            x.push(`<${y.name} />`);
          else {
            const j = p(E, y.children, _);
            x.push(`<${y.name}>${j}</${y.name}>`);
          }
        else if (Lt(P) && !M) {
          const j = y.children[0] ? T : null;
          j && x.push(j);
        } else
          d(P, T, x, R, y.children.length !== 1 || !T);
      } else if (y.type === "text") {
        const N = r.transWrapTextNodes, P = o ? r.unescape(n.services.interpolator.interpolate(y.content, f, n.language)) : n.services.interpolator.interpolate(y.content, f, n.language);
        N ? x.push(Fe(N, {
          key: `${y.name}-${R}`
        }, P)) : x.push(P);
      }
      return x;
    }, []);
  }, g = p([{
    dummy: !0,
    children: e || []
  }], u, en(e || []));
  return ui(g[0]);
}, Ra = (e, t, n) => {
  const r = e.key || t, i = mo(e, {
    key: r
  });
  if (!i.props || !i.props.children || n.indexOf(`${t}/>`) < 0 && n.indexOf(`${t} />`) < 0)
    return i;
  function o() {
    return Fe(de, null, i);
  }
  return Fe(o, {
    key: r
  });
}, zc = (e, t) => e.map((n, r) => Ra(n, r, t)), Yc = (e, t) => {
  const n = {};
  return Object.keys(e).forEach((r) => {
    Object.assign(n, {
      [r]: Ra(e[r], r, t)
    });
  }), n;
}, Xc = (e, t, n, r) => e ? Array.isArray(e) ? zc(e, t) : Lt(e) ? Yc(e, t) : (Rn(n, "TRANS_INVALID_COMPONENTS", '<Trans /> "components" prop expects an object or array', {
  i18nKey: r
}), null) : null;
function Qc({
  children: e,
  count: t,
  parent: n,
  i18nKey: r,
  context: i,
  tOptions: o = {},
  values: s,
  defaults: a,
  components: l,
  ns: c,
  i18n: u,
  t: f,
  shouldUnescape: h,
  ...d
}) {
  var P, M, B, Q, X, j;
  const p = u || wo();
  if (!p)
    return Rn(p, "NO_I18NEXT_INSTANCE", "Trans: You need to pass in an i18next instance using i18nextReactModule", {
      i18nKey: r
    }), e;
  const g = f || p.t.bind(p) || ((k) => k), b = {
    ...Na(),
    ...(P = p.options) == null ? void 0 : P.react
  };
  let O = c || g.ns || ((M = p.options) == null ? void 0 : M.defaultNS);
  O = ke(O) ? [O] : O || ["translation"];
  const _ = Ta(e, b, p, r), E = a || _ || b.transEmptyNodeValue || r, {
    hashTransKey: S
  } = b, x = r || (S ? S(_ || E) : _ || E);
  (Q = (B = p.options) == null ? void 0 : B.interpolation) != null && Q.defaultVariables && (s = s && Object.keys(s).length > 0 ? {
    ...s,
    ...p.options.interpolation.defaultVariables
  } : {
    ...p.options.interpolation.defaultVariables
  });
  const y = s || t !== void 0 && !((j = (X = p.options) == null ? void 0 : X.interpolation) != null && j.alwaysFormat) || !e ? o.interpolation : {
    interpolation: {
      ...o.interpolation,
      prefix: "#$?",
      suffix: "?$#"
    }
  }, R = {
    ...o,
    context: i || o.context,
    count: t,
    ...s,
    ...y,
    defaultValue: E,
    ns: O
  }, T = x ? g(x, R) : E, $ = Xc(l, T, p, r), L = Kc($ || e, T, p, b, R, h), N = n ?? b.defaultTransParent;
  return N ? Fe(N, d, L) : L;
}
const Ca = ae();
class Zc {
  constructor() {
    this.usedNamespaces = {};
  }
  addUsedNamespaces(t) {
    t.forEach((n) => {
      this.usedNamespaces[n] || (this.usedNamespaces[n] = !0);
    });
  }
  getUsedNamespaces() {
    return Object.keys(this.usedNamespaces);
  }
}
function qe({
  children: e,
  count: t,
  parent: n,
  i18nKey: r,
  context: i,
  tOptions: o = {},
  values: s,
  defaults: a,
  components: l,
  ns: c,
  i18n: u,
  t: f,
  shouldUnescape: h,
  ...d
}) {
  var _;
  const {
    i18n: p,
    defaultNS: g
  } = Z(Ca) || {}, b = u || p || wo(), O = f || (b == null ? void 0 : b.t.bind(b));
  return Qc({
    children: e,
    count: t,
    parent: n,
    i18nKey: r,
    context: i,
    tOptions: o,
    values: s,
    defaults: a,
    components: l,
    ns: c || (O == null ? void 0 : O.ns) || g || ((_ = b == null ? void 0 : b.options) == null ? void 0 : _.defaultNS),
    i18n: b,
    t: f,
    shouldUnescape: h,
    ...d
  });
}
const Jc = (e, t) => {
  const n = D();
  return z(() => {
    n.current = e;
  }, [e, t]), n.current;
}, Da = (e, t, n, r) => e.getFixedT(t, n, r), ef = (e, t, n, r) => q(Da(e, t, n, r), [e, t, n, r]), Un = (e, t = {}) => {
  var S, x, y, R;
  const {
    i18n: n
  } = t, {
    i18n: r,
    defaultNS: i
  } = Z(Ca) || {}, o = n || r || wo();
  if (o && !o.reportNamespaces && (o.reportNamespaces = new Zc()), !o) {
    Rn(o, "NO_I18NEXT_INSTANCE", "useTranslation: You will need to pass in an i18next instance by using initReactI18next");
    const T = (L, N) => ke(N) ? N : Lt(N) && ke(N.defaultValue) ? N.defaultValue : Array.isArray(L) ? L[L.length - 1] : L, $ = [T, {}, !1];
    return $.t = T, $.i18n = {}, $.ready = !1, $;
  }
  (S = o.options.react) != null && S.wait && Rn(o, "DEPRECATED_OPTION", "useTranslation: It seems you are still using the old wait option, you may migrate to the new useSuspense behaviour.");
  const s = {
    ...Na(),
    ...o.options.react,
    ...t
  }, {
    useSuspense: a,
    keyPrefix: l
  } = s;
  let c = i || ((x = o.options) == null ? void 0 : x.defaultNS);
  c = ke(c) ? [c] : c || ["translation"], (R = (y = o.reportNamespaces).addUsedNamespaces) == null || R.call(y, c);
  const u = (o.isInitialized || o.initializedStoreOnce) && c.every((T) => Gc(T, o, s)), f = ef(o, t.lng || null, s.nsMode === "fallback" ? c : c[0], l), h = () => f, d = () => Da(o, t.lng || null, s.nsMode === "fallback" ? c : c[0], l), [p, g] = W(h);
  let b = c.join();
  t.lng && (b = `${t.lng}${b}`);
  const O = Jc(b), _ = D(!0);
  z(() => {
    const {
      bindI18n: T,
      bindI18nStore: $
    } = s;
    _.current = !0, !u && !a && (t.lng ? us(o, t.lng, c, () => {
      _.current && g(d);
    }) : Vi(o, c, () => {
      _.current && g(d);
    })), u && O && O !== b && _.current && g(d);
    const L = () => {
      _.current && g(d);
    };
    return T && (o == null || o.on(T, L)), $ && (o == null || o.store.on($, L)), () => {
      _.current = !1, o && (T == null || T.split(" ").forEach((N) => o.off(N, L))), $ && o && $.split(" ").forEach((N) => o.store.off(N, L));
    };
  }, [o, b]), z(() => {
    _.current && u && g(h);
  }, [o, l, u]);
  const E = [p, o, u];
  if (E.t = p, E.i18n = o, E.ready = u, u || !u && !a) return E;
  throw new Promise((T) => {
    t.lng ? us(o, t.lng, c, () => T()) : Vi(o, c, () => T());
  });
};
var w = {}, tf = {
  0: "Invalid value for configuration 'enforceActions', expected 'never', 'always' or 'observed'",
  1: function(t, n) {
    return "Cannot apply '" + t + "' to '" + n.toString() + "': Field not found.";
  },
  /*
  2(prop) {
      return `invalid decorator for '${prop.toString()}'`
  },
  3(prop) {
      return `Cannot decorate '${prop.toString()}': action can only be used on properties with a function value.`
  },
  4(prop) {
      return `Cannot decorate '${prop.toString()}': computed can only be used on getter properties.`
  },
  */
  5: "'keys()' can only be used on observable objects, arrays, sets and maps",
  6: "'values()' can only be used on observable objects, arrays, sets and maps",
  7: "'entries()' can only be used on observable objects, arrays and maps",
  8: "'set()' can only be used on observable objects, arrays and maps",
  9: "'remove()' can only be used on observable objects, arrays and maps",
  10: "'has()' can only be used on observable objects, arrays and maps",
  11: "'get()' can only be used on observable objects, arrays and maps",
  12: "Invalid annotation",
  13: "Dynamic observable objects cannot be frozen. If you're passing observables to 3rd party component/function that calls Object.freeze, pass copy instead: toJS(observable)",
  14: "Intercept handlers should return nothing or a change object",
  15: "Observable arrays cannot be frozen. If you're passing observables to 3rd party component/function that calls Object.freeze, pass copy instead: toJS(observable)",
  16: "Modification exception: the internal structure of an observable array was changed.",
  17: function(t, n) {
    return "[mobx.array] Index out of bounds, " + t + " is larger than " + n;
  },
  18: "mobx.map requires Map polyfill for the current browser. Check babel-polyfill or core-js/es6/map.js",
  19: function(t) {
    return "Cannot initialize from classes that inherit from Map: " + t.constructor.name;
  },
  20: function(t) {
    return "Cannot initialize map from " + t;
  },
  21: function(t) {
    return "Cannot convert to map from '" + t + "'";
  },
  22: "mobx.set requires Set polyfill for the current browser. Check babel-polyfill or core-js/es6/set.js",
  23: "It is not possible to get index atoms from arrays",
  24: function(t) {
    return "Cannot obtain administration from " + t;
  },
  25: function(t, n) {
    return "the entry '" + t + "' does not exist in the observable map '" + n + "'";
  },
  26: "please specify a property",
  27: function(t, n) {
    return "no observable property '" + t.toString() + "' found on the observable object '" + n + "'";
  },
  28: function(t) {
    return "Cannot obtain atom from " + t;
  },
  29: "Expecting some object",
  30: "invalid action stack. did you forget to finish an action?",
  31: "missing option for computed: get",
  32: function(t, n) {
    return "Cycle detected in computation " + t + ": " + n;
  },
  33: function(t) {
    return "The setter of computed value '" + t + "' is trying to update itself. Did you intend to update an _observable_ value, instead of the computed property?";
  },
  34: function(t) {
    return "[ComputedValue '" + t + "'] It is not possible to assign a new value to a computed value.";
  },
  35: "There are multiple, different versions of MobX active. Make sure MobX is loaded only once or use `configure({ isolateGlobalState: true })`",
  36: "isolateGlobalState should be called before MobX is running any reactions",
  37: function(t) {
    return "[mobx] `observableArray." + t + "()` mutates the array in-place, which is not allowed inside a derivation. Use `array.slice()." + t + "()` instead";
  },
  38: "'ownKeys()' can only be used on observable objects",
  39: "'defineProperty()' can only be used on observable objects"
}, nf = w.NODE_ENV !== "production" ? tf : {};
function C(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), r = 1; r < t; r++)
    n[r - 1] = arguments[r];
  if (w.NODE_ENV !== "production") {
    var i = typeof e == "string" ? e : nf[e];
    throw typeof i == "function" && (i = i.apply(null, n)), new Error("[MobX] " + i);
  }
  throw new Error(typeof e == "number" ? "[MobX] minified error nr: " + e + (n.length ? " " + n.map(String).join(",") : "") + ". Find the full error at: https://github.com/mobxjs/mobx/blob/main/packages/mobx/src/errors.ts" : "[MobX] " + e);
}
var rf = {};
function kr() {
  return typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : rf;
}
var $a = Object.assign, gr = Object.getOwnPropertyDescriptor, it = Object.defineProperty, Br = Object.prototype, mr = [];
Object.freeze(mr);
var La = {};
Object.freeze(La);
var of = typeof Proxy < "u", sf = /* @__PURE__ */ Object.toString();
function Pa() {
  of || C(w.NODE_ENV !== "production" ? "`Proxy` objects are not available in the current environment. Please configure MobX to enable a fallback implementation.`" : "Proxy not available");
}
function On(e) {
  w.NODE_ENV !== "production" && A.verifyProxies && C("MobX is currently configured to be able to run in ES5 mode, but in ES5 MobX won't be able to " + e);
}
function Je() {
  return ++A.mobxGuid;
}
function So(e) {
  var t = !1;
  return function() {
    if (!t)
      return t = !0, e.apply(this, arguments);
  };
}
var tn = function() {
};
function ce(e) {
  return typeof e == "function";
}
function Mt(e) {
  var t = typeof e;
  switch (t) {
    case "string":
    case "symbol":
    case "number":
      return !0;
  }
  return !1;
}
function Ur(e) {
  return e !== null && typeof e == "object";
}
function xe(e) {
  if (!Ur(e))
    return !1;
  var t = Object.getPrototypeOf(e);
  if (t == null)
    return !0;
  var n = Object.hasOwnProperty.call(t, "constructor") && t.constructor;
  return typeof n == "function" && n.toString() === sf;
}
function Ia(e) {
  var t = e == null ? void 0 : e.constructor;
  return t ? t.name === "GeneratorFunction" || t.displayName === "GeneratorFunction" : !1;
}
function Hn(e, t, n) {
  it(e, t, {
    enumerable: !1,
    writable: !0,
    configurable: !0,
    value: n
  });
}
function Va(e, t, n) {
  it(e, t, {
    enumerable: !1,
    writable: !1,
    configurable: !0,
    value: n
  });
}
function qt(e, t) {
  var n = "isMobX" + e;
  return t.prototype[n] = !0, function(r) {
    return Ur(r) && r[n] === !0;
  };
}
function pn(e) {
  return e != null && Object.prototype.toString.call(e) === "[object Map]";
}
function af(e) {
  var t = Object.getPrototypeOf(e), n = Object.getPrototypeOf(t), r = Object.getPrototypeOf(n);
  return r === null;
}
function ct(e) {
  return e != null && Object.prototype.toString.call(e) === "[object Set]";
}
var Fa = typeof Object.getOwnPropertySymbols < "u";
function lf(e) {
  var t = Object.keys(e);
  if (!Fa)
    return t;
  var n = Object.getOwnPropertySymbols(e);
  return n.length ? [].concat(t, n.filter(function(r) {
    return Br.propertyIsEnumerable.call(e, r);
  })) : t;
}
var an = typeof Reflect < "u" && Reflect.ownKeys ? Reflect.ownKeys : Fa ? function(e) {
  return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e));
} : (
  /* istanbul ignore next */
  Object.getOwnPropertyNames
);
function Fi(e) {
  return typeof e == "string" ? e : typeof e == "symbol" ? e.toString() : new String(e).toString();
}
function Ma(e) {
  return e === null ? null : typeof e == "object" ? "" + e : e;
}
function Be(e, t) {
  return Br.hasOwnProperty.call(e, t);
}
var uf = Object.getOwnPropertyDescriptors || function(t) {
  var n = {};
  return an(t).forEach(function(r) {
    n[r] = gr(t, r);
  }), n;
};
function Se(e, t) {
  return !!(e & t);
}
function Ne(e, t, n) {
  return n ? e |= t : e &= ~t, e;
}
function cs(e, t) {
  (t == null || t > e.length) && (t = e.length);
  for (var n = 0, r = Array(t); n < t; n++) r[n] = e[n];
  return r;
}
function cf(e, t) {
  for (var n = 0; n < t.length; n++) {
    var r = t[n];
    r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), Object.defineProperty(e, df(r.key), r);
  }
}
function hn(e, t, n) {
  return t && cf(e.prototype, t), Object.defineProperty(e, "prototype", {
    writable: !1
  }), e;
}
function nn(e, t) {
  var n = typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
  if (n) return (n = n.call(e)).next.bind(n);
  if (Array.isArray(e) || (n = pf(e)) || t) {
    n && (e = n);
    var r = 0;
    return function() {
      return r >= e.length ? {
        done: !0
      } : {
        done: !1,
        value: e[r++]
      };
    };
  }
  throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
}
function vt() {
  return vt = Object.assign ? Object.assign.bind() : function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var n = arguments[t];
      for (var r in n) ({}).hasOwnProperty.call(n, r) && (e[r] = n[r]);
    }
    return e;
  }, vt.apply(null, arguments);
}
function ja(e, t) {
  e.prototype = Object.create(t.prototype), e.prototype.constructor = e, Mi(e, t);
}
function Mi(e, t) {
  return Mi = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(n, r) {
    return n.__proto__ = r, n;
  }, Mi(e, t);
}
function ff(e, t) {
  if (typeof e != "object" || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var r = n.call(e, t);
    if (typeof r != "object") return r;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return String(e);
}
function df(e) {
  var t = ff(e, "string");
  return typeof t == "symbol" ? t : t + "";
}
function pf(e, t) {
  if (e) {
    if (typeof e == "string") return cs(e, t);
    var n = {}.toString.call(e).slice(8, -1);
    return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? cs(e, t) : void 0;
  }
}
var Ee = /* @__PURE__ */ Symbol("mobx-stored-annotations");
function ot(e) {
  function t(n, r) {
    if (qn(r))
      return e.decorate_20223_(n, r);
    Gn(n, r, e);
  }
  return Object.assign(t, e);
}
function Gn(e, t, n) {
  if (Be(e, Ee) || Hn(e, Ee, vt({}, e[Ee])), w.NODE_ENV !== "production" && _r(n) && !Be(e[Ee], t)) {
    var r = e.constructor.name + ".prototype." + t.toString();
    C("'" + r + "' is decorated with 'override', but no such decorated member was found on prototype.");
  }
  hf(e, n, t), _r(n) || (e[Ee][t] = n);
}
function hf(e, t, n) {
  if (w.NODE_ENV !== "production" && !_r(t) && Be(e[Ee], n)) {
    var r = e.constructor.name + ".prototype." + n.toString(), i = e[Ee][n].annotationType_, o = t.annotationType_;
    C("Cannot apply '@" + o + "' to '" + r + "':" + (`
The field is already decorated with '@` + i + "'.") + `
Re-decorating fields is not allowed.
Use '@override' decorator for methods overridden by subclass.`);
  }
}
function vf(e) {
  return Be(e, Ee) || Hn(e, Ee, vt({}, e[Ee])), e[Ee];
}
function qn(e) {
  return typeof e == "object" && typeof e.kind == "string";
}
function Hr(e, t) {
  w.NODE_ENV !== "production" && !t.includes(e.kind) && C("The decorator applied to '" + String(e.name) + "' cannot be used on a " + e.kind + " element");
}
var F = /* @__PURE__ */ Symbol("mobx administration"), xt = /* @__PURE__ */ function() {
  function e(n) {
    n === void 0 && (n = w.NODE_ENV !== "production" ? "Atom@" + Je() : "Atom"), this.name_ = void 0, this.flags_ = 0, this.observers_ = /* @__PURE__ */ new Set(), this.lastAccessedBy_ = 0, this.lowestObserverState_ = Y.NOT_TRACKING_, this.onBOL = void 0, this.onBUOL = void 0, this.name_ = n;
  }
  var t = e.prototype;
  return t.onBO = function() {
    this.onBOL && this.onBOL.forEach(function(r) {
      return r();
    });
  }, t.onBUO = function() {
    this.onBUOL && this.onBUOL.forEach(function(r) {
      return r();
    });
  }, t.reportObserved = function() {
    return nl(this);
  }, t.reportChanged = function() {
    Me(), rl(this), je();
  }, t.toString = function() {
    return this.name_;
  }, hn(e, [{
    key: "isBeingObserved",
    get: function() {
      return Se(this.flags_, e.isBeingObservedMask_);
    },
    set: function(r) {
      this.flags_ = Ne(this.flags_, e.isBeingObservedMask_, r);
    }
  }, {
    key: "isPendingUnobservation",
    get: function() {
      return Se(this.flags_, e.isPendingUnobservationMask_);
    },
    set: function(r) {
      this.flags_ = Ne(this.flags_, e.isPendingUnobservationMask_, r);
    }
  }, {
    key: "diffValue",
    get: function() {
      return Se(this.flags_, e.diffValueMask_) ? 1 : 0;
    },
    set: function(r) {
      this.flags_ = Ne(this.flags_, e.diffValueMask_, r === 1);
    }
  }]);
}();
xt.isBeingObservedMask_ = 1;
xt.isPendingUnobservationMask_ = 2;
xt.diffValueMask_ = 4;
var No = /* @__PURE__ */ qt("Atom", xt);
function ka(e, t, n) {
  t === void 0 && (t = tn), n === void 0 && (n = tn);
  var r = new xt(e);
  return t !== tn && Nd(r, t), n !== tn && cl(r, n), r;
}
function gf(e, t) {
  return Sl(e, t);
}
function mf(e, t) {
  return Object.is ? Object.is(e, t) : e === t ? e !== 0 || 1 / e === 1 / t : e !== e && t !== t;
}
var br = {
  structural: gf,
  default: mf
};
function jt(e, t, n) {
  return $n(e) ? e : Array.isArray(e) ? ve.array(e, {
    name: n
  }) : xe(e) ? ve.object(e, void 0, {
    name: n
  }) : pn(e) ? ve.map(e, {
    name: n
  }) : ct(e) ? ve.set(e, {
    name: n
  }) : typeof e == "function" && !ln(e) && !Dn(e) ? Ia(e) ? un(e) : Cn(n, e) : e;
}
function bf(e, t, n) {
  if (e == null || vn(e) || zr(e) || At(e) || nt(e))
    return e;
  if (Array.isArray(e))
    return ve.array(e, {
      name: n,
      deep: !1
    });
  if (xe(e))
    return ve.object(e, void 0, {
      name: n,
      deep: !1
    });
  if (pn(e))
    return ve.map(e, {
      name: n,
      deep: !1
    });
  if (ct(e))
    return ve.set(e, {
      name: n,
      deep: !1
    });
  w.NODE_ENV !== "production" && C("The shallow modifier / decorator can only used in combination with arrays, objects, maps and sets");
}
function Gr(e) {
  return e;
}
function _f(e, t) {
  return w.NODE_ENV !== "production" && $n(e) && C("observable.struct should not be used with observable values"), Sl(e, t) ? t : e;
}
var yf = "override";
function _r(e) {
  return e.annotationType_ === yf;
}
function Wn(e, t) {
  return {
    annotationType_: e,
    options_: t,
    make_: Ef,
    extend_: Of,
    decorate_20223_: wf
  };
}
function Ef(e, t, n, r) {
  var i;
  if ((i = this.options_) != null && i.bound)
    return this.extend_(e, t, n, !1) === null ? 0 : 1;
  if (r === e.target_)
    return this.extend_(e, t, n, !1) === null ? 0 : 2;
  if (ln(n.value))
    return 1;
  var o = Ba(e, this, t, n, !1);
  return it(r, t, o), 2;
}
function Of(e, t, n, r) {
  var i = Ba(e, this, t, n);
  return e.defineProperty_(t, i, r);
}
function wf(e, t) {
  w.NODE_ENV !== "production" && Hr(t, ["method", "field"]);
  var n = t.kind, r = t.name, i = t.addInitializer, o = this, s = function(c) {
    var u, f, h, d;
    return kt((u = (f = o.options_) == null ? void 0 : f.name) != null ? u : r.toString(), c, (h = (d = o.options_) == null ? void 0 : d.autoAction) != null ? h : !1);
  };
  if (n == "field")
    return function(l) {
      var c, u = l;
      return ln(u) || (u = s(u)), (c = o.options_) != null && c.bound && (u = u.bind(this), u.isMobxAction = !0), u;
    };
  if (n == "method") {
    var a;
    return ln(e) || (e = s(e)), (a = this.options_) != null && a.bound && i(function() {
      var l = this, c = l[r].bind(l);
      c.isMobxAction = !0, l[r] = c;
    }), e;
  }
  C("Cannot apply '" + o.annotationType_ + "' to '" + String(r) + "' (kind: " + n + "):" + (`
'` + o.annotationType_ + "' can only be used on properties with a function value."));
}
function Sf(e, t, n, r) {
  var i = t.annotationType_, o = r.value;
  w.NODE_ENV !== "production" && !ce(o) && C("Cannot apply '" + i + "' to '" + e.name_ + "." + n.toString() + "':" + (`
'` + i + "' can only be used on properties with a function value."));
}
function Ba(e, t, n, r, i) {
  var o, s, a, l, c, u, f;
  i === void 0 && (i = A.safeDescriptors), Sf(e, t, n, r);
  var h = r.value;
  if ((o = t.options_) != null && o.bound) {
    var d;
    h = h.bind((d = e.proxy_) != null ? d : e.target_);
  }
  return {
    value: kt(
      (s = (a = t.options_) == null ? void 0 : a.name) != null ? s : n.toString(),
      h,
      (l = (c = t.options_) == null ? void 0 : c.autoAction) != null ? l : !1,
      // https://github.com/mobxjs/mobx/discussions/3140
      (u = t.options_) != null && u.bound ? (f = e.proxy_) != null ? f : e.target_ : void 0
    ),
    // Non-configurable for classes
    // prevents accidental field redefinition in subclass
    configurable: i ? e.isPlainObject_ : !0,
    // https://github.com/mobxjs/mobx/pull/2641#issuecomment-737292058
    enumerable: !1,
    // Non-obsevable, therefore non-writable
    // Also prevents rewriting in subclass constructor
    writable: !i
  };
}
function Ua(e, t) {
  return {
    annotationType_: e,
    options_: t,
    make_: Nf,
    extend_: xf,
    decorate_20223_: Af
  };
}
function Nf(e, t, n, r) {
  var i;
  if (r === e.target_)
    return this.extend_(e, t, n, !1) === null ? 0 : 2;
  if ((i = this.options_) != null && i.bound && (!Be(e.target_, t) || !Dn(e.target_[t])) && this.extend_(e, t, n, !1) === null)
    return 0;
  if (Dn(n.value))
    return 1;
  var o = Ha(e, this, t, n, !1, !1);
  return it(r, t, o), 2;
}
function xf(e, t, n, r) {
  var i, o = Ha(e, this, t, n, (i = this.options_) == null ? void 0 : i.bound);
  return e.defineProperty_(t, o, r);
}
function Af(e, t) {
  var n;
  w.NODE_ENV !== "production" && Hr(t, ["method"]);
  var r = t.name, i = t.addInitializer;
  return Dn(e) || (e = un(e)), (n = this.options_) != null && n.bound && i(function() {
    var o = this, s = o[r].bind(o);
    s.isMobXFlow = !0, o[r] = s;
  }), e;
}
function Tf(e, t, n, r) {
  var i = t.annotationType_, o = r.value;
  w.NODE_ENV !== "production" && !ce(o) && C("Cannot apply '" + i + "' to '" + e.name_ + "." + n.toString() + "':" + (`
'` + i + "' can only be used on properties with a generator function value."));
}
function Ha(e, t, n, r, i, o) {
  o === void 0 && (o = A.safeDescriptors), Tf(e, t, n, r);
  var s = r.value;
  if (Dn(s) || (s = un(s)), i) {
    var a;
    s = s.bind((a = e.proxy_) != null ? a : e.target_), s.isMobXFlow = !0;
  }
  return {
    value: s,
    // Non-configurable for classes
    // prevents accidental field redefinition in subclass
    configurable: o ? e.isPlainObject_ : !0,
    // https://github.com/mobxjs/mobx/pull/2641#issuecomment-737292058
    enumerable: !1,
    // Non-obsevable, therefore non-writable
    // Also prevents rewriting in subclass constructor
    writable: !o
  };
}
function xo(e, t) {
  return {
    annotationType_: e,
    options_: t,
    make_: Rf,
    extend_: Cf,
    decorate_20223_: Df
  };
}
function Rf(e, t, n) {
  return this.extend_(e, t, n, !1) === null ? 0 : 1;
}
function Cf(e, t, n, r) {
  return $f(e, this, t, n), e.defineComputedProperty_(t, vt({}, this.options_, {
    get: n.get,
    set: n.set
  }), r);
}
function Df(e, t) {
  w.NODE_ENV !== "production" && Hr(t, ["getter"]);
  var n = this, r = t.name, i = t.addInitializer;
  return i(function() {
    var o = Kt(this)[F], s = vt({}, n.options_, {
      get: e,
      context: this
    });
    s.name || (s.name = w.NODE_ENV !== "production" ? o.name_ + "." + r.toString() : "ObservableObject." + r.toString()), o.values_.set(r, new He(s));
  }), function() {
    return this[F].getObservablePropValue_(r);
  };
}
function $f(e, t, n, r) {
  var i = t.annotationType_, o = r.get;
  w.NODE_ENV !== "production" && !o && C("Cannot apply '" + i + "' to '" + e.name_ + "." + n.toString() + "':" + (`
'` + i + "' can only be used on getter(+setter) properties."));
}
function qr(e, t) {
  return {
    annotationType_: e,
    options_: t,
    make_: Lf,
    extend_: Pf,
    decorate_20223_: If
  };
}
function Lf(e, t, n) {
  return this.extend_(e, t, n, !1) === null ? 0 : 1;
}
function Pf(e, t, n, r) {
  var i, o;
  return Vf(e, this, t, n), e.defineObservableProperty_(t, n.value, (i = (o = this.options_) == null ? void 0 : o.enhancer) != null ? i : jt, r);
}
function If(e, t) {
  if (w.NODE_ENV !== "production") {
    if (t.kind === "field")
      throw C("Please use `@observable accessor " + String(t.name) + "` instead of `@observable " + String(t.name) + "`");
    Hr(t, ["accessor"]);
  }
  var n = this, r = t.kind, i = t.name, o = /* @__PURE__ */ new WeakSet();
  function s(a, l) {
    var c, u, f = Kt(a)[F], h = new Vt(l, (c = (u = n.options_) == null ? void 0 : u.enhancer) != null ? c : jt, w.NODE_ENV !== "production" ? f.name_ + "." + i.toString() : "ObservableObject." + i.toString(), !1);
    f.values_.set(i, h), o.add(a);
  }
  if (r == "accessor")
    return {
      get: function() {
        return o.has(this) || s(this, e.get.call(this)), this[F].getObservablePropValue_(i);
      },
      set: function(l) {
        return o.has(this) || s(this, l), this[F].setObservablePropValue_(i, l);
      },
      init: function(l) {
        return o.has(this) || s(this, l), l;
      }
    };
}
function Vf(e, t, n, r) {
  var i = t.annotationType_;
  w.NODE_ENV !== "production" && !("value" in r) && C("Cannot apply '" + i + "' to '" + e.name_ + "." + n.toString() + "':" + (`
'` + i + "' cannot be used on getter/setter properties"));
}
var Ff = "true", Mf = /* @__PURE__ */ Ga();
function Ga(e) {
  return {
    annotationType_: Ff,
    options_: e,
    make_: jf,
    extend_: kf,
    decorate_20223_: Bf
  };
}
function jf(e, t, n, r) {
  var i, o;
  if (n.get)
    return Wr.make_(e, t, n, r);
  if (n.set) {
    var s = kt(t.toString(), n.set);
    return r === e.target_ ? e.defineProperty_(t, {
      configurable: A.safeDescriptors ? e.isPlainObject_ : !0,
      set: s
    }) === null ? 0 : 2 : (it(r, t, {
      configurable: !0,
      set: s
    }), 2);
  }
  if (r !== e.target_ && typeof n.value == "function") {
    var a;
    if (Ia(n.value)) {
      var l, c = (l = this.options_) != null && l.autoBind ? un.bound : un;
      return c.make_(e, t, n, r);
    }
    var u = (a = this.options_) != null && a.autoBind ? Cn.bound : Cn;
    return u.make_(e, t, n, r);
  }
  var f = ((i = this.options_) == null ? void 0 : i.deep) === !1 ? ve.ref : ve;
  if (typeof n.value == "function" && (o = this.options_) != null && o.autoBind) {
    var h;
    n.value = n.value.bind((h = e.proxy_) != null ? h : e.target_);
  }
  return f.make_(e, t, n, r);
}
function kf(e, t, n, r) {
  var i, o;
  if (n.get)
    return Wr.extend_(e, t, n, r);
  if (n.set)
    return e.defineProperty_(t, {
      configurable: A.safeDescriptors ? e.isPlainObject_ : !0,
      set: kt(t.toString(), n.set)
    }, r);
  if (typeof n.value == "function" && (i = this.options_) != null && i.autoBind) {
    var s;
    n.value = n.value.bind((s = e.proxy_) != null ? s : e.target_);
  }
  var a = ((o = this.options_) == null ? void 0 : o.deep) === !1 ? ve.ref : ve;
  return a.extend_(e, t, n, r);
}
function Bf(e, t) {
  C("'" + this.annotationType_ + "' cannot be used as a decorator");
}
var Uf = "observable", Hf = "observable.ref", Gf = "observable.shallow", qf = "observable.struct", qa = {
  deep: !0,
  name: void 0,
  defaultDecorator: void 0,
  proxy: !0
};
Object.freeze(qa);
function nr(e) {
  return e || qa;
}
var ji = /* @__PURE__ */ qr(Uf), Wf = /* @__PURE__ */ qr(Hf, {
  enhancer: Gr
}), Kf = /* @__PURE__ */ qr(Gf, {
  enhancer: bf
}), zf = /* @__PURE__ */ qr(qf, {
  enhancer: _f
}), Wa = /* @__PURE__ */ ot(ji);
function rr(e) {
  return e.deep === !0 ? jt : e.deep === !1 ? Gr : Xf(e.defaultDecorator);
}
function Yf(e) {
  var t;
  return e ? (t = e.defaultDecorator) != null ? t : Ga(e) : void 0;
}
function Xf(e) {
  var t, n;
  return e && (t = (n = e.options_) == null ? void 0 : n.enhancer) != null ? t : jt;
}
function Ka(e, t, n) {
  if (qn(t))
    return ji.decorate_20223_(e, t);
  if (Mt(t)) {
    Gn(e, t, ji);
    return;
  }
  return $n(e) ? e : xe(e) ? ve.object(e, t, n) : Array.isArray(e) ? ve.array(e, t) : pn(e) ? ve.map(e, t) : ct(e) ? ve.set(e, t) : typeof e == "object" && e !== null ? e : ve.box(e, t);
}
$a(Ka, Wa);
var Qf = {
  box: function(t, n) {
    var r = nr(n);
    return new Vt(t, rr(r), r.name, !0, r.equals);
  },
  array: function(t, n) {
    var r = nr(n);
    return (A.useProxies === !1 || r.proxy === !1 ? Xd : kd)(t, rr(r), r.name);
  },
  map: function(t, n) {
    var r = nr(n);
    return new bl(t, rr(r), r.name);
  },
  set: function(t, n) {
    var r = nr(n);
    return new _l(t, rr(r), r.name);
  },
  object: function(t, n, r) {
    return Tt(function() {
      return dl(A.useProxies === !1 || (r == null ? void 0 : r.proxy) === !1 ? Kt({}, r) : Vd({}, r), t, n);
    });
  },
  ref: /* @__PURE__ */ ot(Wf),
  shallow: /* @__PURE__ */ ot(Kf),
  deep: Wa,
  struct: /* @__PURE__ */ ot(zf)
}, ve = /* @__PURE__ */ $a(Ka, Qf), za = "computed", Zf = "computed.struct", ki = /* @__PURE__ */ xo(za), Jf = /* @__PURE__ */ xo(Zf, {
  equals: br.structural
}), Wr = function(t, n) {
  if (qn(n))
    return ki.decorate_20223_(t, n);
  if (Mt(n))
    return Gn(t, n, ki);
  if (xe(t))
    return ot(xo(za, t));
  w.NODE_ENV !== "production" && (ce(t) || C("First argument to `computed` should be an expression."), ce(n) && C("A setter as second argument is no longer supported, use `{ set: fn }` option instead"));
  var r = xe(n) ? n : {};
  return r.get = t, r.name || (r.name = t.name || ""), new He(r);
};
Object.assign(Wr, ki);
Wr.struct = /* @__PURE__ */ ot(Jf);
var fs, ds, yr = 0, ed = 1, td = (fs = (ds = /* @__PURE__ */ gr(function() {
}, "name")) == null ? void 0 : ds.configurable) != null ? fs : !1, ps = {
  value: "action",
  configurable: !0,
  writable: !1,
  enumerable: !1
};
function kt(e, t, n, r) {
  n === void 0 && (n = !1), w.NODE_ENV !== "production" && (ce(t) || C("`action` can only be invoked on functions"), (typeof e != "string" || !e) && C("actions should have valid names, got: '" + e + "'"));
  function i() {
    return Ya(e, n, t, r || this, arguments);
  }
  return i.isMobxAction = !0, i.toString = function() {
    return t.toString();
  }, td && (ps.value = e, it(i, "name", ps)), i;
}
function Ya(e, t, n, r, i) {
  var o = nd(e, t, r, i);
  try {
    return n.apply(r, i);
  } catch (s) {
    throw o.error_ = s, s;
  } finally {
    rd(o);
  }
}
function nd(e, t, n, r) {
  var i = w.NODE_ENV !== "production" && ge() && !!e, o = 0;
  if (w.NODE_ENV !== "production" && i) {
    o = Date.now();
    var s = r ? Array.from(r) : mr;
    Ae({
      type: Co,
      name: e,
      object: n,
      arguments: s
    });
  }
  var a = A.trackingDerivation, l = !t || !a;
  Me();
  var c = A.allowStateChanges;
  l && (Wt(), c = Ao(!0));
  var u = Ro(!0), f = {
    runAsAction_: l,
    prevDerivation_: a,
    prevAllowStateChanges_: c,
    prevAllowStateReads_: u,
    notifySpy_: i,
    startTime_: o,
    actionId_: ed++,
    parentActionId_: yr
  };
  return yr = f.actionId_, f;
}
function rd(e) {
  yr !== e.actionId_ && C(30), yr = e.parentActionId_, e.error_ !== void 0 && (A.suppressReactionErrors = !0), To(e.prevAllowStateChanges_), Sn(e.prevAllowStateReads_), je(), e.runAsAction_ && pt(e.prevDerivation_), w.NODE_ENV !== "production" && e.notifySpy_ && Te({
    time: Date.now() - e.startTime_
  }), A.suppressReactionErrors = !1;
}
function Ao(e) {
  var t = A.allowStateChanges;
  return A.allowStateChanges = e, t;
}
function To(e) {
  A.allowStateChanges = e;
}
var id = "create", Vt = /* @__PURE__ */ function(e) {
  function t(r, i, o, s, a) {
    var l;
    return o === void 0 && (o = w.NODE_ENV !== "production" ? "ObservableValue@" + Je() : "ObservableValue"), s === void 0 && (s = !0), a === void 0 && (a = br.default), l = e.call(this, o) || this, l.enhancer = void 0, l.name_ = void 0, l.equals = void 0, l.hasUnreportedChange_ = !1, l.interceptors_ = void 0, l.changeListeners_ = void 0, l.value_ = void 0, l.dehancer = void 0, l.enhancer = i, l.name_ = o, l.equals = a, l.value_ = i(r, void 0, o), w.NODE_ENV !== "production" && s && ge() && Bt({
      type: id,
      object: l,
      observableKind: "value",
      debugObjectName: l.name_,
      newValue: "" + l.value_
    }), l;
  }
  ja(t, e);
  var n = t.prototype;
  return n.dehanceValue = function(i) {
    return this.dehancer !== void 0 ? this.dehancer(i) : i;
  }, n.set = function(i) {
    var o = this.value_;
    if (i = this.prepareNewValue_(i), i !== A.UNCHANGED) {
      var s = ge();
      w.NODE_ENV !== "production" && s && Ae({
        type: We,
        object: this,
        observableKind: "value",
        debugObjectName: this.name_,
        newValue: i,
        oldValue: o
      }), this.setNewValue_(i), w.NODE_ENV !== "production" && s && Te();
    }
  }, n.prepareNewValue_ = function(i) {
    if (rt(this), Ie(this)) {
      var o = Ve(this, {
        object: this,
        type: We,
        newValue: i
      });
      if (!o)
        return A.UNCHANGED;
      i = o.newValue;
    }
    return i = this.enhancer(i, this.value_, this.name_), this.equals(this.value_, i) ? A.UNCHANGED : i;
  }, n.setNewValue_ = function(i) {
    var o = this.value_;
    this.value_ = i, this.reportChanged(), Ye(this) && Xe(this, {
      type: We,
      object: this,
      newValue: i,
      oldValue: o
    });
  }, n.get = function() {
    return this.reportObserved(), this.dehanceValue(this.value_);
  }, n.intercept_ = function(i) {
    return Kn(this, i);
  }, n.observe_ = function(i, o) {
    return o && i({
      observableKind: "value",
      debugObjectName: this.name_,
      object: this,
      type: We,
      newValue: this.value_,
      oldValue: void 0
    }), zn(this, i);
  }, n.raw = function() {
    return this.value_;
  }, n.toJSON = function() {
    return this.get();
  }, n.toString = function() {
    return this.name_ + "[" + this.value_ + "]";
  }, n.valueOf = function() {
    return Ma(this.get());
  }, n[Symbol.toPrimitive] = function() {
    return this.valueOf();
  }, t;
}(xt), He = /* @__PURE__ */ function() {
  function e(n) {
    this.dependenciesState_ = Y.NOT_TRACKING_, this.observing_ = [], this.newObserving_ = null, this.observers_ = /* @__PURE__ */ new Set(), this.runId_ = 0, this.lastAccessedBy_ = 0, this.lowestObserverState_ = Y.UP_TO_DATE_, this.unboundDepsCount_ = 0, this.value_ = new Er(null), this.name_ = void 0, this.triggeredBy_ = void 0, this.flags_ = 0, this.derivation = void 0, this.setter_ = void 0, this.isTracing_ = Ue.NONE, this.scope_ = void 0, this.equals_ = void 0, this.requiresReaction_ = void 0, this.keepAlive_ = void 0, this.onBOL = void 0, this.onBUOL = void 0, n.get || C(31), this.derivation = n.get, this.name_ = n.name || (w.NODE_ENV !== "production" ? "ComputedValue@" + Je() : "ComputedValue"), n.set && (this.setter_ = kt(w.NODE_ENV !== "production" ? this.name_ + "-setter" : "ComputedValue-setter", n.set)), this.equals_ = n.equals || (n.compareStructural || n.struct ? br.structural : br.default), this.scope_ = n.context, this.requiresReaction_ = n.requiresReaction, this.keepAlive_ = !!n.keepAlive;
  }
  var t = e.prototype;
  return t.onBecomeStale_ = function() {
    fd(this);
  }, t.onBO = function() {
    this.onBOL && this.onBOL.forEach(function(r) {
      return r();
    });
  }, t.onBUO = function() {
    this.onBUOL && this.onBUOL.forEach(function(r) {
      return r();
    });
  }, t.get = function() {
    if (this.isComputing && C(32, this.name_, this.derivation), A.inBatch === 0 && // !globalState.trackingDerivatpion &&
    this.observers_.size === 0 && !this.keepAlive_)
      Bi(this) && (this.warnAboutUntrackedRead_(), Me(), this.value_ = this.computeValue_(!1), je());
    else if (nl(this), Bi(this)) {
      var r = A.trackingContext;
      this.keepAlive_ && !r && (A.trackingContext = this), this.trackAndCompute() && cd(this), A.trackingContext = r;
    }
    var i = this.value_;
    if (cr(i))
      throw i.cause;
    return i;
  }, t.set = function(r) {
    if (this.setter_) {
      this.isRunningSetter && C(33, this.name_), this.isRunningSetter = !0;
      try {
        this.setter_.call(this.scope_, r);
      } finally {
        this.isRunningSetter = !1;
      }
    } else
      C(34, this.name_);
  }, t.trackAndCompute = function() {
    var r = this.value_, i = (
      /* see #1208 */
      this.dependenciesState_ === Y.NOT_TRACKING_
    ), o = this.computeValue_(!0), s = i || cr(r) || cr(o) || !this.equals_(r, o);
    return s && (this.value_ = o, w.NODE_ENV !== "production" && ge() && Bt({
      observableKind: "computed",
      debugObjectName: this.name_,
      object: this.scope_,
      type: "update",
      oldValue: r,
      newValue: o
    })), s;
  }, t.computeValue_ = function(r) {
    this.isComputing = !0;
    var i = Ao(!1), o;
    if (r)
      o = Xa(this, this.derivation, this.scope_);
    else if (A.disableErrorBoundaries === !0)
      o = this.derivation.call(this.scope_);
    else
      try {
        o = this.derivation.call(this.scope_);
      } catch (s) {
        o = new Er(s);
      }
    return To(i), this.isComputing = !1, o;
  }, t.suspend_ = function() {
    this.keepAlive_ || (Ui(this), this.value_ = void 0, w.NODE_ENV !== "production" && this.isTracing_ !== Ue.NONE && console.log("[mobx.trace] Computed value '" + this.name_ + "' was suspended and it will recompute on the next access."));
  }, t.observe_ = function(r, i) {
    var o = this, s = !0, a = void 0;
    return yd(function() {
      var l = o.get();
      if (!s || i) {
        var c = Wt();
        r({
          observableKind: "computed",
          debugObjectName: o.name_,
          type: We,
          object: o,
          newValue: l,
          oldValue: a
        }), pt(c);
      }
      s = !1, a = l;
    });
  }, t.warnAboutUntrackedRead_ = function() {
    w.NODE_ENV !== "production" && (this.isTracing_ !== Ue.NONE && console.log("[mobx.trace] Computed value '" + this.name_ + "' is being read outside a reactive context. Doing a full recompute."), (typeof this.requiresReaction_ == "boolean" ? this.requiresReaction_ : A.computedRequiresReaction) && console.warn("[mobx] Computed value '" + this.name_ + "' is being read outside a reactive context. Doing a full recompute."));
  }, t.toString = function() {
    return this.name_ + "[" + this.derivation.toString() + "]";
  }, t.valueOf = function() {
    return Ma(this.get());
  }, t[Symbol.toPrimitive] = function() {
    return this.valueOf();
  }, hn(e, [{
    key: "isComputing",
    get: function() {
      return Se(this.flags_, e.isComputingMask_);
    },
    set: function(r) {
      this.flags_ = Ne(this.flags_, e.isComputingMask_, r);
    }
  }, {
    key: "isRunningSetter",
    get: function() {
      return Se(this.flags_, e.isRunningSetterMask_);
    },
    set: function(r) {
      this.flags_ = Ne(this.flags_, e.isRunningSetterMask_, r);
    }
  }, {
    key: "isBeingObserved",
    get: function() {
      return Se(this.flags_, e.isBeingObservedMask_);
    },
    set: function(r) {
      this.flags_ = Ne(this.flags_, e.isBeingObservedMask_, r);
    }
  }, {
    key: "isPendingUnobservation",
    get: function() {
      return Se(this.flags_, e.isPendingUnobservationMask_);
    },
    set: function(r) {
      this.flags_ = Ne(this.flags_, e.isPendingUnobservationMask_, r);
    }
  }, {
    key: "diffValue",
    get: function() {
      return Se(this.flags_, e.diffValueMask_) ? 1 : 0;
    },
    set: function(r) {
      this.flags_ = Ne(this.flags_, e.diffValueMask_, r === 1);
    }
  }]);
}();
He.isComputingMask_ = 1;
He.isRunningSetterMask_ = 2;
He.isBeingObservedMask_ = 4;
He.isPendingUnobservationMask_ = 8;
He.diffValueMask_ = 16;
var Kr = /* @__PURE__ */ qt("ComputedValue", He), Y;
(function(e) {
  e[e.NOT_TRACKING_ = -1] = "NOT_TRACKING_", e[e.UP_TO_DATE_ = 0] = "UP_TO_DATE_", e[e.POSSIBLY_STALE_ = 1] = "POSSIBLY_STALE_", e[e.STALE_ = 2] = "STALE_";
})(Y || (Y = {}));
var Ue;
(function(e) {
  e[e.NONE = 0] = "NONE", e[e.LOG = 1] = "LOG", e[e.BREAK = 2] = "BREAK";
})(Ue || (Ue = {}));
var Er = function(t) {
  this.cause = void 0, this.cause = t;
};
function cr(e) {
  return e instanceof Er;
}
function Bi(e) {
  switch (e.dependenciesState_) {
    case Y.UP_TO_DATE_:
      return !1;
    case Y.NOT_TRACKING_:
    case Y.STALE_:
      return !0;
    case Y.POSSIBLY_STALE_: {
      for (var t = Ro(!0), n = Wt(), r = e.observing_, i = r.length, o = 0; o < i; o++) {
        var s = r[o];
        if (Kr(s)) {
          if (A.disableErrorBoundaries)
            s.get();
          else
            try {
              s.get();
            } catch {
              return pt(n), Sn(t), !0;
            }
          if (e.dependenciesState_ === Y.STALE_)
            return pt(n), Sn(t), !0;
        }
      }
      return Za(e), pt(n), Sn(t), !1;
    }
  }
}
function rt(e) {
  if (w.NODE_ENV !== "production") {
    var t = e.observers_.size > 0;
    !A.allowStateChanges && (t || A.enforceActions === "always") && console.warn("[MobX] " + (A.enforceActions ? "Since strict-mode is enabled, changing (observed) observable values without using an action is not allowed. Tried to modify: " : "Side effects like changing state are not allowed at this point. Are you trying to modify state from, for example, a computed value or the render function of a React component? You can wrap side effects in 'runInAction' (or decorate functions with 'action') if needed. Tried to modify: ") + e.name_);
  }
}
function od(e) {
  w.NODE_ENV !== "production" && !A.allowStateReads && A.observableRequiresReaction && console.warn("[mobx] Observable '" + e.name_ + "' being read outside a reactive context.");
}
function Xa(e, t, n) {
  var r = Ro(!0);
  Za(e), e.newObserving_ = new Array(
    // Reserve constant space for initial dependencies, dynamic space otherwise.
    // See https://github.com/mobxjs/mobx/pull/3833
    e.runId_ === 0 ? 100 : e.observing_.length
  ), e.unboundDepsCount_ = 0, e.runId_ = ++A.runId;
  var i = A.trackingDerivation;
  A.trackingDerivation = e, A.inBatch++;
  var o;
  if (A.disableErrorBoundaries === !0)
    o = t.call(n);
  else
    try {
      o = t.call(n);
    } catch (s) {
      o = new Er(s);
    }
  return A.inBatch--, A.trackingDerivation = i, ad(e), sd(e), Sn(r), o;
}
function sd(e) {
  w.NODE_ENV !== "production" && e.observing_.length === 0 && (typeof e.requiresObservable_ == "boolean" ? e.requiresObservable_ : A.reactionRequiresObservable) && console.warn("[mobx] Derivation '" + e.name_ + "' is created/updated without reading any observable value.");
}
function ad(e) {
  for (var t = e.observing_, n = e.observing_ = e.newObserving_, r = Y.UP_TO_DATE_, i = 0, o = e.unboundDepsCount_, s = 0; s < o; s++) {
    var a = n[s];
    a.diffValue === 0 && (a.diffValue = 1, i !== s && (n[i] = a), i++), a.dependenciesState_ > r && (r = a.dependenciesState_);
  }
  for (n.length = i, e.newObserving_ = null, o = t.length; o--; ) {
    var l = t[o];
    l.diffValue === 0 && el(l, e), l.diffValue = 0;
  }
  for (; i--; ) {
    var c = n[i];
    c.diffValue === 1 && (c.diffValue = 0, ud(c, e));
  }
  r !== Y.UP_TO_DATE_ && (e.dependenciesState_ = r, e.onBecomeStale_());
}
function Ui(e) {
  var t = e.observing_;
  e.observing_ = [];
  for (var n = t.length; n--; )
    el(t[n], e);
  e.dependenciesState_ = Y.NOT_TRACKING_;
}
function Qa(e) {
  var t = Wt();
  try {
    return e();
  } finally {
    pt(t);
  }
}
function Wt() {
  var e = A.trackingDerivation;
  return A.trackingDerivation = null, e;
}
function pt(e) {
  A.trackingDerivation = e;
}
function Ro(e) {
  var t = A.allowStateReads;
  return A.allowStateReads = e, t;
}
function Sn(e) {
  A.allowStateReads = e;
}
function Za(e) {
  if (e.dependenciesState_ !== Y.UP_TO_DATE_) {
    e.dependenciesState_ = Y.UP_TO_DATE_;
    for (var t = e.observing_, n = t.length; n--; )
      t[n].lowestObserverState_ = Y.UP_TO_DATE_;
  }
}
var fr = function() {
  this.version = 6, this.UNCHANGED = {}, this.trackingDerivation = null, this.trackingContext = null, this.runId = 0, this.mobxGuid = 0, this.inBatch = 0, this.pendingUnobservations = [], this.pendingReactions = [], this.isRunningReactions = !1, this.allowStateChanges = !1, this.allowStateReads = !0, this.enforceActions = !0, this.spyListeners = [], this.globalReactionErrorHandlers = [], this.computedRequiresReaction = !1, this.reactionRequiresObservable = !1, this.observableRequiresReaction = !1, this.disableErrorBoundaries = !1, this.suppressReactionErrors = !1, this.useProxies = !0, this.verifyProxies = !1, this.safeDescriptors = !0;
}, dr = !0, Ja = !1, A = /* @__PURE__ */ function() {
  var e = /* @__PURE__ */ kr();
  return e.__mobxInstanceCount > 0 && !e.__mobxGlobals && (dr = !1), e.__mobxGlobals && e.__mobxGlobals.version !== new fr().version && (dr = !1), dr ? e.__mobxGlobals ? (e.__mobxInstanceCount += 1, e.__mobxGlobals.UNCHANGED || (e.__mobxGlobals.UNCHANGED = {}), e.__mobxGlobals) : (e.__mobxInstanceCount = 1, e.__mobxGlobals = /* @__PURE__ */ new fr()) : (setTimeout(function() {
    Ja || C(35);
  }, 1), new fr());
}();
function ld() {
  if ((A.pendingReactions.length || A.inBatch || A.isRunningReactions) && C(36), Ja = !0, dr) {
    var e = kr();
    --e.__mobxInstanceCount === 0 && (e.__mobxGlobals = void 0), A = new fr();
  }
}
function ud(e, t) {
  e.observers_.add(t), e.lowestObserverState_ > t.dependenciesState_ && (e.lowestObserverState_ = t.dependenciesState_);
}
function el(e, t) {
  e.observers_.delete(t), e.observers_.size === 0 && tl(e);
}
function tl(e) {
  e.isPendingUnobservation === !1 && (e.isPendingUnobservation = !0, A.pendingUnobservations.push(e));
}
function Me() {
  A.inBatch++;
}
function je() {
  if (--A.inBatch === 0) {
    sl();
    for (var e = A.pendingUnobservations, t = 0; t < e.length; t++) {
      var n = e[t];
      n.isPendingUnobservation = !1, n.observers_.size === 0 && (n.isBeingObserved && (n.isBeingObserved = !1, n.onBUO()), n instanceof He && n.suspend_());
    }
    A.pendingUnobservations = [];
  }
}
function nl(e) {
  od(e);
  var t = A.trackingDerivation;
  return t !== null ? (t.runId_ !== e.lastAccessedBy_ && (e.lastAccessedBy_ = t.runId_, t.newObserving_[t.unboundDepsCount_++] = e, !e.isBeingObserved && A.trackingContext && (e.isBeingObserved = !0, e.onBO())), e.isBeingObserved) : (e.observers_.size === 0 && A.inBatch > 0 && tl(e), !1);
}
function rl(e) {
  e.lowestObserverState_ !== Y.STALE_ && (e.lowestObserverState_ = Y.STALE_, e.observers_.forEach(function(t) {
    t.dependenciesState_ === Y.UP_TO_DATE_ && (w.NODE_ENV !== "production" && t.isTracing_ !== Ue.NONE && il(t, e), t.onBecomeStale_()), t.dependenciesState_ = Y.STALE_;
  }));
}
function cd(e) {
  e.lowestObserverState_ !== Y.STALE_ && (e.lowestObserverState_ = Y.STALE_, e.observers_.forEach(function(t) {
    t.dependenciesState_ === Y.POSSIBLY_STALE_ ? (t.dependenciesState_ = Y.STALE_, w.NODE_ENV !== "production" && t.isTracing_ !== Ue.NONE && il(t, e)) : t.dependenciesState_ === Y.UP_TO_DATE_ && (e.lowestObserverState_ = Y.UP_TO_DATE_);
  }));
}
function fd(e) {
  e.lowestObserverState_ === Y.UP_TO_DATE_ && (e.lowestObserverState_ = Y.POSSIBLY_STALE_, e.observers_.forEach(function(t) {
    t.dependenciesState_ === Y.UP_TO_DATE_ && (t.dependenciesState_ = Y.POSSIBLY_STALE_, t.onBecomeStale_());
  }));
}
function il(e, t) {
  if (console.log("[mobx.trace] '" + e.name_ + "' is invalidated due to a change in: '" + t.name_ + "'"), e.isTracing_ === Ue.BREAK) {
    var n = [];
    ol(pl(e), n, 1), new Function(`debugger;
/*
Tracing '` + e.name_ + `'

You are entering this break point because derivation '` + e.name_ + "' is being traced and '" + t.name_ + `' is now forcing it to update.
Just follow the stacktrace you should now see in the devtools to see precisely what piece of your code is causing this update
The stackframe you are looking for is at least ~6-8 stack-frames up.

` + (e instanceof He ? e.derivation.toString().replace(/[*]\//g, "/") : "") + `

The dependencies for this derivation are:

` + n.join(`
`) + `
*/
    `)();
  }
}
function ol(e, t, n) {
  if (t.length >= 1e3) {
    t.push("(and many more)");
    return;
  }
  t.push("" + "	".repeat(n - 1) + e.name), e.dependencies && e.dependencies.forEach(function(r) {
    return ol(r, t, n + 1);
  });
}
var gt = /* @__PURE__ */ function() {
  function e(n, r, i, o) {
    n === void 0 && (n = w.NODE_ENV !== "production" ? "Reaction@" + Je() : "Reaction"), this.name_ = void 0, this.onInvalidate_ = void 0, this.errorHandler_ = void 0, this.requiresObservable_ = void 0, this.observing_ = [], this.newObserving_ = [], this.dependenciesState_ = Y.NOT_TRACKING_, this.runId_ = 0, this.unboundDepsCount_ = 0, this.flags_ = 0, this.isTracing_ = Ue.NONE, this.name_ = n, this.onInvalidate_ = r, this.errorHandler_ = i, this.requiresObservable_ = o;
  }
  var t = e.prototype;
  return t.onBecomeStale_ = function() {
    this.schedule_();
  }, t.schedule_ = function() {
    this.isScheduled || (this.isScheduled = !0, A.pendingReactions.push(this), sl());
  }, t.runReaction_ = function() {
    if (!this.isDisposed) {
      Me(), this.isScheduled = !1;
      var r = A.trackingContext;
      if (A.trackingContext = this, Bi(this)) {
        this.isTrackPending = !0;
        try {
          this.onInvalidate_(), w.NODE_ENV !== "production" && this.isTrackPending && ge() && Bt({
            name: this.name_,
            type: "scheduled-reaction"
          });
        } catch (i) {
          this.reportExceptionInDerivation_(i);
        }
      }
      A.trackingContext = r, je();
    }
  }, t.track = function(r) {
    if (!this.isDisposed) {
      Me();
      var i = ge(), o;
      w.NODE_ENV !== "production" && i && (o = Date.now(), Ae({
        name: this.name_,
        type: "reaction"
      })), this.isRunning = !0;
      var s = A.trackingContext;
      A.trackingContext = this;
      var a = Xa(this, r, void 0);
      A.trackingContext = s, this.isRunning = !1, this.isTrackPending = !1, this.isDisposed && Ui(this), cr(a) && this.reportExceptionInDerivation_(a.cause), w.NODE_ENV !== "production" && i && Te({
        time: Date.now() - o
      }), je();
    }
  }, t.reportExceptionInDerivation_ = function(r) {
    var i = this;
    if (this.errorHandler_) {
      this.errorHandler_(r, this);
      return;
    }
    if (A.disableErrorBoundaries)
      throw r;
    var o = w.NODE_ENV !== "production" ? "[mobx] Encountered an uncaught exception that was thrown by a reaction or observer component, in: '" + this + "'" : "[mobx] uncaught error in '" + this + "'";
    A.suppressReactionErrors ? w.NODE_ENV !== "production" && console.warn("[mobx] (error in reaction '" + this.name_ + "' suppressed, fix error of causing action below)") : console.error(o, r), w.NODE_ENV !== "production" && ge() && Bt({
      type: "error",
      name: this.name_,
      message: o,
      error: "" + r
    }), A.globalReactionErrorHandlers.forEach(function(s) {
      return s(r, i);
    });
  }, t.dispose = function() {
    this.isDisposed || (this.isDisposed = !0, this.isRunning || (Me(), Ui(this), je()));
  }, t.getDisposer_ = function(r) {
    var i = this, o = function s() {
      i.dispose(), r == null || r.removeEventListener == null || r.removeEventListener("abort", s);
    };
    return r == null || r.addEventListener == null || r.addEventListener("abort", o), o[F] = this, o;
  }, t.toString = function() {
    return "Reaction[" + this.name_ + "]";
  }, t.trace = function(r) {
    r === void 0 && (r = !1), Ld(this, r);
  }, hn(e, [{
    key: "isDisposed",
    get: function() {
      return Se(this.flags_, e.isDisposedMask_);
    },
    set: function(r) {
      this.flags_ = Ne(this.flags_, e.isDisposedMask_, r);
    }
  }, {
    key: "isScheduled",
    get: function() {
      return Se(this.flags_, e.isScheduledMask_);
    },
    set: function(r) {
      this.flags_ = Ne(this.flags_, e.isScheduledMask_, r);
    }
  }, {
    key: "isTrackPending",
    get: function() {
      return Se(this.flags_, e.isTrackPendingMask_);
    },
    set: function(r) {
      this.flags_ = Ne(this.flags_, e.isTrackPendingMask_, r);
    }
  }, {
    key: "isRunning",
    get: function() {
      return Se(this.flags_, e.isRunningMask_);
    },
    set: function(r) {
      this.flags_ = Ne(this.flags_, e.isRunningMask_, r);
    }
  }, {
    key: "diffValue",
    get: function() {
      return Se(this.flags_, e.diffValueMask_) ? 1 : 0;
    },
    set: function(r) {
      this.flags_ = Ne(this.flags_, e.diffValueMask_, r === 1);
    }
  }]);
}();
gt.isDisposedMask_ = 1;
gt.isScheduledMask_ = 2;
gt.isTrackPendingMask_ = 4;
gt.isRunningMask_ = 8;
gt.diffValueMask_ = 16;
var hs = 100, Hi = function(t) {
  return t();
};
function sl() {
  A.inBatch > 0 || A.isRunningReactions || Hi(dd);
}
function dd() {
  A.isRunningReactions = !0;
  for (var e = A.pendingReactions, t = 0; e.length > 0; ) {
    ++t === hs && (console.error(w.NODE_ENV !== "production" ? "Reaction doesn't converge to a stable state after " + hs + " iterations." + (" Probably there is a cycle in the reactive function: " + e[0]) : "[mobx] cycle in reaction: " + e[0]), e.splice(0));
    for (var n = e.splice(0), r = 0, i = n.length; r < i; r++)
      n[r].runReaction_();
  }
  A.isRunningReactions = !1;
}
var Or = /* @__PURE__ */ qt("Reaction", gt);
function pd(e) {
  var t = Hi;
  Hi = function(r) {
    return e(function() {
      return t(r);
    });
  };
}
function ge() {
  return w.NODE_ENV !== "production" && !!A.spyListeners.length;
}
function Bt(e) {
  if (w.NODE_ENV !== "production" && A.spyListeners.length)
    for (var t = A.spyListeners, n = 0, r = t.length; n < r; n++)
      t[n](e);
}
function Ae(e) {
  if (w.NODE_ENV !== "production") {
    var t = vt({}, e, {
      spyReportStart: !0
    });
    Bt(t);
  }
}
var hd = {
  type: "report-end",
  spyReportEnd: !0
};
function Te(e) {
  w.NODE_ENV !== "production" && Bt(e ? vt({}, e, {
    type: "report-end",
    spyReportEnd: !0
  }) : hd);
}
function vd(e) {
  return w.NODE_ENV === "production" ? (console.warn("[mobx.spy] Is a no-op in production builds"), function() {
  }) : (A.spyListeners.push(e), So(function() {
    A.spyListeners = A.spyListeners.filter(function(t) {
      return t !== e;
    });
  }));
}
var Co = "action", gd = "action.bound", al = "autoAction", md = "autoAction.bound", ll = "<unnamed action>", Gi = /* @__PURE__ */ Wn(Co), bd = /* @__PURE__ */ Wn(gd, {
  bound: !0
}), qi = /* @__PURE__ */ Wn(al, {
  autoAction: !0
}), _d = /* @__PURE__ */ Wn(md, {
  autoAction: !0,
  bound: !0
});
function ul(e) {
  var t = function(r, i) {
    if (ce(r))
      return kt(r.name || ll, r, e);
    if (ce(i))
      return kt(r, i, e);
    if (qn(i))
      return (e ? qi : Gi).decorate_20223_(r, i);
    if (Mt(i))
      return Gn(r, i, e ? qi : Gi);
    if (Mt(r))
      return ot(Wn(e ? al : Co, {
        name: r,
        autoAction: e
      }));
    w.NODE_ENV !== "production" && C("Invalid arguments for `action`");
  };
  return t;
}
var rn = /* @__PURE__ */ ul(!1);
Object.assign(rn, Gi);
var Cn = /* @__PURE__ */ ul(!0);
Object.assign(Cn, qi);
rn.bound = /* @__PURE__ */ ot(bd);
Cn.bound = /* @__PURE__ */ ot(_d);
function ci(e) {
  return Ya(e.name || ll, !1, e, this, void 0);
}
function ln(e) {
  return ce(e) && e.isMobxAction === !0;
}
function yd(e, t) {
  var n, r, i, o;
  t === void 0 && (t = La), w.NODE_ENV !== "production" && (ce(e) || C("Autorun expects a function as first argument"), ln(e) && C("Autorun does not accept actions since actions are untrackable"));
  var s = (n = (r = t) == null ? void 0 : r.name) != null ? n : w.NODE_ENV !== "production" ? e.name || "Autorun@" + Je() : "Autorun", a = !t.scheduler && !t.delay, l;
  if (a)
    l = new gt(s, function() {
      this.track(f);
    }, t.onError, t.requiresObservable);
  else {
    var c = Od(t), u = !1;
    l = new gt(s, function() {
      u || (u = !0, c(function() {
        u = !1, l.isDisposed || l.track(f);
      }));
    }, t.onError, t.requiresObservable);
  }
  function f() {
    e(l);
  }
  return (i = t) != null && (i = i.signal) != null && i.aborted || l.schedule_(), l.getDisposer_((o = t) == null ? void 0 : o.signal);
}
var Ed = function(t) {
  return t();
};
function Od(e) {
  return e.scheduler ? e.scheduler : e.delay ? function(t) {
    return setTimeout(t, e.delay);
  } : Ed;
}
var wd = "onBO", Sd = "onBUO";
function Nd(e, t, n) {
  return fl(wd, e, t, n);
}
function cl(e, t, n) {
  return fl(Sd, e, t, n);
}
function fl(e, t, n, r) {
  var i = cn(t), o = ce(r) ? r : n, s = e + "L";
  return i[s] ? i[s].add(o) : i[s] = /* @__PURE__ */ new Set([o]), function() {
    var a = i[s];
    a && (a.delete(o), a.size === 0 && delete i[s]);
  };
}
var xd = "never", ir = "always", Ad = "observed";
function Td(e) {
  e.isolateGlobalState === !0 && ld();
  var t = e.useProxies, n = e.enforceActions;
  if (t !== void 0 && (A.useProxies = t === ir ? !0 : t === xd ? !1 : typeof Proxy < "u"), t === "ifavailable" && (A.verifyProxies = !0), n !== void 0) {
    var r = n === ir ? ir : n === Ad;
    A.enforceActions = r, A.allowStateChanges = !(r === !0 || r === ir);
  }
  ["computedRequiresReaction", "reactionRequiresObservable", "observableRequiresReaction", "disableErrorBoundaries", "safeDescriptors"].forEach(function(i) {
    i in e && (A[i] = !!e[i]);
  }), A.allowStateReads = !A.observableRequiresReaction, w.NODE_ENV !== "production" && A.disableErrorBoundaries === !0 && console.warn("WARNING: Debug feature only. MobX will NOT recover from errors when `disableErrorBoundaries` is enabled."), e.reactionScheduler && pd(e.reactionScheduler);
}
function dl(e, t, n, r) {
  w.NODE_ENV !== "production" && (arguments.length > 4 && C("'extendObservable' expected 2-4 arguments"), typeof e != "object" && C("'extendObservable' expects an object as first argument"), At(e) && C("'extendObservable' should not be used on maps, use map.merge instead"), xe(t) || C("'extendObservable' only accepts plain objects as second argument"), ($n(t) || $n(n)) && C("Extending an object with another observable (object) is not supported"));
  var i = uf(t);
  return Tt(function() {
    var o = Kt(e, r)[F];
    an(i).forEach(function(s) {
      o.extend_(
        s,
        i[s],
        // must pass "undefined" for { key: undefined }
        n && s in n ? n[s] : !0
      );
    });
  }), e;
}
function pl(e, t) {
  return hl(cn(e, t));
}
function hl(e) {
  var t = {
    name: e.name_
  };
  return e.observing_ && e.observing_.length > 0 && (t.dependencies = Rd(e.observing_).map(hl)), t;
}
function Rd(e) {
  return Array.from(new Set(e));
}
var Cd = 0;
function vl() {
  this.message = "FLOW_CANCELLED";
}
vl.prototype = /* @__PURE__ */ Object.create(Error.prototype);
var fi = /* @__PURE__ */ Ua("flow"), Dd = /* @__PURE__ */ Ua("flow.bound", {
  bound: !0
}), un = /* @__PURE__ */ Object.assign(function(t, n) {
  if (qn(n))
    return fi.decorate_20223_(t, n);
  if (Mt(n))
    return Gn(t, n, fi);
  w.NODE_ENV !== "production" && arguments.length !== 1 && C("Flow expects single argument with generator function");
  var r = t, i = r.name || "<unnamed flow>", o = function() {
    var a = this, l = arguments, c = ++Cd, u = rn(i + " - runid: " + c + " - init", r).apply(a, l), f, h = void 0, d = new Promise(function(p, g) {
      var b = 0;
      f = g;
      function O(S) {
        h = void 0;
        var x;
        try {
          x = rn(i + " - runid: " + c + " - yield " + b++, u.next).call(u, S);
        } catch (y) {
          return g(y);
        }
        E(x);
      }
      function _(S) {
        h = void 0;
        var x;
        try {
          x = rn(i + " - runid: " + c + " - yield " + b++, u.throw).call(u, S);
        } catch (y) {
          return g(y);
        }
        E(x);
      }
      function E(S) {
        if (ce(S == null ? void 0 : S.then)) {
          S.then(E, g);
          return;
        }
        return S.done ? p(S.value) : (h = Promise.resolve(S.value), h.then(O, _));
      }
      O(void 0);
    });
    return d.cancel = rn(i + " - runid: " + c + " - cancel", function() {
      try {
        h && vs(h);
        var p = u.return(void 0), g = Promise.resolve(p.value);
        g.then(tn, tn), vs(g), f(new vl());
      } catch (b) {
        f(b);
      }
    }), d;
  };
  return o.isMobXFlow = !0, o;
}, fi);
un.bound = /* @__PURE__ */ ot(Dd);
function vs(e) {
  ce(e.cancel) && e.cancel();
}
function Dn(e) {
  return (e == null ? void 0 : e.isMobXFlow) === !0;
}
function $d(e, t) {
  return e ? vn(e) || !!e[F] || No(e) || Or(e) || Kr(e) : !1;
}
function $n(e) {
  return w.NODE_ENV !== "production" && arguments.length !== 1 && C("isObservable expects only 1 argument. Use isObservableProp to inspect the observability of a property"), $d(e);
}
function Ld() {
  if (w.NODE_ENV !== "production") {
    for (var e = !1, t = arguments.length, n = new Array(t), r = 0; r < t; r++)
      n[r] = arguments[r];
    typeof n[n.length - 1] == "boolean" && (e = n.pop());
    var i = Pd(n);
    if (!i)
      return C("'trace(break?)' can only be used inside a tracked computed value or a Reaction. Consider passing in the computed value or reaction explicitly");
    i.isTracing_ === Ue.NONE && console.log("[mobx.trace] '" + i.name_ + "' tracing enabled"), i.isTracing_ = e ? Ue.BREAK : Ue.LOG;
  }
}
function Pd(e) {
  switch (e.length) {
    case 0:
      return A.trackingDerivation;
    case 1:
      return cn(e[0]);
    case 2:
      return cn(e[0], e[1]);
  }
}
function ft(e, t) {
  t === void 0 && (t = void 0), Me();
  try {
    return e.apply(t);
  } finally {
    je();
  }
}
function Dt(e) {
  return e[F];
}
var Id = {
  has: function(t, n) {
    return w.NODE_ENV !== "production" && A.trackingDerivation && On("detect new properties using the 'in' operator. Use 'has' from 'mobx' instead."), Dt(t).has_(n);
  },
  get: function(t, n) {
    return Dt(t).get_(n);
  },
  set: function(t, n, r) {
    var i;
    return Mt(n) ? (w.NODE_ENV !== "production" && !Dt(t).values_.has(n) && On("add a new observable property through direct assignment. Use 'set' from 'mobx' instead."), (i = Dt(t).set_(n, r, !0)) != null ? i : !0) : !1;
  },
  deleteProperty: function(t, n) {
    var r;
    return w.NODE_ENV !== "production" && On("delete properties from an observable object. Use 'remove' from 'mobx' instead."), Mt(n) ? (r = Dt(t).delete_(n, !0)) != null ? r : !0 : !1;
  },
  defineProperty: function(t, n, r) {
    var i;
    return w.NODE_ENV !== "production" && On("define property on an observable object. Use 'defineProperty' from 'mobx' instead."), (i = Dt(t).defineProperty_(n, r)) != null ? i : !0;
  },
  ownKeys: function(t) {
    return w.NODE_ENV !== "production" && A.trackingDerivation && On("iterate keys to detect added / removed properties. Use 'keys' from 'mobx' instead."), Dt(t).ownKeys_();
  },
  preventExtensions: function(t) {
    C(13);
  }
};
function Vd(e, t) {
  var n, r;
  return Pa(), e = Kt(e, t), (r = (n = e[F]).proxy_) != null ? r : n.proxy_ = new Proxy(e, Id);
}
function Ie(e) {
  return e.interceptors_ !== void 0 && e.interceptors_.length > 0;
}
function Kn(e, t) {
  var n = e.interceptors_ || (e.interceptors_ = []);
  return n.push(t), So(function() {
    var r = n.indexOf(t);
    r !== -1 && n.splice(r, 1);
  });
}
function Ve(e, t) {
  var n = Wt();
  try {
    for (var r = [].concat(e.interceptors_ || []), i = 0, o = r.length; i < o && (t = r[i](t), t && !t.type && C(14), !!t); i++)
      ;
    return t;
  } finally {
    pt(n);
  }
}
function Ye(e) {
  return e.changeListeners_ !== void 0 && e.changeListeners_.length > 0;
}
function zn(e, t) {
  var n = e.changeListeners_ || (e.changeListeners_ = []);
  return n.push(t), So(function() {
    var r = n.indexOf(t);
    r !== -1 && n.splice(r, 1);
  });
}
function Xe(e, t) {
  var n = Wt(), r = e.changeListeners_;
  if (r) {
    r = r.slice();
    for (var i = 0, o = r.length; i < o; i++)
      r[i](t);
    pt(n);
  }
}
function Fd(e, t, n) {
  return Tt(function() {
    var r, i = Kt(e, n)[F];
    w.NODE_ENV !== "production" && t && e[Ee] && C("makeObservable second arg must be nullish when using decorators. Mixing @decorator syntax with annotations is not supported."), (r = t) != null || (t = vf(e)), an(t).forEach(function(o) {
      return i.make_(o, t[o]);
    });
  }), e;
}
var di = /* @__PURE__ */ Symbol("mobx-keys");
function gl(e, t, n) {
  return w.NODE_ENV !== "production" && (!xe(e) && !xe(Object.getPrototypeOf(e)) && C("'makeAutoObservable' can only be used for classes that don't have a superclass"), vn(e) && C("makeAutoObservable can only be used on objects not already made observable")), xe(e) ? dl(e, e, t, n) : (Tt(function() {
    var r = Kt(e, n)[F];
    if (!e[di]) {
      var i = Object.getPrototypeOf(e), o = new Set([].concat(an(e), an(i)));
      o.delete("constructor"), o.delete(F), Hn(i, di, o);
    }
    e[di].forEach(function(s) {
      return r.make_(
        s,
        // must pass "undefined" for { key: undefined }
        t && s in t ? t[s] : !0
      );
    });
  }), e);
}
var gs = "splice", We = "update", Md = 1e4, jd = {
  get: function(t, n) {
    var r = t[F];
    return n === F ? r : n === "length" ? r.getArrayLength_() : typeof n == "string" && !isNaN(n) ? r.get_(parseInt(n)) : Be(wr, n) ? wr[n] : t[n];
  },
  set: function(t, n, r) {
    var i = t[F];
    return n === "length" && i.setArrayLength_(r), typeof n == "symbol" || isNaN(n) ? t[n] = r : i.set_(parseInt(n), r), !0;
  },
  preventExtensions: function() {
    C(15);
  }
}, Do = /* @__PURE__ */ function() {
  function e(n, r, i, o) {
    n === void 0 && (n = w.NODE_ENV !== "production" ? "ObservableArray@" + Je() : "ObservableArray"), this.owned_ = void 0, this.legacyMode_ = void 0, this.atom_ = void 0, this.values_ = [], this.interceptors_ = void 0, this.changeListeners_ = void 0, this.enhancer_ = void 0, this.dehancer = void 0, this.proxy_ = void 0, this.lastKnownLength_ = 0, this.owned_ = i, this.legacyMode_ = o, this.atom_ = new xt(n), this.enhancer_ = function(s, a) {
      return r(s, a, w.NODE_ENV !== "production" ? n + "[..]" : "ObservableArray[..]");
    };
  }
  var t = e.prototype;
  return t.dehanceValue_ = function(r) {
    return this.dehancer !== void 0 ? this.dehancer(r) : r;
  }, t.dehanceValues_ = function(r) {
    return this.dehancer !== void 0 && r.length > 0 ? r.map(this.dehancer) : r;
  }, t.intercept_ = function(r) {
    return Kn(this, r);
  }, t.observe_ = function(r, i) {
    return i === void 0 && (i = !1), i && r({
      observableKind: "array",
      object: this.proxy_,
      debugObjectName: this.atom_.name_,
      type: "splice",
      index: 0,
      added: this.values_.slice(),
      addedCount: this.values_.length,
      removed: [],
      removedCount: 0
    }), zn(this, r);
  }, t.getArrayLength_ = function() {
    return this.atom_.reportObserved(), this.values_.length;
  }, t.setArrayLength_ = function(r) {
    (typeof r != "number" || isNaN(r) || r < 0) && C("Out of range: " + r);
    var i = this.values_.length;
    if (r !== i)
      if (r > i) {
        for (var o = new Array(r - i), s = 0; s < r - i; s++)
          o[s] = void 0;
        this.spliceWithArray_(i, 0, o);
      } else
        this.spliceWithArray_(r, i - r);
  }, t.updateArrayLength_ = function(r, i) {
    r !== this.lastKnownLength_ && C(16), this.lastKnownLength_ += i, this.legacyMode_ && i > 0 && Ol(r + i + 1);
  }, t.spliceWithArray_ = function(r, i, o) {
    var s = this;
    rt(this.atom_);
    var a = this.values_.length;
    if (r === void 0 ? r = 0 : r > a ? r = a : r < 0 && (r = Math.max(0, a + r)), arguments.length === 1 ? i = a - r : i == null ? i = 0 : i = Math.max(0, Math.min(i, a - r)), o === void 0 && (o = mr), Ie(this)) {
      var l = Ve(this, {
        object: this.proxy_,
        type: gs,
        index: r,
        removedCount: i,
        added: o
      });
      if (!l)
        return mr;
      i = l.removedCount, o = l.added;
    }
    if (o = o.length === 0 ? o : o.map(function(f) {
      return s.enhancer_(f, void 0);
    }), this.legacyMode_ || w.NODE_ENV !== "production") {
      var c = o.length - i;
      this.updateArrayLength_(a, c);
    }
    var u = this.spliceItemsIntoValues_(r, i, o);
    return (i !== 0 || o.length !== 0) && this.notifyArraySplice_(r, o, u), this.dehanceValues_(u);
  }, t.spliceItemsIntoValues_ = function(r, i, o) {
    if (o.length < Md) {
      var s;
      return (s = this.values_).splice.apply(s, [r, i].concat(o));
    } else {
      var a = this.values_.slice(r, r + i), l = this.values_.slice(r + i);
      this.values_.length += o.length - i;
      for (var c = 0; c < o.length; c++)
        this.values_[r + c] = o[c];
      for (var u = 0; u < l.length; u++)
        this.values_[r + o.length + u] = l[u];
      return a;
    }
  }, t.notifyArrayChildUpdate_ = function(r, i, o) {
    var s = !this.owned_ && ge(), a = Ye(this), l = a || s ? {
      observableKind: "array",
      object: this.proxy_,
      type: We,
      debugObjectName: this.atom_.name_,
      index: r,
      newValue: i,
      oldValue: o
    } : null;
    w.NODE_ENV !== "production" && s && Ae(l), this.atom_.reportChanged(), a && Xe(this, l), w.NODE_ENV !== "production" && s && Te();
  }, t.notifyArraySplice_ = function(r, i, o) {
    var s = !this.owned_ && ge(), a = Ye(this), l = a || s ? {
      observableKind: "array",
      object: this.proxy_,
      debugObjectName: this.atom_.name_,
      type: gs,
      index: r,
      removed: o,
      added: i,
      removedCount: o.length,
      addedCount: i.length
    } : null;
    w.NODE_ENV !== "production" && s && Ae(l), this.atom_.reportChanged(), a && Xe(this, l), w.NODE_ENV !== "production" && s && Te();
  }, t.get_ = function(r) {
    if (this.legacyMode_ && r >= this.values_.length) {
      console.warn(w.NODE_ENV !== "production" ? "[mobx.array] Attempt to read an array index (" + r + ") that is out of bounds (" + this.values_.length + "). Please check length first. Out of bound indices will not be tracked by MobX" : "[mobx] Out of bounds read: " + r);
      return;
    }
    return this.atom_.reportObserved(), this.dehanceValue_(this.values_[r]);
  }, t.set_ = function(r, i) {
    var o = this.values_;
    if (this.legacyMode_ && r > o.length && C(17, r, o.length), r < o.length) {
      rt(this.atom_);
      var s = o[r];
      if (Ie(this)) {
        var a = Ve(this, {
          type: We,
          object: this.proxy_,
          // since "this" is the real array we need to pass its proxy
          index: r,
          newValue: i
        });
        if (!a)
          return;
        i = a.newValue;
      }
      i = this.enhancer_(i, s);
      var l = i !== s;
      l && (o[r] = i, this.notifyArrayChildUpdate_(r, i, s));
    } else {
      for (var c = new Array(r + 1 - o.length), u = 0; u < c.length - 1; u++)
        c[u] = void 0;
      c[c.length - 1] = i, this.spliceWithArray_(o.length, 0, c);
    }
  }, e;
}();
function kd(e, t, n, r) {
  return n === void 0 && (n = w.NODE_ENV !== "production" ? "ObservableArray@" + Je() : "ObservableArray"), r === void 0 && (r = !1), Pa(), Tt(function() {
    var i = new Do(n, t, r, !1);
    Va(i.values_, F, i);
    var o = new Proxy(i.values_, jd);
    return i.proxy_ = o, e && e.length && i.spliceWithArray_(0, 0, e), o;
  });
}
var wr = {
  clear: function() {
    return this.splice(0);
  },
  replace: function(t) {
    var n = this[F];
    return n.spliceWithArray_(0, n.values_.length, t);
  },
  // Used by JSON.stringify
  toJSON: function() {
    return this.slice();
  },
  /*
   * functions that do alter the internal structure of the array, (based on lib.es6.d.ts)
   * since these functions alter the inner structure of the array, the have side effects.
   * Because the have side effects, they should not be used in computed function,
   * and for that reason the do not call dependencyState.notifyObserved
   */
  splice: function(t, n) {
    for (var r = arguments.length, i = new Array(r > 2 ? r - 2 : 0), o = 2; o < r; o++)
      i[o - 2] = arguments[o];
    var s = this[F];
    switch (arguments.length) {
      case 0:
        return [];
      case 1:
        return s.spliceWithArray_(t);
      case 2:
        return s.spliceWithArray_(t, n);
    }
    return s.spliceWithArray_(t, n, i);
  },
  spliceWithArray: function(t, n, r) {
    return this[F].spliceWithArray_(t, n, r);
  },
  push: function() {
    for (var t = this[F], n = arguments.length, r = new Array(n), i = 0; i < n; i++)
      r[i] = arguments[i];
    return t.spliceWithArray_(t.values_.length, 0, r), t.values_.length;
  },
  pop: function() {
    return this.splice(Math.max(this[F].values_.length - 1, 0), 1)[0];
  },
  shift: function() {
    return this.splice(0, 1)[0];
  },
  unshift: function() {
    for (var t = this[F], n = arguments.length, r = new Array(n), i = 0; i < n; i++)
      r[i] = arguments[i];
    return t.spliceWithArray_(0, 0, r), t.values_.length;
  },
  reverse: function() {
    return A.trackingDerivation && C(37, "reverse"), this.replace(this.slice().reverse()), this;
  },
  sort: function() {
    A.trackingDerivation && C(37, "sort");
    var t = this.slice();
    return t.sort.apply(t, arguments), this.replace(t), this;
  },
  remove: function(t) {
    var n = this[F], r = n.dehanceValues_(n.values_).indexOf(t);
    return r > -1 ? (this.splice(r, 1), !0) : !1;
  }
};
ee("at", Ce);
ee("concat", Ce);
ee("flat", Ce);
ee("includes", Ce);
ee("indexOf", Ce);
ee("join", Ce);
ee("lastIndexOf", Ce);
ee("slice", Ce);
ee("toString", Ce);
ee("toLocaleString", Ce);
ee("toSorted", Ce);
ee("toSpliced", Ce);
ee("with", Ce);
ee("every", et);
ee("filter", et);
ee("find", et);
ee("findIndex", et);
ee("findLast", et);
ee("findLastIndex", et);
ee("flatMap", et);
ee("forEach", et);
ee("map", et);
ee("some", et);
ee("toReversed", et);
ee("reduce", ml);
ee("reduceRight", ml);
function ee(e, t) {
  typeof Array.prototype[e] == "function" && (wr[e] = t(e));
}
function Ce(e) {
  return function() {
    var t = this[F];
    t.atom_.reportObserved();
    var n = t.dehanceValues_(t.values_);
    return n[e].apply(n, arguments);
  };
}
function et(e) {
  return function(t, n) {
    var r = this, i = this[F];
    i.atom_.reportObserved();
    var o = i.dehanceValues_(i.values_);
    return o[e](function(s, a) {
      return t.call(n, s, a, r);
    });
  };
}
function ml(e) {
  return function() {
    var t = this, n = this[F];
    n.atom_.reportObserved();
    var r = n.dehanceValues_(n.values_), i = arguments[0];
    return arguments[0] = function(o, s, a) {
      return i(o, s, a, t);
    }, r[e].apply(r, arguments);
  };
}
var Bd = /* @__PURE__ */ qt("ObservableArrayAdministration", Do);
function zr(e) {
  return Ur(e) && Bd(e[F]);
}
var Ud = {}, Et = "add", Sr = "delete", bl = /* @__PURE__ */ function() {
  function e(n, r, i) {
    var o = this;
    r === void 0 && (r = jt), i === void 0 && (i = w.NODE_ENV !== "production" ? "ObservableMap@" + Je() : "ObservableMap"), this.enhancer_ = void 0, this.name_ = void 0, this[F] = Ud, this.data_ = void 0, this.hasMap_ = void 0, this.keysAtom_ = void 0, this.interceptors_ = void 0, this.changeListeners_ = void 0, this.dehancer = void 0, this.enhancer_ = r, this.name_ = i, ce(Map) || C(18), Tt(function() {
      o.keysAtom_ = ka(w.NODE_ENV !== "production" ? o.name_ + ".keys()" : "ObservableMap.keys()"), o.data_ = /* @__PURE__ */ new Map(), o.hasMap_ = /* @__PURE__ */ new Map(), n && o.merge(n);
    });
  }
  var t = e.prototype;
  return t.has_ = function(r) {
    return this.data_.has(r);
  }, t.has = function(r) {
    var i = this;
    if (!A.trackingDerivation)
      return this.has_(r);
    var o = this.hasMap_.get(r);
    if (!o) {
      var s = o = new Vt(this.has_(r), Gr, w.NODE_ENV !== "production" ? this.name_ + "." + Fi(r) + "?" : "ObservableMap.key?", !1);
      this.hasMap_.set(r, s), cl(s, function() {
        return i.hasMap_.delete(r);
      });
    }
    return o.get();
  }, t.set = function(r, i) {
    var o = this.has_(r);
    if (Ie(this)) {
      var s = Ve(this, {
        type: o ? We : Et,
        object: this,
        newValue: i,
        name: r
      });
      if (!s)
        return this;
      i = s.newValue;
    }
    return o ? this.updateValue_(r, i) : this.addValue_(r, i), this;
  }, t.delete = function(r) {
    var i = this;
    if (rt(this.keysAtom_), Ie(this)) {
      var o = Ve(this, {
        type: Sr,
        object: this,
        name: r
      });
      if (!o)
        return !1;
    }
    if (this.has_(r)) {
      var s = ge(), a = Ye(this), l = a || s ? {
        observableKind: "map",
        debugObjectName: this.name_,
        type: Sr,
        object: this,
        oldValue: this.data_.get(r).value_,
        name: r
      } : null;
      return w.NODE_ENV !== "production" && s && Ae(l), ft(function() {
        var c;
        i.keysAtom_.reportChanged(), (c = i.hasMap_.get(r)) == null || c.setNewValue_(!1);
        var u = i.data_.get(r);
        u.setNewValue_(void 0), i.data_.delete(r);
      }), a && Xe(this, l), w.NODE_ENV !== "production" && s && Te(), !0;
    }
    return !1;
  }, t.updateValue_ = function(r, i) {
    var o = this.data_.get(r);
    if (i = o.prepareNewValue_(i), i !== A.UNCHANGED) {
      var s = ge(), a = Ye(this), l = a || s ? {
        observableKind: "map",
        debugObjectName: this.name_,
        type: We,
        object: this,
        oldValue: o.value_,
        name: r,
        newValue: i
      } : null;
      w.NODE_ENV !== "production" && s && Ae(l), o.setNewValue_(i), a && Xe(this, l), w.NODE_ENV !== "production" && s && Te();
    }
  }, t.addValue_ = function(r, i) {
    var o = this;
    rt(this.keysAtom_), ft(function() {
      var c, u = new Vt(i, o.enhancer_, w.NODE_ENV !== "production" ? o.name_ + "." + Fi(r) : "ObservableMap.key", !1);
      o.data_.set(r, u), i = u.value_, (c = o.hasMap_.get(r)) == null || c.setNewValue_(!0), o.keysAtom_.reportChanged();
    });
    var s = ge(), a = Ye(this), l = a || s ? {
      observableKind: "map",
      debugObjectName: this.name_,
      type: Et,
      object: this,
      name: r,
      newValue: i
    } : null;
    w.NODE_ENV !== "production" && s && Ae(l), a && Xe(this, l), w.NODE_ENV !== "production" && s && Te();
  }, t.get = function(r) {
    return this.has(r) ? this.dehanceValue_(this.data_.get(r).get()) : this.dehanceValue_(void 0);
  }, t.dehanceValue_ = function(r) {
    return this.dehancer !== void 0 ? this.dehancer(r) : r;
  }, t.keys = function() {
    return this.keysAtom_.reportObserved(), this.data_.keys();
  }, t.values = function() {
    var r = this, i = this.keys();
    return ms({
      next: function() {
        var s = i.next(), a = s.done, l = s.value;
        return {
          done: a,
          value: a ? void 0 : r.get(l)
        };
      }
    });
  }, t.entries = function() {
    var r = this, i = this.keys();
    return ms({
      next: function() {
        var s = i.next(), a = s.done, l = s.value;
        return {
          done: a,
          value: a ? void 0 : [l, r.get(l)]
        };
      }
    });
  }, t[Symbol.iterator] = function() {
    return this.entries();
  }, t.forEach = function(r, i) {
    for (var o = nn(this), s; !(s = o()).done; ) {
      var a = s.value, l = a[0], c = a[1];
      r.call(i, c, l, this);
    }
  }, t.merge = function(r) {
    var i = this;
    return At(r) && (r = new Map(r)), ft(function() {
      xe(r) ? lf(r).forEach(function(o) {
        return i.set(o, r[o]);
      }) : Array.isArray(r) ? r.forEach(function(o) {
        var s = o[0], a = o[1];
        return i.set(s, a);
      }) : pn(r) ? (af(r) || C(19, r), r.forEach(function(o, s) {
        return i.set(s, o);
      })) : r != null && C(20, r);
    }), this;
  }, t.clear = function() {
    var r = this;
    ft(function() {
      Qa(function() {
        for (var i = nn(r.keys()), o; !(o = i()).done; ) {
          var s = o.value;
          r.delete(s);
        }
      });
    });
  }, t.replace = function(r) {
    var i = this;
    return ft(function() {
      for (var o = Hd(r), s = /* @__PURE__ */ new Map(), a = !1, l = nn(i.data_.keys()), c; !(c = l()).done; ) {
        var u = c.value;
        if (!o.has(u)) {
          var f = i.delete(u);
          if (f)
            a = !0;
          else {
            var h = i.data_.get(u);
            s.set(u, h);
          }
        }
      }
      for (var d = nn(o.entries()), p; !(p = d()).done; ) {
        var g = p.value, b = g[0], O = g[1], _ = i.data_.has(b);
        if (i.set(b, O), i.data_.has(b)) {
          var E = i.data_.get(b);
          s.set(b, E), _ || (a = !0);
        }
      }
      if (!a)
        if (i.data_.size !== s.size)
          i.keysAtom_.reportChanged();
        else
          for (var S = i.data_.keys(), x = s.keys(), y = S.next(), R = x.next(); !y.done; ) {
            if (y.value !== R.value) {
              i.keysAtom_.reportChanged();
              break;
            }
            y = S.next(), R = x.next();
          }
      i.data_ = s;
    }), this;
  }, t.toString = function() {
    return "[object ObservableMap]";
  }, t.toJSON = function() {
    return Array.from(this);
  }, t.observe_ = function(r, i) {
    return w.NODE_ENV !== "production" && i === !0 && C("`observe` doesn't support fireImmediately=true in combination with maps."), zn(this, r);
  }, t.intercept_ = function(r) {
    return Kn(this, r);
  }, hn(e, [{
    key: "size",
    get: function() {
      return this.keysAtom_.reportObserved(), this.data_.size;
    }
  }, {
    key: Symbol.toStringTag,
    get: function() {
      return "Map";
    }
  }]);
}(), At = /* @__PURE__ */ qt("ObservableMap", bl);
function ms(e) {
  return e[Symbol.toStringTag] = "MapIterator", Lo(e);
}
function Hd(e) {
  if (pn(e) || At(e))
    return e;
  if (Array.isArray(e))
    return new Map(e);
  if (xe(e)) {
    var t = /* @__PURE__ */ new Map();
    for (var n in e)
      t.set(n, e[n]);
    return t;
  } else
    return C(21, e);
}
var Gd = {}, _l = /* @__PURE__ */ function() {
  function e(n, r, i) {
    var o = this;
    r === void 0 && (r = jt), i === void 0 && (i = w.NODE_ENV !== "production" ? "ObservableSet@" + Je() : "ObservableSet"), this.name_ = void 0, this[F] = Gd, this.data_ = /* @__PURE__ */ new Set(), this.atom_ = void 0, this.changeListeners_ = void 0, this.interceptors_ = void 0, this.dehancer = void 0, this.enhancer_ = void 0, this.name_ = i, ce(Set) || C(22), this.enhancer_ = function(s, a) {
      return r(s, a, i);
    }, Tt(function() {
      o.atom_ = ka(o.name_), n && o.replace(n);
    });
  }
  var t = e.prototype;
  return t.dehanceValue_ = function(r) {
    return this.dehancer !== void 0 ? this.dehancer(r) : r;
  }, t.clear = function() {
    var r = this;
    ft(function() {
      Qa(function() {
        for (var i = nn(r.data_.values()), o; !(o = i()).done; ) {
          var s = o.value;
          r.delete(s);
        }
      });
    });
  }, t.forEach = function(r, i) {
    for (var o = nn(this), s; !(s = o()).done; ) {
      var a = s.value;
      r.call(i, a, a, this);
    }
  }, t.add = function(r) {
    var i = this;
    if (rt(this.atom_), Ie(this)) {
      var o = Ve(this, {
        type: Et,
        object: this,
        newValue: r
      });
      if (!o)
        return this;
      r = o.newValue;
    }
    if (!this.has(r)) {
      ft(function() {
        i.data_.add(i.enhancer_(r, void 0)), i.atom_.reportChanged();
      });
      var s = w.NODE_ENV !== "production" && ge(), a = Ye(this), l = a || s ? {
        observableKind: "set",
        debugObjectName: this.name_,
        type: Et,
        object: this,
        newValue: r
      } : null;
      s && w.NODE_ENV !== "production" && Ae(l), a && Xe(this, l), s && w.NODE_ENV !== "production" && Te();
    }
    return this;
  }, t.delete = function(r) {
    var i = this;
    if (Ie(this)) {
      var o = Ve(this, {
        type: Sr,
        object: this,
        oldValue: r
      });
      if (!o)
        return !1;
    }
    if (this.has(r)) {
      var s = w.NODE_ENV !== "production" && ge(), a = Ye(this), l = a || s ? {
        observableKind: "set",
        debugObjectName: this.name_,
        type: Sr,
        object: this,
        oldValue: r
      } : null;
      return s && w.NODE_ENV !== "production" && Ae(l), ft(function() {
        i.atom_.reportChanged(), i.data_.delete(r);
      }), a && Xe(this, l), s && w.NODE_ENV !== "production" && Te(), !0;
    }
    return !1;
  }, t.has = function(r) {
    return this.atom_.reportObserved(), this.data_.has(this.dehanceValue_(r));
  }, t.entries = function() {
    var r = this.values();
    return bs({
      next: function() {
        var o = r.next(), s = o.value, a = o.done;
        return a ? {
          value: void 0,
          done: a
        } : {
          value: [s, s],
          done: a
        };
      }
    });
  }, t.keys = function() {
    return this.values();
  }, t.values = function() {
    this.atom_.reportObserved();
    var r = this, i = this.data_.values();
    return bs({
      next: function() {
        var s = i.next(), a = s.value, l = s.done;
        return l ? {
          value: void 0,
          done: l
        } : {
          value: r.dehanceValue_(a),
          done: l
        };
      }
    });
  }, t.intersection = function(r) {
    if (ct(r) && !nt(r))
      return r.intersection(this);
    var i = new Set(this);
    return i.intersection(r);
  }, t.union = function(r) {
    if (ct(r) && !nt(r))
      return r.union(this);
    var i = new Set(this);
    return i.union(r);
  }, t.difference = function(r) {
    return new Set(this).difference(r);
  }, t.symmetricDifference = function(r) {
    if (ct(r) && !nt(r))
      return r.symmetricDifference(this);
    var i = new Set(this);
    return i.symmetricDifference(r);
  }, t.isSubsetOf = function(r) {
    return new Set(this).isSubsetOf(r);
  }, t.isSupersetOf = function(r) {
    return new Set(this).isSupersetOf(r);
  }, t.isDisjointFrom = function(r) {
    if (ct(r) && !nt(r))
      return r.isDisjointFrom(this);
    var i = new Set(this);
    return i.isDisjointFrom(r);
  }, t.replace = function(r) {
    var i = this;
    return nt(r) && (r = new Set(r)), ft(function() {
      Array.isArray(r) ? (i.clear(), r.forEach(function(o) {
        return i.add(o);
      })) : ct(r) ? (i.clear(), r.forEach(function(o) {
        return i.add(o);
      })) : r != null && C("Cannot initialize set from " + r);
    }), this;
  }, t.observe_ = function(r, i) {
    return w.NODE_ENV !== "production" && i === !0 && C("`observe` doesn't support fireImmediately=true in combination with sets."), zn(this, r);
  }, t.intercept_ = function(r) {
    return Kn(this, r);
  }, t.toJSON = function() {
    return Array.from(this);
  }, t.toString = function() {
    return "[object ObservableSet]";
  }, t[Symbol.iterator] = function() {
    return this.values();
  }, hn(e, [{
    key: "size",
    get: function() {
      return this.atom_.reportObserved(), this.data_.size;
    }
  }, {
    key: Symbol.toStringTag,
    get: function() {
      return "Set";
    }
  }]);
}(), nt = /* @__PURE__ */ qt("ObservableSet", _l);
function bs(e) {
  return e[Symbol.toStringTag] = "SetIterator", Lo(e);
}
var _s = /* @__PURE__ */ Object.create(null), ys = "remove", Wi = /* @__PURE__ */ function() {
  function e(n, r, i, o) {
    r === void 0 && (r = /* @__PURE__ */ new Map()), o === void 0 && (o = Mf), this.target_ = void 0, this.values_ = void 0, this.name_ = void 0, this.defaultAnnotation_ = void 0, this.keysAtom_ = void 0, this.changeListeners_ = void 0, this.interceptors_ = void 0, this.proxy_ = void 0, this.isPlainObject_ = void 0, this.appliedAnnotations_ = void 0, this.pendingKeys_ = void 0, this.target_ = n, this.values_ = r, this.name_ = i, this.defaultAnnotation_ = o, this.keysAtom_ = new xt(w.NODE_ENV !== "production" ? this.name_ + ".keys" : "ObservableObject.keys"), this.isPlainObject_ = xe(this.target_), w.NODE_ENV !== "production" && !Nl(this.defaultAnnotation_) && C("defaultAnnotation must be valid annotation"), w.NODE_ENV !== "production" && (this.appliedAnnotations_ = {});
  }
  var t = e.prototype;
  return t.getObservablePropValue_ = function(r) {
    return this.values_.get(r).get();
  }, t.setObservablePropValue_ = function(r, i) {
    var o = this.values_.get(r);
    if (o instanceof He)
      return o.set(i), !0;
    if (Ie(this)) {
      var s = Ve(this, {
        type: We,
        object: this.proxy_ || this.target_,
        name: r,
        newValue: i
      });
      if (!s)
        return null;
      i = s.newValue;
    }
    if (i = o.prepareNewValue_(i), i !== A.UNCHANGED) {
      var a = Ye(this), l = w.NODE_ENV !== "production" && ge(), c = a || l ? {
        type: We,
        observableKind: "object",
        debugObjectName: this.name_,
        object: this.proxy_ || this.target_,
        oldValue: o.value_,
        name: r,
        newValue: i
      } : null;
      w.NODE_ENV !== "production" && l && Ae(c), o.setNewValue_(i), a && Xe(this, c), w.NODE_ENV !== "production" && l && Te();
    }
    return !0;
  }, t.get_ = function(r) {
    return A.trackingDerivation && !Be(this.target_, r) && this.has_(r), this.target_[r];
  }, t.set_ = function(r, i, o) {
    return o === void 0 && (o = !1), Be(this.target_, r) ? this.values_.has(r) ? this.setObservablePropValue_(r, i) : o ? Reflect.set(this.target_, r, i) : (this.target_[r] = i, !0) : this.extend_(r, {
      value: i,
      enumerable: !0,
      writable: !0,
      configurable: !0
    }, this.defaultAnnotation_, o);
  }, t.has_ = function(r) {
    if (!A.trackingDerivation)
      return r in this.target_;
    this.pendingKeys_ || (this.pendingKeys_ = /* @__PURE__ */ new Map());
    var i = this.pendingKeys_.get(r);
    return i || (i = new Vt(r in this.target_, Gr, w.NODE_ENV !== "production" ? this.name_ + "." + Fi(r) + "?" : "ObservableObject.key?", !1), this.pendingKeys_.set(r, i)), i.get();
  }, t.make_ = function(r, i) {
    if (i === !0 && (i = this.defaultAnnotation_), i !== !1) {
      if (ws(this, i, r), !(r in this.target_)) {
        var o;
        if ((o = this.target_[Ee]) != null && o[r])
          return;
        C(1, i.annotationType_, this.name_ + "." + r.toString());
      }
      for (var s = this.target_; s && s !== Br; ) {
        var a = gr(s, r);
        if (a) {
          var l = i.make_(this, r, a, s);
          if (l === 0)
            return;
          if (l === 1)
            break;
        }
        s = Object.getPrototypeOf(s);
      }
      Os(this, i, r);
    }
  }, t.extend_ = function(r, i, o, s) {
    if (s === void 0 && (s = !1), o === !0 && (o = this.defaultAnnotation_), o === !1)
      return this.defineProperty_(r, i, s);
    ws(this, o, r);
    var a = o.extend_(this, r, i, s);
    return a && Os(this, o, r), a;
  }, t.defineProperty_ = function(r, i, o) {
    o === void 0 && (o = !1), rt(this.keysAtom_);
    try {
      Me();
      var s = this.delete_(r);
      if (!s)
        return s;
      if (Ie(this)) {
        var a = Ve(this, {
          object: this.proxy_ || this.target_,
          name: r,
          type: Et,
          newValue: i.value
        });
        if (!a)
          return null;
        var l = a.newValue;
        i.value !== l && (i = vt({}, i, {
          value: l
        }));
      }
      if (o) {
        if (!Reflect.defineProperty(this.target_, r, i))
          return !1;
      } else
        it(this.target_, r, i);
      this.notifyPropertyAddition_(r, i.value);
    } finally {
      je();
    }
    return !0;
  }, t.defineObservableProperty_ = function(r, i, o, s) {
    s === void 0 && (s = !1), rt(this.keysAtom_);
    try {
      Me();
      var a = this.delete_(r);
      if (!a)
        return a;
      if (Ie(this)) {
        var l = Ve(this, {
          object: this.proxy_ || this.target_,
          name: r,
          type: Et,
          newValue: i
        });
        if (!l)
          return null;
        i = l.newValue;
      }
      var c = Es(r), u = {
        configurable: A.safeDescriptors ? this.isPlainObject_ : !0,
        enumerable: !0,
        get: c.get,
        set: c.set
      };
      if (s) {
        if (!Reflect.defineProperty(this.target_, r, u))
          return !1;
      } else
        it(this.target_, r, u);
      var f = new Vt(i, o, w.NODE_ENV !== "production" ? this.name_ + "." + r.toString() : "ObservableObject.key", !1);
      this.values_.set(r, f), this.notifyPropertyAddition_(r, f.value_);
    } finally {
      je();
    }
    return !0;
  }, t.defineComputedProperty_ = function(r, i, o) {
    o === void 0 && (o = !1), rt(this.keysAtom_);
    try {
      Me();
      var s = this.delete_(r);
      if (!s)
        return s;
      if (Ie(this)) {
        var a = Ve(this, {
          object: this.proxy_ || this.target_,
          name: r,
          type: Et,
          newValue: void 0
        });
        if (!a)
          return null;
      }
      i.name || (i.name = w.NODE_ENV !== "production" ? this.name_ + "." + r.toString() : "ObservableObject.key"), i.context = this.proxy_ || this.target_;
      var l = Es(r), c = {
        configurable: A.safeDescriptors ? this.isPlainObject_ : !0,
        enumerable: !1,
        get: l.get,
        set: l.set
      };
      if (o) {
        if (!Reflect.defineProperty(this.target_, r, c))
          return !1;
      } else
        it(this.target_, r, c);
      this.values_.set(r, new He(i)), this.notifyPropertyAddition_(r, void 0);
    } finally {
      je();
    }
    return !0;
  }, t.delete_ = function(r, i) {
    if (i === void 0 && (i = !1), rt(this.keysAtom_), !Be(this.target_, r))
      return !0;
    if (Ie(this)) {
      var o = Ve(this, {
        object: this.proxy_ || this.target_,
        name: r,
        type: ys
      });
      if (!o)
        return null;
    }
    try {
      var s;
      Me();
      var a = Ye(this), l = w.NODE_ENV !== "production" && ge(), c = this.values_.get(r), u = void 0;
      if (!c && (a || l)) {
        var f;
        u = (f = gr(this.target_, r)) == null ? void 0 : f.value;
      }
      if (i) {
        if (!Reflect.deleteProperty(this.target_, r))
          return !1;
      } else
        delete this.target_[r];
      if (w.NODE_ENV !== "production" && delete this.appliedAnnotations_[r], c && (this.values_.delete(r), c instanceof Vt && (u = c.value_), rl(c)), this.keysAtom_.reportChanged(), (s = this.pendingKeys_) == null || (s = s.get(r)) == null || s.set(r in this.target_), a || l) {
        var h = {
          type: ys,
          observableKind: "object",
          object: this.proxy_ || this.target_,
          debugObjectName: this.name_,
          oldValue: u,
          name: r
        };
        w.NODE_ENV !== "production" && l && Ae(h), a && Xe(this, h), w.NODE_ENV !== "production" && l && Te();
      }
    } finally {
      je();
    }
    return !0;
  }, t.observe_ = function(r, i) {
    return w.NODE_ENV !== "production" && i === !0 && C("`observe` doesn't support the fire immediately property for observable objects."), zn(this, r);
  }, t.intercept_ = function(r) {
    return Kn(this, r);
  }, t.notifyPropertyAddition_ = function(r, i) {
    var o, s = Ye(this), a = w.NODE_ENV !== "production" && ge();
    if (s || a) {
      var l = s || a ? {
        type: Et,
        observableKind: "object",
        debugObjectName: this.name_,
        object: this.proxy_ || this.target_,
        name: r,
        newValue: i
      } : null;
      w.NODE_ENV !== "production" && a && Ae(l), s && Xe(this, l), w.NODE_ENV !== "production" && a && Te();
    }
    (o = this.pendingKeys_) == null || (o = o.get(r)) == null || o.set(!0), this.keysAtom_.reportChanged();
  }, t.ownKeys_ = function() {
    return this.keysAtom_.reportObserved(), an(this.target_);
  }, t.keys_ = function() {
    return this.keysAtom_.reportObserved(), Object.keys(this.target_);
  }, e;
}();
function Kt(e, t) {
  var n;
  if (w.NODE_ENV !== "production" && t && vn(e) && C("Options can't be provided for already observable objects."), Be(e, F))
    return w.NODE_ENV !== "production" && !(wl(e) instanceof Wi) && C("Cannot convert '" + Nr(e) + `' into observable object:
The target is already observable of different type.
Extending builtins is not supported.`), e;
  w.NODE_ENV !== "production" && !Object.isExtensible(e) && C("Cannot make the designated object observable; it is not extensible");
  var r = (n = t == null ? void 0 : t.name) != null ? n : w.NODE_ENV !== "production" ? (xe(e) ? "ObservableObject" : e.constructor.name) + "@" + Je() : "ObservableObject", i = new Wi(e, /* @__PURE__ */ new Map(), String(r), Yf(t));
  return Hn(e, F, i), e;
}
var qd = /* @__PURE__ */ qt("ObservableObjectAdministration", Wi);
function Es(e) {
  return _s[e] || (_s[e] = {
    get: function() {
      return this[F].getObservablePropValue_(e);
    },
    set: function(n) {
      return this[F].setObservablePropValue_(e, n);
    }
  });
}
function vn(e) {
  return Ur(e) ? qd(e[F]) : !1;
}
function Os(e, t, n) {
  var r;
  w.NODE_ENV !== "production" && (e.appliedAnnotations_[n] = t), (r = e.target_[Ee]) == null || delete r[n];
}
function ws(e, t, n) {
  if (w.NODE_ENV !== "production" && !Nl(t) && C("Cannot annotate '" + e.name_ + "." + n.toString() + "': Invalid annotation."), w.NODE_ENV !== "production" && !_r(t) && Be(e.appliedAnnotations_, n)) {
    var r = e.name_ + "." + n.toString(), i = e.appliedAnnotations_[n].annotationType_, o = t.annotationType_;
    C("Cannot apply '" + o + "' to '" + r + "':" + (`
The field is already annotated with '` + i + "'.") + `
Re-annotating fields is not allowed.
Use 'override' annotation for methods overridden by subclass.`);
  }
}
var Wd = /* @__PURE__ */ El(0), Kd = /* @__PURE__ */ function() {
  var e = !1, t = {};
  return Object.defineProperty(t, "0", {
    set: function() {
      e = !0;
    }
  }), Object.create(t)[0] = 1, e === !1;
}(), pi = 0, yl = function() {
};
function zd(e, t) {
  Object.setPrototypeOf ? Object.setPrototypeOf(e.prototype, t) : e.prototype.__proto__ !== void 0 ? e.prototype.__proto__ = t : e.prototype = t;
}
zd(yl, Array.prototype);
var $o = /* @__PURE__ */ function(e) {
  function t(r, i, o, s) {
    var a;
    return o === void 0 && (o = w.NODE_ENV !== "production" ? "ObservableArray@" + Je() : "ObservableArray"), s === void 0 && (s = !1), a = e.call(this) || this, Tt(function() {
      var l = new Do(o, i, s, !0);
      l.proxy_ = a, Va(a, F, l), r && r.length && a.spliceWithArray(0, 0, r), Kd && Object.defineProperty(a, "0", Wd);
    }), a;
  }
  ja(t, e);
  var n = t.prototype;
  return n.concat = function() {
    this[F].atom_.reportObserved();
    for (var i = arguments.length, o = new Array(i), s = 0; s < i; s++)
      o[s] = arguments[s];
    return Array.prototype.concat.apply(
      this.slice(),
      //@ts-ignore
      o.map(function(a) {
        return zr(a) ? a.slice() : a;
      })
    );
  }, n[Symbol.iterator] = function() {
    var r = this, i = 0;
    return Lo({
      next: function() {
        return i < r.length ? {
          value: r[i++],
          done: !1
        } : {
          done: !0,
          value: void 0
        };
      }
    });
  }, hn(t, [{
    key: "length",
    get: function() {
      return this[F].getArrayLength_();
    },
    set: function(i) {
      this[F].setArrayLength_(i);
    }
  }, {
    key: Symbol.toStringTag,
    get: function() {
      return "Array";
    }
  }]);
}(yl);
Object.entries(wr).forEach(function(e) {
  var t = e[0], n = e[1];
  t !== "concat" && Hn($o.prototype, t, n);
});
function El(e) {
  return {
    enumerable: !1,
    configurable: !0,
    get: function() {
      return this[F].get_(e);
    },
    set: function(n) {
      this[F].set_(e, n);
    }
  };
}
function Yd(e) {
  it($o.prototype, "" + e, El(e));
}
function Ol(e) {
  if (e > pi) {
    for (var t = pi; t < e + 100; t++)
      Yd(t);
    pi = e;
  }
}
Ol(1e3);
function Xd(e, t, n) {
  return new $o(e, t, n);
}
function cn(e, t) {
  if (typeof e == "object" && e !== null) {
    if (zr(e))
      return t !== void 0 && C(23), e[F].atom_;
    if (nt(e))
      return e.atom_;
    if (At(e)) {
      if (t === void 0)
        return e.keysAtom_;
      var n = e.data_.get(t) || e.hasMap_.get(t);
      return n || C(25, t, Nr(e)), n;
    }
    if (vn(e)) {
      if (!t)
        return C(26);
      var r = e[F].values_.get(t);
      return r || C(27, t, Nr(e)), r;
    }
    if (No(e) || Kr(e) || Or(e))
      return e;
  } else if (ce(e) && Or(e[F]))
    return e[F];
  C(28);
}
function wl(e, t) {
  if (e || C(29), No(e) || Kr(e) || Or(e) || At(e) || nt(e))
    return e;
  if (e[F])
    return e[F];
  C(24, e);
}
function Nr(e, t) {
  var n;
  if (t !== void 0)
    n = cn(e, t);
  else {
    if (ln(e))
      return e.name;
    vn(e) || At(e) || nt(e) ? n = wl(e) : n = cn(e);
  }
  return n.name_;
}
function Tt(e) {
  var t = Wt(), n = Ao(!0);
  Me();
  try {
    return e();
  } finally {
    je(), To(n), pt(t);
  }
}
var Ss = Br.toString;
function Sl(e, t, n) {
  return n === void 0 && (n = -1), Ki(e, t, n);
}
function Ki(e, t, n, r, i) {
  if (e === t)
    return e !== 0 || 1 / e === 1 / t;
  if (e == null || t == null)
    return !1;
  if (e !== e)
    return t !== t;
  var o = typeof e;
  if (o !== "function" && o !== "object" && typeof t != "object")
    return !1;
  var s = Ss.call(e);
  if (s !== Ss.call(t))
    return !1;
  switch (s) {
    // Strings, numbers, regular expressions, dates, and booleans are compared by value.
    case "[object RegExp]":
    // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
    case "[object String]":
      return "" + e == "" + t;
    case "[object Number]":
      return +e != +e ? +t != +t : +e == 0 ? 1 / +e === 1 / t : +e == +t;
    case "[object Date]":
    case "[object Boolean]":
      return +e == +t;
    case "[object Symbol]":
      return typeof Symbol < "u" && Symbol.valueOf.call(e) === Symbol.valueOf.call(t);
    case "[object Map]":
    case "[object Set]":
      n >= 0 && n++;
      break;
  }
  e = Ns(e), t = Ns(t);
  var a = s === "[object Array]";
  if (!a) {
    if (typeof e != "object" || typeof t != "object")
      return !1;
    var l = e.constructor, c = t.constructor;
    if (l !== c && !(ce(l) && l instanceof l && ce(c) && c instanceof c) && "constructor" in e && "constructor" in t)
      return !1;
  }
  if (n === 0)
    return !1;
  n < 0 && (n = -1), r = r || [], i = i || [];
  for (var u = r.length; u--; )
    if (r[u] === e)
      return i[u] === t;
  if (r.push(e), i.push(t), a) {
    if (u = e.length, u !== t.length)
      return !1;
    for (; u--; )
      if (!Ki(e[u], t[u], n - 1, r, i))
        return !1;
  } else {
    var f = Object.keys(e), h = f.length;
    if (Object.keys(t).length !== h)
      return !1;
    for (var d = 0; d < h; d++) {
      var p = f[d];
      if (!(Be(t, p) && Ki(e[p], t[p], n - 1, r, i)))
        return !1;
    }
  }
  return r.pop(), i.pop(), !0;
}
function Ns(e) {
  return zr(e) ? e.slice() : pn(e) || At(e) || ct(e) || nt(e) ? Array.from(e.entries()) : e;
}
var xs, Qd = ((xs = kr().Iterator) == null ? void 0 : xs.prototype) || {};
function Lo(e) {
  return e[Symbol.iterator] = Zd, Object.assign(Object.create(Qd), e);
}
function Zd() {
  return this;
}
function Nl(e) {
  return (
    // Can be function
    e instanceof Object && typeof e.annotationType_ == "string" && ce(e.make_) && ce(e.extend_)
  );
}
["Symbol", "Map", "Set"].forEach(function(e) {
  var t = kr();
  typeof t[e] > "u" && C("MobX requires global '" + e + "' to be available or polyfilled");
});
typeof __MOBX_DEVTOOLS_GLOBAL_HOOK__ == "object" && __MOBX_DEVTOOLS_GLOBAL_HOOK__.injectMobx({
  spy: vd,
  extras: {
    getDebugName: Nr
  },
  $mobx: F
});
var hi, As;
function Jd() {
  if (As) return hi;
  As = 1;
  var e = "Expected a function", t = NaN, n = "[object Symbol]", r = /^\s+|\s+$/g, i = /^[-+]0x[0-9a-f]+$/i, o = /^0b[01]+$/i, s = /^0o[0-7]+$/i, a = parseInt, l = typeof tr == "object" && tr && tr.Object === Object && tr, c = typeof self == "object" && self && self.Object === Object && self, u = l || c || Function("return this")(), f = Object.prototype, h = f.toString, d = Math.max, p = Math.min, g = function() {
    return u.Date.now();
  };
  function b(y, R, T) {
    var $, L, N, P, M, B, Q = 0, X = !1, j = !1, k = !0;
    if (typeof y != "function")
      throw new TypeError(e);
    R = x(R) || 0, _(T) && (X = !!T.leading, j = "maxWait" in T, N = j ? d(x(T.maxWait) || 0, R) : N, k = "trailing" in T ? !!T.trailing : k);
    function K(J) {
      var me = $, Ct = L;
      return $ = L = void 0, Q = J, P = y.apply(Ct, me), P;
    }
    function te(J) {
      return Q = J, M = setTimeout(I, R), X ? K(J) : P;
    }
    function we(J) {
      var me = J - B, Ct = J - Q, er = R - me;
      return j ? p(er, N - Ct) : er;
    }
    function $e(J) {
      var me = J - B, Ct = J - Q;
      return B === void 0 || me >= R || me < 0 || j && Ct >= N;
    }
    function I() {
      var J = g();
      if ($e(J))
        return le(J);
      M = setTimeout(I, we(J));
    }
    function le(J) {
      return M = void 0, k && $ ? K(J) : ($ = L = void 0, P);
    }
    function ye() {
      M !== void 0 && clearTimeout(M), Q = 0, $ = B = L = M = void 0;
    }
    function Rt() {
      return M === void 0 ? P : le(g());
    }
    function lt() {
      var J = g(), me = $e(J);
      if ($ = arguments, L = this, B = J, me) {
        if (M === void 0)
          return te(B);
        if (j)
          return M = setTimeout(I, R), K(B);
      }
      return M === void 0 && (M = setTimeout(I, R)), P;
    }
    return lt.cancel = ye, lt.flush = Rt, lt;
  }
  function O(y, R, T) {
    var $ = !0, L = !0;
    if (typeof y != "function")
      throw new TypeError(e);
    return _(T) && ($ = "leading" in T ? !!T.leading : $, L = "trailing" in T ? !!T.trailing : L), b(y, R, {
      leading: $,
      maxWait: R,
      trailing: L
    });
  }
  function _(y) {
    var R = typeof y;
    return !!y && (R == "object" || R == "function");
  }
  function E(y) {
    return !!y && typeof y == "object";
  }
  function S(y) {
    return typeof y == "symbol" || E(y) && h.call(y) == n;
  }
  function x(y) {
    if (typeof y == "number")
      return y;
    if (S(y))
      return t;
    if (_(y)) {
      var R = typeof y.valueOf == "function" ? y.valueOf() : y;
      y = _(R) ? R + "" : R;
    }
    if (typeof y != "string")
      return y === 0 ? y : +y;
    y = y.replace(r, "");
    var T = o.test(y);
    return T || s.test(y) ? a(y.slice(2), T ? 2 : 8) : i.test(y) ? t : +y;
  }
  return hi = O, hi;
}
var ep = Jd();
const tp = /* @__PURE__ */ Oa(ep), zi = "next", Yi = "previous", np = [{
  name: V.CONTENT_SOURCE,
  defaultValue: ""
}, {
  name: V.VERSION,
  defaultValue: ""
}, {
  name: V.VARIANT,
  defaultValue: ""
}, {
  name: V.START,
  defaultValue: "0"
}, {
  name: V.MAX,
  defaultValue: "10"
}, {
  name: V.IN_APP_HELP,
  defaultValue: ""
}, {
  name: V.REFERRER,
  defaultValue: ""
}], xr = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical"
}, rp = (e, t) => {
  const n = e.message ? e.message : e;
  n ? console.error(n, t) : console.error(e);
}, ip = {
  error: rp
};
class xl extends Error {
}
class Al extends Error {
}
class op extends Error {
}
class sp extends Error {
  /**
   * @param uiMessages messages to show to UI (if the error is considered expected, and caught)
   * @param message message that is shown in log and used when reporting to Sentry (if this error will be reported)
   */
  constructor(t, n) {
    super(), this.uiMessages = t, this.message = n;
  }
}
class ap extends Error {
  /**
   * @param message message that is shown in log and used when reporting to Sentry (if this error will be reported)
   */
  constructor(t) {
    super(), this.message = t;
  }
}
const lp = (e) => {
  if (e.ok)
    return Promise.resolve(e);
  if (e.status === 403)
    return Promise.reject(new xl(`Permission error accessing resource ${e.url}.`));
  if (e.status === 404)
    return Promise.reject(new op(`No item found on ${e.url}`));
  const t = `Request failed: ${e.url}. Status: ${e.status}.`;
  return e.status >= 500 ? Promise.reject(new ap(`Internal server error. Status: ${e.status}.`)) : e.status >= 400 ? Promise.reject(new sp(t)) : Promise.reject(new Error(t));
}, up = (e) => e.status === 204 ? null : e.json(), cp = (e, t = {}) => fetch(e, {
  method: "GET",
  headers: t
}).then(lp).then(up);
var Vn;
class Tl {
  constructor({
    lang: t
  }) {
    ut(this, Vn);
    Qt(this, Vn, t);
  }
  /**
   * @param {Omit<TFetchSuggestionsOptions, 'json'>} options
   * @return {Promise<{ hits: Array<{ contentSourceId: string; description: string; path: string; title: string; }>; limit: number; start: number; took: number; total: number; }>}
   * @throws {Error | InvalidQueryError}
   */
  async fetchSuggestions({
    query: t,
    contentSource: n,
    version: r,
    variant: i,
    language: o,
    max: s,
    start: a,
    onlyLatest: l
  }) {
    const c = this.getSearchUrl({
      query: t,
      contentSource: n,
      version: r,
      variant: i,
      language: o,
      max: s,
      start: a,
      onlyLatest: l,
      json: !0
    });
    try {
      const u = await cp(c);
      return {
        ...u,
        hits: u.hits.map((f) => ({
          ...f,
          path: new URL(f.path.replace(/^\//, ""), Ac()).pathname
        }))
      };
    } catch (u) {
      let f = u;
      throw f instanceof xl && (f = new Al()), ip.error(f), f;
    }
  }
  async navigateToSearchPage({
    query: t,
    contentSource: n,
    version: r,
    variant: i,
    language: o,
    max: s,
    start: a
  } = {}) {
    const l = this.getSearchUrl({
      query: t,
      contentSource: n,
      version: r,
      variant: i,
      language: o,
      max: s,
      start: a
    });
    self.location.assign(l);
  }
  /**
   * @param {TFetchSuggestionsOptions} options
   * @returns {URL}
   */
  getSearchUrl({
    query: t,
    contentSource: n,
    version: r,
    variant: i,
    language: o,
    max: s = 10,
    start: a = 0,
    onlyLatest: l = !1,
    json: c = !1
  } = {}) {
    const u = c ? Tc() : wa();
    return (/* @__PURE__ */ new Map([[V.QUERY, t], [V.MAX, s.toString()], [V.START, a.toString()], [V.CONTENT_SOURCE, n || null], [V.VARIANT, i || null], [V.VERSION, r || null], [V.LANGUAGE, o || Xt(this, Vn) || null], [V.ONLY_LATEST, l.toString()], [V.IN_APP_HELP, Tn() ? "true" : null], [V.REFERRER, Tn() ? encodeURIComponent(window.location) : null]])).forEach((h, d) => {
      h != null && u.searchParams.set(d, h);
    }), u.searchParams.sort(), u;
  }
}
Vn = new WeakMap();
var Fn, Mn;
class Zt {
  /**
   * @param {Object} options
   * @param options.title
   * @param [options.query]
   * @param [options.icon]
   * @param options.description
   * @param options.contentSourceName
   * @param options.versionName
   * @param options.variantName
   * @param options.url
   * @param options.store
   * @param [options.type]
   * @param [options.action]
   * @param [options.id]
   */
  constructor({
    title: t,
    query: n,
    icon: r,
    description: i,
    contentSourceName: o,
    versionName: s,
    variantName: a,
    url: l,
    store: c,
    type: u,
    action: f,
    id: h
  }) {
    ut(this, Fn);
    ut(this, Mn);
    ie(this, "title");
    ie(this, "query");
    ie(this, "description");
    ie(this, "contentSourceName");
    ie(this, "versionName");
    ie(this, "variantName");
    ie(this, "url");
    /** @type {'cta' | 'tool' | 'suggestion' | undefined} */
    ie(this, "type");
    /** @type {function(Suggestion): void} */
    ie(this, "actionCallback");
    gl(this), Qt(this, Mn, h || Eo()), Qt(this, Fn, c), this.title = t, this.query = n, this.icon = r, this.description = i, this.contentSourceName = o, this.versionName = s, this.variantName = a, this.url = l, this.type = u, this.actionCallback = f, this.action = this.action.bind(this);
  }
  get id() {
    return Xt(this, Mn);
  }
  get focused() {
    return Xt(this, Fn).focusedSuggestion === this;
  }
  action() {
    var t;
    (t = this.actionCallback) == null || t.call(this, this);
  }
}
Fn = new WeakMap(), Mn = new WeakMap();
const he = {
  DEFAULT: "default",
  LOADING: "loading",
  NO_SUGGESTIONS_FOUND: "no_suggestions_found",
  SUGGESTIONS_FOUND: "suggestions_found",
  INVALID_QUERY: "invalid_query",
  ERROR: "error"
}, se = {
  CONTENT_SOURCE: "contentSource",
  VERSION: "version",
  VARIANT: "variant",
  LANGUAGE: "language"
}, fp = {
  [se.CONTENT_SOURCE]: null,
  [se.VERSION]: null,
  [se.VARIANT]: null,
  [se.LANGUAGE]: null
}, dp = 300, pp = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.28081 5.51147L8.769 5.46533C8.9226 6.46368 9.35644 7.87098 10.1986 9.0578C11.0294 10.2285 12.2344 11.1594 13.9709 11.333L13.8963 12.8293C13.1395 12.8293 11.8409 13.3406 10.7053 14.3318C9.5887 15.3066 8.77773 16.6171 8.77773 18.0793H7.27773C7.27773 17.2883 6.82991 15.9506 5.89393 14.8034C4.97622 13.6786 3.66616 12.8293 2.00006 12.8293L2 11.3293C3.53581 11.3293 4.73219 10.86 5.59661 9.95985C6.47348 9.04678 7.09046 7.60526 7.28081 5.51147ZM5.09423 12.161C5.87292 12.612 6.52881 13.2088 7.05618 13.8552C7.42989 14.3132 7.74789 14.8067 8.00506 15.3061C8.45055 14.486 9.06045 13.7766 9.71887 13.2018C10.2251 12.7599 10.7825 12.378 11.3479 12.0765C10.3512 11.5355 9.57088 10.7651 8.97536 9.92589C8.65649 9.47654 8.38841 9.00509 8.16519 8.53351C7.8097 9.51141 7.31415 10.337 6.6785 10.9988C6.21042 11.4863 5.67889 11.8719 5.09423 12.161Z" /><path fill-rule="evenodd" clip-rule="evenodd" d="M13.9456 2.03225L14.9369 2C15.0253 2.54673 15.2758 3.32024 15.7617 3.9719C16.239 4.61209 16.934 5.12591 17.9439 5.22202L17.8965 6.21977C17.4621 6.21977 16.7082 6.50104 16.0482 7.04939C15.3978 7.58971 14.9433 8.30173 14.9433 9.07979H13.9433C13.9433 8.66673 13.6926 7.93796 13.1501 7.30519C12.6218 6.68897 11.8648 6.21974 10.8965 6.21977L10.8965 5.21977C11.7947 5.21977 12.4851 4.95822 12.9792 4.46864C13.4787 3.97356 13.8352 3.18812 13.9456 2.03225ZM12.8758 5.77105C13.2799 6.01568 13.6254 6.32313 13.9093 6.65434C14.1106 6.88912 14.2855 7.14113 14.4313 7.39809C14.6948 6.96222 15.0411 6.58596 15.4091 6.2802C15.6682 6.06495 15.9499 5.87478 16.2378 5.71709C15.7099 5.41604 15.2886 5.0103 14.96 4.56967C14.7948 4.34815 14.6524 4.11722 14.5305 3.88496C14.3214 4.39266 14.0391 4.82613 13.6831 5.17894C13.4403 5.41952 13.1698 5.61611 12.8758 5.77105Z" /></svg>';
var jn, Xi;
class gn {
  /**
   * @typedef {import('./search-service').default} SearchRestService
   *
   * @param {Object} options
   * @param {SearchRestService} options.searchService
   * @param {any} options.context
   * @param {Array} options.contentSources
   */
  constructor({
    searchService: t,
    context: n,
    contentSources: r
  }) {
    ut(this, jn);
    /**
     * @typedef {import('./search-service').default} searchService
     * @type {SearchRestService}
     */
    ie(this, "searchService");
    ie(this, "context");
    ie(this, "query", "");
    ie(this, "contentSources", []);
    ie(this, "filter", fp);
    ie(this, "suggestions", []);
    ie(this, "suggestionsState", he.DEFAULT);
    ie(this, "focusedSuggestion");
    ie(this, "activeTool");
    ie(this, "fetchSuggestionsThrottled", tp(this.fetchSuggestions, dp));
    gl(this, {
      searchService: !1,
      context: !1,
      contentSources: !1
    }), this.searchService = t, this.context = n, this.contentSources = r, this.initFilter();
  }
  get selectedContentSource() {
    return this.contentSources.find(({
      id: t
    }) => t === this.filter[se.CONTENT_SOURCE]);
  }
  get selectedVersion() {
    return this.filter[se.VERSION];
  }
  get selectedVariant() {
    return this.filter[se.VARIANT];
  }
  get selectedLanguage() {
    return this.filter[se.LANGUAGE];
  }
  get pending() {
    return this.suggestionsState === he.LOADING;
  }
  setFilter(t) {
    this.activeTool && this.setActiveTool(null), Object.entries(t).forEach(([n, r]) => {
      Object.prototype.hasOwnProperty.call(this.filter, n) && (this.filter[n] = r);
    }), En(this, jn, Xi).call(this);
  }
  setContentSourceFilter(t) {
    this.setFilter({
      [se.CONTENT_SOURCE]: t
    });
  }
  initFilter() {
    var t, n, r, i;
    this.setFilter({
      [se.CONTENT_SOURCE]: (t = this.context) == null ? void 0 : t.contentSource,
      [se.VERSION]: (n = this.context) == null ? void 0 : n.version,
      [se.VARIANT]: (r = this.context) == null ? void 0 : r.variant,
      [se.LANGUAGE]: (i = this.context) == null ? void 0 : i.language
    });
  }
  submit() {
    var t, n;
    this.focusedSuggestion && this.focusedSuggestion.type === "tool" ? (this.setActiveTool(this.focusedSuggestion), (n = (t = this.focusedSuggestion).action) == null || n.call(t)) : this.focusedSuggestion && (this.focusedSuggestion.type === "suggestion" || this.focusedSuggestion.type === "cta") ? this.navigateToPage({
      url: this.focusedSuggestion.url
    }) : this.navigateToSearchPage(), this.focusedSuggestion = null;
  }
  setActiveTool(t) {
    this.activeTool = t;
  }
  input(t, {
    fetchSuggestions: n
  }) {
    this.query !== t && this.activeTool && this.setActiveTool(null), this.query = t, n && En(this, jn, Xi).call(this);
  }
  clearSuggestions() {
    this.activeTool && this.setActiveTool(null), this.suggestions.clear(), this.suggestionsState = he.DEFAULT;
  }
  async fetchSuggestions({
    max: t = 5
  } = {}) {
    this.suggestionsState = he.LOADING;
    const n = this.filter[se.CONTENT_SOURCE], r = this.filter[se.VERSION], i = this.filter[se.VARIANT], o = this.filter[se.LANGUAGE];
    try {
      const s = await this.searchService.fetchSuggestions({
        query: this.query,
        contentSource: n,
        version: r,
        variant: i,
        language: o,
        max: t,
        onlyLatest: !r
      });
      ci(() => {
        var a;
        if (s && Array.isArray(s.hits) && s.hits.length > 0) {
          this.suggestionsState = he.SUGGESTIONS_FOUND, this.suggestions.clear();
          const l = s.hits.map(({
            path: c,
            title: u,
            contentSourceId: f,
            versionName: h,
            variantName: d
          }) => new Zt({
            title: u,
            type: "suggestion",
            description: "",
            contentSourceName: _o(f),
            versionName: h,
            variantName: d,
            url: c,
            store: this
          }));
          this.suggestions.replace(l), t < s.total && this.suggestions.push(new Zt({
            title: Pe("search.results.more.label"),
            url: this.searchService.getSearchUrl({
              query: this.query,
              contentSource: n,
              version: r,
              variant: i
            }),
            type: "cta",
            store: this,
            contentSourceName: "",
            versionName: "",
            variantName: "",
            description: ""
          }));
        } else s && Array.isArray(s.hits) && s.hits.length === 0 ? (this.suggestions.clear(), this.suggestions.push(new Zt({
          title: Pe("search.results.nothing.label"),
          url: null,
          store: this,
          contentSourceName: "",
          versionName: "",
          variantName: "",
          description: ""
        })), this.suggestionsState = he.NO_SUGGESTIONS_FOUND) : this.suggestionsState = he.DEFAULT;
        (a = Oo("site")) != null && a.aiSearchEnabled && this.suggestions.unshift(new Zt({
          id: "ai-search",
          title: Pe("cta.label", {
            ns: "ai-search"
          }),
          query: this.query,
          icon: pp,
          type: "tool",
          store: this,
          action: (l) => {
            this.setActiveTool(l);
          }
        }));
      });
    } catch (s) {
      s instanceof Al ? ci(() => {
        this.suggestions.clear(), this.suggestions.push(new Zt({
          title: Pe("search.error.invalid.label"),
          url: null,
          store: this,
          contentSourceName: "",
          versionName: "",
          variantName: "",
          description: ""
        })), this.suggestionsState = he.INVALID_QUERY;
      }) : ci(() => {
        this.suggestions.clear(), this.suggestions.push(new Zt({
          title: Pe("search.error.general.label"),
          url: null,
          store: this,
          contentSourceName: "",
          versionName: "",
          variantName: "",
          description: ""
        })), this.suggestionsState = he.ERROR;
      });
    }
  }
  /**
   * @param {'previous' | 'next'} direction
   */
  focusSuggestion(t) {
    if (this.suggestions.length === 0 || this.suggestionsState === he.NO_SUGGESTIONS_FOUND && this.suggestions.length === 0 || this.suggestionsState === he.INVALID_QUERY || this.suggestionsState === he.ERROR || this.suggestionsState === he.LOADING)
      return;
    const n = this.focusedSuggestion ? this.suggestions.indexOf(this.focusedSuggestion) : -1;
    let r;
    const i = this.suggestions.filter(({
      type: s
    }) => ["suggestion", "cta", "tool"].includes(s)).length;
    t === Yi ? n <= 0 ? r = i - 1 : r = n - 1 : t === zi && (n >= i - 1 ? r = 0 : r = n + 1);
    const o = this.suggestions[r];
    o && (o.type === "tool" || o.type === "suggestion" || o.type === "cta") && (this.focusedSuggestion = o);
  }
  focusNextSuggestion() {
    this.focusSuggestion("next");
  }
  focusPreviousSuggestion() {
    this.focusSuggestion("previous");
  }
  resetSuggestions() {
    this.focusedSuggestion = void 0, this.suggestionsState = he.DEFAULT;
  }
  navigateToSearchPage() {
    const t = this.filter[se.CONTENT_SOURCE], n = this.filter[se.VERSION], r = this.filter[se.VARIANT], i = this.filter[se.LANGUAGE];
    this.searchService.navigateToSearchPage({
      query: this.query,
      contentSource: t,
      version: n,
      variant: r,
      language: i
    });
  }
  /**
   * @param {Object} options
   * @param {string|URL} options.url
   */
  navigateToPage({
    url: t
  }) {
    if (Tn()) {
      const n = document.createElement("a");
      n.setAttribute("href", t), n.setAttribute("target", "_blank"), n.click();
    } else
      window.location.assign(t);
  }
  reset() {
    this.clearSuggestions(), this.resetSuggestions(), this.setActiveTool(null), this.query = "";
  }
}
jn = new WeakSet(), Xi = function() {
  this.query.length > 2 ? this.fetchSuggestionsThrottled() : this.clearSuggestions();
};
var hp = 0;
function m(e, t, n, r, i, o) {
  t || (t = {});
  var s, a, l = t;
  if ("ref" in l) for (a in l = {}, t) a == "ref" ? s = t[a] : l[a] = t[a];
  var c = { type: e, props: l, key: n, ref: s, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --hp, __i: -1, __u: 0, __source: i, __self: o };
  if (typeof e == "function" && (s = e.defaultProps)) for (a in s) l[a] === void 0 && (l[a] = s[a]);
  return os.vnode && os.vnode(c), c;
}
const Rl = ae({}), Po = ({
  children: e,
  store: t
}) => /* @__PURE__ */ m(Rl.Provider, {
  value: t,
  children: e
});
Po.propTypes = {
  children: v.node.isRequired,
  store: v.instanceOf(gn)
};
const Cl = typeof document < "u" ? G.useLayoutEffect : () => {
};
function Qi(e) {
  const t = D(null);
  return Cl(() => {
    t.current = e;
  }, [
    e
  ]), q((...n) => {
    const r = t.current;
    return r == null ? void 0 : r(...n);
  }, []);
}
const mt = (e) => {
  var t;
  return (t = e == null ? void 0 : e.ownerDocument) !== null && t !== void 0 ? t : document;
}, Pt = (e) => e && "window" in e && e.window === e ? e : mt(e).defaultView || window;
function vp(e) {
  return e !== null && typeof e == "object" && "nodeType" in e && typeof e.nodeType == "number";
}
function gp(e) {
  return vp(e) && e.nodeType === Node.DOCUMENT_FRAGMENT_NODE && "host" in e;
}
let mp = !1;
function Io() {
  return mp;
}
function Dl(e, t) {
  if (!Io()) return t && e ? e.contains(t) : !1;
  if (!e || !t) return !1;
  let n = t;
  for (; n !== null; ) {
    if (n === e) return !0;
    n.tagName === "SLOT" && n.assignedSlot ? n = n.assignedSlot.parentNode : gp(n) ? n = n.host : n = n.parentNode;
  }
  return !1;
}
const Zi = (e = document) => {
  var t;
  if (!Io()) return e.activeElement;
  let n = e.activeElement;
  for (; n && "shadowRoot" in n && (!((t = n.shadowRoot) === null || t === void 0) && t.activeElement); ) n = n.shadowRoot.activeElement;
  return n;
};
function $l(e) {
  return Io() && e.target.shadowRoot && e.composedPath ? e.composedPath()[0] : e.target;
}
var bp = {};
function _p(e) {
  var t;
  return typeof window > "u" || window.navigator == null ? !1 : ((t = window.navigator.userAgentData) === null || t === void 0 ? void 0 : t.brands.some((n) => e.test(n.brand))) || e.test(window.navigator.userAgent);
}
function yp(e) {
  var t;
  return typeof window < "u" && window.navigator != null ? e.test(((t = window.navigator.userAgentData) === null || t === void 0 ? void 0 : t.platform) || window.navigator.platform) : !1;
}
function Ll(e) {
  if (bp.NODE_ENV === "test") return e;
  let t = null;
  return () => (t == null && (t = e()), t);
}
const Ep = Ll(function() {
  return yp(/^Mac/i);
}), Op = Ll(function() {
  return _p(/Android/i);
});
function Pl() {
  let e = D(/* @__PURE__ */ new Map()), t = q((i, o, s, a) => {
    let l = a != null && a.once ? (...c) => {
      e.current.delete(s), s(...c);
    } : s;
    e.current.set(s, {
      type: o,
      eventTarget: i,
      fn: l,
      options: a
    }), i.addEventListener(o, l, a);
  }, []), n = q((i, o, s, a) => {
    var l;
    let c = ((l = e.current.get(s)) === null || l === void 0 ? void 0 : l.fn) || s;
    i.removeEventListener(o, c, a), e.current.delete(s);
  }, []), r = q(() => {
    e.current.forEach((i, o) => {
      n(i.eventTarget, i.type, o, i.options);
    });
  }, [
    n
  ]);
  return z(() => r, [
    r
  ]), {
    addGlobalListener: t,
    removeGlobalListener: n,
    removeAllGlobalListeners: r
  };
}
function wp(e) {
  return e.mozInputSource === 0 && e.isTrusted ? !0 : Op() && e.pointerType ? e.type === "click" && e.buttons === 1 : e.detail === 0 && !e.pointerType;
}
function Il(e) {
  let t = e;
  return t.nativeEvent = e, t.isDefaultPrevented = () => t.defaultPrevented, t.isPropagationStopped = () => t.cancelBubble, t.persist = () => {
  }, t;
}
function Sp(e, t) {
  Object.defineProperty(e, "target", {
    value: t
  }), Object.defineProperty(e, "currentTarget", {
    value: t
  });
}
function Vl(e) {
  let t = D({
    isFocused: !1,
    observer: null
  });
  Cl(() => {
    const r = t.current;
    return () => {
      r.observer && (r.observer.disconnect(), r.observer = null);
    };
  }, []);
  let n = Qi((r) => {
    e == null || e(r);
  });
  return q((r) => {
    if (r.target instanceof HTMLButtonElement || r.target instanceof HTMLInputElement || r.target instanceof HTMLTextAreaElement || r.target instanceof HTMLSelectElement) {
      t.current.isFocused = !0;
      let i = r.target, o = (s) => {
        if (t.current.isFocused = !1, i.disabled) {
          let a = Il(s);
          n(a);
        }
        t.current.observer && (t.current.observer.disconnect(), t.current.observer = null);
      };
      i.addEventListener("focusout", o, {
        once: !0
      }), t.current.observer = new MutationObserver(() => {
        if (t.current.isFocused && i.disabled) {
          var s;
          (s = t.current.observer) === null || s === void 0 || s.disconnect();
          let a = i === document.activeElement ? null : document.activeElement;
          i.dispatchEvent(new FocusEvent("blur", {
            relatedTarget: a
          })), i.dispatchEvent(new FocusEvent("focusout", {
            bubbles: !0,
            relatedTarget: a
          }));
        }
      }), t.current.observer.observe(i, {
        attributes: !0,
        attributeFilter: [
          "disabled"
        ]
      });
    }
  }, [
    n
  ]);
}
let Np = !1;
var Fl = {};
let Yn = null, Ji = /* @__PURE__ */ new Set(), Nn = /* @__PURE__ */ new Map(), Ut = !1, eo = !1;
const xp = {
  Tab: !0,
  Escape: !0
};
function Vo(e, t) {
  for (let n of Ji) n(e, t);
}
function Ap(e) {
  return !(e.metaKey || !Ep() && e.altKey || e.ctrlKey || e.key === "Control" || e.key === "Shift" || e.key === "Meta");
}
function Ar(e) {
  Ut = !0, Ap(e) && (Yn = "keyboard", Vo("keyboard", e));
}
function Le(e) {
  Yn = "pointer", (e.type === "mousedown" || e.type === "pointerdown") && (Ut = !0, Vo("pointer", e));
}
function Ml(e) {
  wp(e) && (Ut = !0, Yn = "virtual");
}
function jl(e) {
  e.target === window || e.target === document || Np || !e.isTrusted || (!Ut && !eo && (Yn = "virtual", Vo("virtual", e)), Ut = !1, eo = !1);
}
function kl() {
  Ut = !1, eo = !0;
}
function to(e) {
  if (typeof window > "u" || typeof document > "u" || Nn.get(Pt(e))) return;
  const t = Pt(e), n = mt(e);
  let r = t.HTMLElement.prototype.focus;
  t.HTMLElement.prototype.focus = function() {
    Ut = !0, r.apply(this, arguments);
  }, n.addEventListener("keydown", Ar, !0), n.addEventListener("keyup", Ar, !0), n.addEventListener("click", Ml, !0), t.addEventListener("focus", jl, !0), t.addEventListener("blur", kl, !1), typeof PointerEvent < "u" ? (n.addEventListener("pointerdown", Le, !0), n.addEventListener("pointermove", Le, !0), n.addEventListener("pointerup", Le, !0)) : Fl.NODE_ENV === "test" && (n.addEventListener("mousedown", Le, !0), n.addEventListener("mousemove", Le, !0), n.addEventListener("mouseup", Le, !0)), t.addEventListener("beforeunload", () => {
    Bl(e);
  }, {
    once: !0
  }), Nn.set(t, {
    focus: r
  });
}
const Bl = (e, t) => {
  const n = Pt(e), r = mt(e);
  t && r.removeEventListener("DOMContentLoaded", t), Nn.has(n) && (n.HTMLElement.prototype.focus = Nn.get(n).focus, r.removeEventListener("keydown", Ar, !0), r.removeEventListener("keyup", Ar, !0), r.removeEventListener("click", Ml, !0), n.removeEventListener("focus", jl, !0), n.removeEventListener("blur", kl, !1), typeof PointerEvent < "u" ? (r.removeEventListener("pointerdown", Le, !0), r.removeEventListener("pointermove", Le, !0), r.removeEventListener("pointerup", Le, !0)) : Fl.NODE_ENV === "test" && (r.removeEventListener("mousedown", Le, !0), r.removeEventListener("mousemove", Le, !0), r.removeEventListener("mouseup", Le, !0)), Nn.delete(n));
};
function Tp(e) {
  const t = mt(e);
  let n;
  return t.readyState !== "loading" ? to(e) : (n = () => {
    to(e);
  }, t.addEventListener("DOMContentLoaded", n)), () => Bl(e, n);
}
typeof document < "u" && Tp();
function Ul() {
  return Yn !== "pointer";
}
const Rp = /* @__PURE__ */ new Set([
  "checkbox",
  "radio",
  "range",
  "color",
  "file",
  "image",
  "button",
  "submit",
  "reset"
]);
function Cp(e, t, n) {
  let r = mt(n == null ? void 0 : n.target);
  const i = typeof window < "u" ? Pt(n == null ? void 0 : n.target).HTMLInputElement : HTMLInputElement, o = typeof window < "u" ? Pt(n == null ? void 0 : n.target).HTMLTextAreaElement : HTMLTextAreaElement, s = typeof window < "u" ? Pt(n == null ? void 0 : n.target).HTMLElement : HTMLElement, a = typeof window < "u" ? Pt(n == null ? void 0 : n.target).KeyboardEvent : KeyboardEvent;
  return e = e || r.activeElement instanceof i && !Rp.has(r.activeElement.type) || r.activeElement instanceof o || r.activeElement instanceof s && r.activeElement.isContentEditable, !(e && t === "keyboard" && n instanceof a && !xp[n.key]);
}
function Dp(e, t, n) {
  to(), z(() => {
    let r = (i, o) => {
      Cp(!!(n != null && n.isTextInput), i, o) && e(Ul());
    };
    return Ji.add(r), () => {
      Ji.delete(r);
    };
  }, t);
}
function $p(e) {
  let { isDisabled: t, onFocus: n, onBlur: r, onFocusChange: i } = e;
  const o = q((l) => {
    if (l.target === l.currentTarget)
      return r && r(l), i && i(!1), !0;
  }, [
    r,
    i
  ]), s = Vl(o), a = q((l) => {
    const c = mt(l.target), u = c ? Zi(c) : Zi();
    l.target === l.currentTarget && u === $l(l.nativeEvent) && (n && n(l), i && i(!0), s(l));
  }, [
    i,
    n,
    s
  ]);
  return {
    focusProps: {
      onFocus: !t && (n || i || r) ? a : void 0,
      onBlur: !t && (r || i) ? o : void 0
    }
  };
}
function Lp(e) {
  let { isDisabled: t, onBlurWithin: n, onFocusWithin: r, onFocusWithinChange: i } = e, o = D({
    isFocusWithin: !1
  }), { addGlobalListener: s, removeAllGlobalListeners: a } = Pl(), l = q((f) => {
    f.currentTarget.contains(f.target) && o.current.isFocusWithin && !f.currentTarget.contains(f.relatedTarget) && (o.current.isFocusWithin = !1, a(), n && n(f), i && i(!1));
  }, [
    n,
    i,
    o,
    a
  ]), c = Vl(l), u = q((f) => {
    if (!f.currentTarget.contains(f.target)) return;
    const h = mt(f.target), d = Zi(h);
    if (!o.current.isFocusWithin && d === $l(f.nativeEvent)) {
      r && r(f), i && i(!0), o.current.isFocusWithin = !0, c(f);
      let p = f.currentTarget;
      s(h, "focus", (g) => {
        if (o.current.isFocusWithin && !Dl(p, g.target)) {
          let b = new h.defaultView.FocusEvent("blur", {
            relatedTarget: g.target
          });
          Sp(b, p);
          let O = Il(b);
          l(O);
        }
      }, {
        capture: !0
      });
    }
  }, [
    r,
    i,
    c,
    s,
    l
  ]);
  return t ? {
    focusWithinProps: {
      // These cannot be null, that would conflict in mergeProps
      onFocus: void 0,
      onBlur: void 0
    }
  } : {
    focusWithinProps: {
      onFocus: u,
      onBlur: l
    }
  };
}
function Pp(e = {}) {
  let { autoFocus: t = !1, isTextInput: n, within: r } = e, i = D({
    isFocused: !1,
    isFocusVisible: t || Ul()
  }), [o, s] = W(!1), [a, l] = W(() => i.current.isFocused && i.current.isFocusVisible), c = q(() => l(i.current.isFocused && i.current.isFocusVisible), []), u = q((d) => {
    i.current.isFocused = d, s(d), c();
  }, [
    c
  ]);
  Dp((d) => {
    i.current.isFocusVisible = d, c();
  }, [], {
    isTextInput: n
  });
  let { focusProps: f } = $p({
    isDisabled: r,
    onFocusChange: u
  }), { focusWithinProps: h } = Lp({
    isDisabled: !r,
    onFocusWithinChange: u
  });
  return {
    isFocused: o,
    isFocusVisible: a,
    focusProps: r ? h : f
  };
}
function Ts(e) {
  if (!e) return;
  let t = !0;
  return (n) => {
    let r = {
      ...n,
      preventDefault() {
        n.preventDefault();
      },
      isDefaultPrevented() {
        return n.isDefaultPrevented();
      },
      stopPropagation() {
        t ? console.error("stopPropagation is now the default behavior for events in React Spectrum. You can use continuePropagation() to revert this behavior.") : t = !0;
      },
      continuePropagation() {
        t = !1;
      },
      isPropagationStopped() {
        return t;
      }
    };
    e(r), t && n.stopPropagation();
  };
}
function Ip(e) {
  return {
    keyboardProps: e.isDisabled ? {} : {
      onKeyDown: Ts(e.onKeyDown),
      onKeyUp: Ts(e.onKeyUp)
    }
  };
}
let Tr = !1, vi = 0;
function no() {
  Tr = !0, setTimeout(() => {
    Tr = !1;
  }, 50);
}
function Rs(e) {
  e.pointerType === "touch" && no();
}
function Vp() {
  if (!(typeof document > "u"))
    return typeof PointerEvent < "u" ? document.addEventListener("pointerup", Rs) : document.addEventListener("touchend", no), vi++, () => {
      vi--, !(vi > 0) && (typeof PointerEvent < "u" ? document.removeEventListener("pointerup", Rs) : document.removeEventListener("touchend", no));
    };
}
function Fp(e) {
  let { onHoverStart: t, onHoverChange: n, onHoverEnd: r, isDisabled: i } = e, [o, s] = W(!1), a = D({
    isHovered: !1,
    ignoreEmulatedMouseEvents: !1,
    pointerType: "",
    target: null
  }).current;
  z(Vp, []);
  let { addGlobalListener: l, removeAllGlobalListeners: c } = Pl(), { hoverProps: u, triggerHoverEnd: f } = U(() => {
    let h = (g, b) => {
      if (a.pointerType = b, i || b === "touch" || a.isHovered || !g.currentTarget.contains(g.target)) return;
      a.isHovered = !0;
      let O = g.currentTarget;
      a.target = O, l(mt(g.target), "pointerover", (_) => {
        a.isHovered && a.target && !Dl(a.target, _.target) && d(_, _.pointerType);
      }, {
        capture: !0
      }), t && t({
        type: "hoverstart",
        target: O,
        pointerType: b
      }), n && n(!0), s(!0);
    }, d = (g, b) => {
      let O = a.target;
      a.pointerType = "", a.target = null, !(b === "touch" || !a.isHovered || !O) && (a.isHovered = !1, c(), r && r({
        type: "hoverend",
        target: O,
        pointerType: b
      }), n && n(!1), s(!1));
    }, p = {};
    return typeof PointerEvent < "u" ? (p.onPointerEnter = (g) => {
      Tr && g.pointerType === "mouse" || h(g, g.pointerType);
    }, p.onPointerLeave = (g) => {
      !i && g.currentTarget.contains(g.target) && d(g, g.pointerType);
    }) : (p.onTouchStart = () => {
      a.ignoreEmulatedMouseEvents = !0;
    }, p.onMouseEnter = (g) => {
      !a.ignoreEmulatedMouseEvents && !Tr && h(g, "mouse"), a.ignoreEmulatedMouseEvents = !1;
    }, p.onMouseLeave = (g) => {
      !i && g.currentTarget.contains(g.target) && d(g, "mouse");
    }), {
      hoverProps: p,
      triggerHoverEnd: d
    };
  }, [
    t,
    n,
    r,
    i,
    a,
    l,
    c
  ]);
  return z(() => {
    i && f({
      currentTarget: a.target
    }, a.pointerType);
  }, [
    i
  ]), {
    hoverProps: u,
    isHovered: o
  };
}
function Mp(e) {
  let { ref: t, onInteractOutside: n, isDisabled: r, onInteractOutsideStart: i } = e, o = D({
    isPointerDown: !1,
    ignoreEmulatedMouseEvents: !1
  }), s = Qi((l) => {
    n && or(l, t) && (i && i(l), o.current.isPointerDown = !0);
  }), a = Qi((l) => {
    n && n(l);
  });
  z(() => {
    let l = o.current;
    if (r) return;
    const c = t.current, u = mt(c);
    if (typeof PointerEvent < "u") {
      let f = (h) => {
        l.isPointerDown && or(h, t) && a(h), l.isPointerDown = !1;
      };
      return u.addEventListener("pointerdown", s, !0), u.addEventListener("pointerup", f, !0), () => {
        u.removeEventListener("pointerdown", s, !0), u.removeEventListener("pointerup", f, !0);
      };
    } else {
      let f = (d) => {
        l.ignoreEmulatedMouseEvents ? l.ignoreEmulatedMouseEvents = !1 : l.isPointerDown && or(d, t) && a(d), l.isPointerDown = !1;
      }, h = (d) => {
        l.ignoreEmulatedMouseEvents = !0, l.isPointerDown && or(d, t) && a(d), l.isPointerDown = !1;
      };
      return u.addEventListener("mousedown", s, !0), u.addEventListener("mouseup", f, !0), u.addEventListener("touchstart", s, !0), u.addEventListener("touchend", h, !0), () => {
        u.removeEventListener("mousedown", s, !0), u.removeEventListener("mouseup", f, !0), u.removeEventListener("touchstart", s, !0), u.removeEventListener("touchend", h, !0);
      };
    }
  }, [
    t,
    r,
    s,
    a
  ]);
}
function or(e, t) {
  if (e.button > 0) return !1;
  if (e.target) {
    const n = e.target.ownerDocument;
    if (!n || !n.documentElement.contains(e.target) || e.target.closest("[data-react-aria-top-layer]")) return !1;
  }
  return t.current ? !e.composedPath().includes(t.current) : !1;
}
var jp = Object.defineProperty, kp = (e, t, n) => t in e ? jp(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n, gi = (e, t, n) => (kp(e, typeof t != "symbol" ? t + "" : t, n), n);
let Bp = class {
  constructor() {
    gi(this, "current", this.detect()), gi(this, "handoffState", "pending"), gi(this, "currentId", 0);
  }
  set(t) {
    this.current !== t && (this.handoffState = "pending", this.currentId = 0, this.current = t);
  }
  reset() {
    this.set(this.detect());
  }
  nextId() {
    return ++this.currentId;
  }
  get isServer() {
    return this.current === "server";
  }
  get isClient() {
    return this.current === "client";
  }
  detect() {
    return typeof window > "u" || typeof document > "u" ? "server" : "client";
  }
  handoff() {
    this.handoffState === "pending" && (this.handoffState = "complete");
  }
  get isHandoffComplete() {
    return this.handoffState === "complete";
  }
}, Ft = new Bp();
function Xn(e) {
  return Ft.isServer ? null : e instanceof Node ? e.ownerDocument : e != null && e.hasOwnProperty("current") && e.current instanceof Node ? e.current.ownerDocument : document;
}
function Hl(e) {
  typeof queueMicrotask == "function" ? queueMicrotask(e) : Promise.resolve().then(e).catch((t) => setTimeout(() => {
    throw t;
  }));
}
function bt() {
  let e = [], t = { addEventListener(n, r, i, o) {
    return n.addEventListener(r, i, o), t.add(() => n.removeEventListener(r, i, o));
  }, requestAnimationFrame(...n) {
    let r = requestAnimationFrame(...n);
    return t.add(() => cancelAnimationFrame(r));
  }, nextFrame(...n) {
    return t.requestAnimationFrame(() => t.requestAnimationFrame(...n));
  }, setTimeout(...n) {
    let r = setTimeout(...n);
    return t.add(() => clearTimeout(r));
  }, microTask(...n) {
    let r = { current: !0 };
    return Hl(() => {
      r.current && n[0]();
    }), t.add(() => {
      r.current = !1;
    });
  }, style(n, r, i) {
    let o = n.style.getPropertyValue(r);
    return Object.assign(n.style, { [r]: i }), this.add(() => {
      Object.assign(n.style, { [r]: o });
    });
  }, group(n) {
    let r = bt();
    return n(r), this.add(() => r.dispose());
  }, add(n) {
    return e.includes(n) || e.push(n), () => {
      let r = e.indexOf(n);
      if (r >= 0) for (let i of e.splice(r, 1)) i();
    };
  }, dispose() {
    for (let n of e.splice(0)) n();
  } };
  return t;
}
function zt() {
  let [e] = W(bt);
  return z(() => () => e.dispose(), [e]), e;
}
let re = (e, t) => {
  Ft.isServer ? z(e, t) : jr(e, t);
};
function Yt(e) {
  let t = D(e);
  return re(() => {
    t.current = e;
  }, [e]), t;
}
let H = function(e) {
  let t = Yt(e);
  return G.useCallback((...n) => t.current(...n), [t]);
};
function Up(e) {
  let t = e.width / 2, n = e.height / 2;
  return { top: e.clientY - n, right: e.clientX + t, bottom: e.clientY + n, left: e.clientX - t };
}
function Hp(e, t) {
  return !(!e || !t || e.right < t.left || e.left > t.right || e.bottom < t.top || e.top > t.bottom);
}
function Gp({ disabled: e = !1 } = {}) {
  let t = D(null), [n, r] = W(!1), i = zt(), o = H(() => {
    t.current = null, r(!1), i.dispose();
  }), s = H((a) => {
    if (i.dispose(), t.current === null) {
      t.current = a.currentTarget, r(!0);
      {
        let l = Xn(a.currentTarget);
        i.addEventListener(l, "pointerup", o, !1), i.addEventListener(l, "pointermove", (c) => {
          if (t.current) {
            let u = Up(c);
            r(Hp(u, t.current.getBoundingClientRect()));
          }
        }, !1), i.addEventListener(l, "pointercancel", o, !1);
      }
    }
  });
  return { pressed: n, pressProps: e ? {} : { onPointerDown: s, onPointerUp: o, onClick: o } };
}
let qp = ae(void 0);
function Fo() {
  return Z(qp);
}
function ro(...e) {
  return Array.from(new Set(e.flatMap((t) => typeof t == "string" ? t.split(" ") : []))).filter(Boolean).join(" ");
}
function Qe(e, t, ...n) {
  if (e in t) {
    let i = t[e];
    return typeof i == "function" ? i(...n) : i;
  }
  let r = new Error(`Tried to handle "${e}" but there is no handler defined. Only defined handlers are: ${Object.keys(t).map((i) => `"${i}"`).join(", ")}.`);
  throw Error.captureStackTrace && Error.captureStackTrace(r, Qe), r;
}
var Rr = ((e) => (e[e.None = 0] = "None", e[e.RenderStrategy = 1] = "RenderStrategy", e[e.Static = 2] = "Static", e))(Rr || {}), Ot = ((e) => (e[e.Unmount = 0] = "Unmount", e[e.Hidden = 1] = "Hidden", e))(Ot || {});
function De() {
  let e = Kp();
  return q((t) => Wp({ mergeRefs: e, ...t }), [e]);
}
function Wp({ ourProps: e, theirProps: t, slot: n, defaultTag: r, features: i, visible: o = !0, name: s, mergeRefs: a }) {
  a = a ?? zp;
  let l = Gl(t, e);
  if (o) return sr(l, n, r, s, a);
  let c = i ?? 0;
  if (c & 2) {
    let { static: u = !1, ...f } = l;
    if (u) return sr(f, n, r, s, a);
  }
  if (c & 1) {
    let { unmount: u = !0, ...f } = l;
    return Qe(u ? 0 : 1, { 0() {
      return null;
    }, 1() {
      return sr({ ...f, hidden: !0, style: { display: "none" } }, n, r, s, a);
    } });
  }
  return sr(l, n, r, s, a);
}
function sr(e, t = {}, n, r, i) {
  let { as: o = n, children: s, refName: a = "ref", ...l } = mi(e, ["unmount", "static"]), c = e.ref !== void 0 ? { [a]: e.ref } : {}, u = typeof s == "function" ? s(t) : s;
  "className" in l && l.className && typeof l.className == "function" && (l.className = l.className(t)), l["aria-labelledby"] && l["aria-labelledby"] === l.id && (l["aria-labelledby"] = void 0);
  let f = {};
  if (t) {
    let h = !1, d = [];
    for (let [p, g] of Object.entries(t)) typeof g == "boolean" && (h = !0), g === !0 && d.push(p.replace(/([A-Z])/g, (b) => `-${b.toLowerCase()}`));
    if (h) {
      f["data-headlessui-state"] = d.join(" ");
      for (let p of d) f[`data-${p}`] = "";
    }
  }
  if (o === de && (Object.keys(yt(l)).length > 0 || Object.keys(yt(f)).length > 0)) if (!An(u) || Array.isArray(u) && u.length > 1) {
    if (Object.keys(yt(l)).length > 0) throw new Error(['Passing props on "Fragment"!', "", `The current component <${r} /> is rendering a "Fragment".`, "However we need to passthrough the following props:", Object.keys(yt(l)).concat(Object.keys(yt(f))).map((h) => `  - ${h}`).join(`
`), "", "You can apply a few solutions:", ['Add an `as="..."` prop, to ensure that we render an actual element instead of a "Fragment".', "Render a single element as the child so that we can forward the props onto that element."].map((h) => `  - ${h}`).join(`
`)].join(`
`));
  } else {
    let h = u.props, d = h == null ? void 0 : h.className, p = typeof d == "function" ? (...O) => ro(d(...O), l.className) : ro(d, l.className), g = p ? { className: p } : {}, b = Gl(u.props, yt(mi(l, ["ref"])));
    for (let O in f) O in b && delete f[O];
    return mo(u, Object.assign({}, b, f, c, { ref: i(Yp(u), c.ref) }, g));
  }
  return Fe(o, Object.assign({}, mi(l, ["ref"]), o !== de && c, o !== de && f), u);
}
function Kp() {
  let e = D([]), t = q((n) => {
    for (let r of e.current) r != null && (typeof r == "function" ? r(n) : r.current = n);
  }, []);
  return (...n) => {
    if (!n.every((r) => r == null)) return e.current = n, t;
  };
}
function zp(...e) {
  return e.every((t) => t == null) ? void 0 : (t) => {
    for (let n of e) n != null && (typeof n == "function" ? n(t) : n.current = t);
  };
}
function Gl(...e) {
  if (e.length === 0) return {};
  if (e.length === 1) return e[0];
  let t = {}, n = {};
  for (let r of e) for (let i in r) i.startsWith("on") && typeof r[i] == "function" ? (n[i] != null || (n[i] = []), n[i].push(r[i])) : t[i] = r[i];
  if (t.disabled || t["aria-disabled"]) for (let r in n) /^(on(?:Click|Pointer|Mouse|Key)(?:Down|Up|Press)?)$/.test(r) && (n[r] = [(i) => {
    var o;
    return (o = i == null ? void 0 : i.preventDefault) == null ? void 0 : o.call(i);
  }]);
  for (let r in n) Object.assign(t, { [r](i, ...o) {
    let s = n[r];
    for (let a of s) {
      if ((i instanceof Event || (i == null ? void 0 : i.nativeEvent) instanceof Event) && i.defaultPrevented) return;
      a(i, ...o);
    }
  } });
  return t;
}
function ql(...e) {
  if (e.length === 0) return {};
  if (e.length === 1) return e[0];
  let t = {}, n = {};
  for (let r of e) for (let i in r) i.startsWith("on") && typeof r[i] == "function" ? (n[i] != null || (n[i] = []), n[i].push(r[i])) : t[i] = r[i];
  for (let r in n) Object.assign(t, { [r](...i) {
    let o = n[r];
    for (let s of o) s == null || s(...i);
  } });
  return t;
}
function Oe(e) {
  var t;
  return Object.assign(ht(e), { displayName: (t = e.displayName) != null ? t : e.name });
}
function yt(e) {
  let t = Object.assign({}, e);
  for (let n in t) t[n] === void 0 && delete t[n];
  return t;
}
function mi(e, t = []) {
  let n = Object.assign({}, e);
  for (let r of t) r in n && delete n[r];
  return n;
}
function Yp(e) {
  return G.version.split(".")[0] >= "19" ? e.props.ref : e.ref;
}
function Xp(e, t, n) {
  let [r, i] = W(n), o = e !== void 0, s = D(o), a = D(!1), l = D(!1);
  return o && !s.current && !a.current ? (a.current = !0, s.current = o, console.error("A component is changing from uncontrolled to controlled. This may be caused by the value changing from undefined to a defined value, which should not happen.")) : !o && s.current && !l.current && (l.current = !0, s.current = o, console.error("A component is changing from controlled to uncontrolled. This may be caused by the value changing from a defined value to undefined, which should not happen.")), [o ? e : r, H((c) => (o || i(c), t == null ? void 0 : t(c)))];
}
function Qp(e) {
  let [t] = W(e);
  return t;
}
function Wl(e = {}, t = null, n = []) {
  for (let [r, i] of Object.entries(e)) zl(n, Kl(t, r), i);
  return n;
}
function Kl(e, t) {
  return e ? e + "[" + t + "]" : t;
}
function zl(e, t, n) {
  if (Array.isArray(n)) for (let [r, i] of n.entries()) zl(e, Kl(t, r.toString()), i);
  else n instanceof Date ? e.push([t, n.toISOString()]) : typeof n == "boolean" ? e.push([t, n ? "1" : "0"]) : typeof n == "string" ? e.push([t, n]) : typeof n == "number" ? e.push([t, `${n}`]) : n == null ? e.push([t, ""]) : Wl(n, t, e);
}
function Zp(e) {
  var t, n;
  let r = (t = e == null ? void 0 : e.form) != null ? t : e.closest("form");
  if (r) {
    for (let i of r.elements) if (i !== e && (i.tagName === "INPUT" && i.type === "submit" || i.tagName === "BUTTON" && i.type === "submit" || i.nodeName === "INPUT" && i.type === "image")) {
      i.click();
      return;
    }
    (n = r.requestSubmit) == null || n.call(r);
  }
}
let Jp = "span";
var Mo = ((e) => (e[e.None = 1] = "None", e[e.Focusable = 2] = "Focusable", e[e.Hidden = 4] = "Hidden", e))(Mo || {});
function eh(e, t) {
  var n;
  let { features: r = 1, ...i } = e, o = { ref: t, "aria-hidden": (r & 2) === 2 ? !0 : (n = i["aria-hidden"]) != null ? n : void 0, hidden: (r & 4) === 4 ? !0 : void 0, style: { position: "fixed", top: 1, left: 1, width: 1, height: 0, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", borderWidth: "0", ...(r & 4) === 4 && (r & 2) !== 2 && { display: "none" } } };
  return De()({ ourProps: o, theirProps: i, slot: {}, defaultTag: Jp, name: "Hidden" });
}
let Yl = Oe(eh), th = ae(null);
function nh({ children: e }) {
  let t = Z(th);
  if (!t) return G.createElement(G.Fragment, null, e);
  let { target: n } = t;
  return n ? ga(G.createElement(G.Fragment, null, e), n) : null;
}
function rh({ data: e, form: t, disabled: n, onReset: r, overrides: i }) {
  let [o, s] = W(null), a = zt();
  return z(() => {
    if (r && o) return a.addEventListener(o, "reset", r);
  }, [o, t, r]), G.createElement(nh, null, G.createElement(ih, { setForm: s, formId: t }), Wl(e).map(([l, c]) => G.createElement(Yl, { features: Mo.Hidden, ...yt({ key: l, as: "input", type: "hidden", hidden: !0, readOnly: !0, form: t, disabled: n, name: l, value: c, ...i }) })));
}
function ih({ setForm: e, formId: t }) {
  return z(() => {
    if (t) {
      let n = document.getElementById(t);
      n && e(n);
    }
  }, [e, t]), t ? null : G.createElement(Yl, { features: Mo.Hidden, as: "input", type: "hidden", hidden: !0, readOnly: !0, ref: (n) => {
    if (!n) return;
    let r = n.closest("form");
    r && e(r);
  } });
}
let oh = ae(void 0);
function Xl() {
  return Z(oh);
}
function sh(e) {
  let t = e.parentElement, n = null;
  for (; t && !(t instanceof HTMLFieldSetElement); ) t instanceof HTMLLegendElement && (n = t), t = t.parentElement;
  let r = (t == null ? void 0 : t.getAttribute("disabled")) === "";
  return r && ah(n) ? !1 : r;
}
function ah(e) {
  if (!e) return !1;
  let t = e.previousElementSibling;
  for (; t !== null; ) {
    if (t instanceof HTMLLegendElement) return !1;
    t = t.previousElementSibling;
  }
  return !0;
}
let Ql = Symbol();
function lh(e, t = !0) {
  return Object.assign(e, { [Ql]: t });
}
function Ge(...e) {
  let t = D(e);
  z(() => {
    t.current = e;
  }, [e]);
  let n = H((r) => {
    for (let i of t.current) i != null && (typeof i == "function" ? i(r) : i.current = r);
  });
  return e.every((r) => r == null || (r == null ? void 0 : r[Ql])) ? void 0 : n;
}
let jo = ae(null);
jo.displayName = "DescriptionContext";
function Zl() {
  let e = Z(jo);
  if (e === null) {
    let t = new Error("You used a <Description /> component, but it is not inside a relevant parent.");
    throw Error.captureStackTrace && Error.captureStackTrace(t, Zl), t;
  }
  return e;
}
function uh() {
  var e, t;
  return (t = (e = Z(jo)) == null ? void 0 : e.value) != null ? t : void 0;
}
let ch = "p";
function fh(e, t) {
  let n = dn(), r = Fo(), { id: i = `headlessui-description-${n}`, ...o } = e, s = Zl(), a = Ge(t);
  re(() => s.register(i), [i, s.register]);
  let l = r || !1, c = U(() => ({ ...s.slot, disabled: l }), [s.slot, l]), u = { ref: a, ...s.props, id: i };
  return De()({ ourProps: u, theirProps: o, slot: c, defaultTag: ch, name: s.name || "Description" });
}
let dh = Oe(fh);
Object.assign(dh, {});
var fe = ((e) => (e.Space = " ", e.Enter = "Enter", e.Escape = "Escape", e.Backspace = "Backspace", e.Delete = "Delete", e.ArrowLeft = "ArrowLeft", e.ArrowUp = "ArrowUp", e.ArrowRight = "ArrowRight", e.ArrowDown = "ArrowDown", e.Home = "Home", e.End = "End", e.PageUp = "PageUp", e.PageDown = "PageDown", e.Tab = "Tab", e))(fe || {});
let Yr = ae(null);
Yr.displayName = "LabelContext";
function Jl() {
  let e = Z(Yr);
  if (e === null) {
    let t = new Error("You used a <Label /> component, but it is not inside a relevant parent.");
    throw Error.captureStackTrace && Error.captureStackTrace(t, Jl), t;
  }
  return e;
}
function eu(e) {
  var t, n, r;
  let i = (n = (t = Z(Yr)) == null ? void 0 : t.value) != null ? n : void 0;
  return ((r = e == null ? void 0 : e.length) != null ? r : 0) > 0 ? [i, ...e].filter(Boolean).join(" ") : i;
}
function ph({ inherit: e = !1 } = {}) {
  let t = eu(), [n, r] = W([]), i = e ? [t, ...n].filter(Boolean) : n;
  return [i.length > 0 ? i.join(" ") : void 0, U(() => function(o) {
    let s = H((l) => (r((c) => [...c, l]), () => r((c) => {
      let u = c.slice(), f = u.indexOf(l);
      return f !== -1 && u.splice(f, 1), u;
    }))), a = U(() => ({ register: s, slot: o.slot, name: o.name, props: o.props, value: o.value }), [s, o.slot, o.name, o.props, o.value]);
    return G.createElement(Yr.Provider, { value: a }, o.children);
  }, [r])];
}
let hh = "label";
function vh(e, t) {
  var n;
  let r = dn(), i = Jl(), o = Xl(), s = Fo(), { id: a = `headlessui-label-${r}`, htmlFor: l = o ?? ((n = i.props) == null ? void 0 : n.htmlFor), passive: c = !1, ...u } = e, f = Ge(t);
  re(() => i.register(a), [a, i.register]);
  let h = H((b) => {
    let O = b.currentTarget;
    if (O instanceof HTMLLabelElement && b.preventDefault(), i.props && "onClick" in i.props && typeof i.props.onClick == "function" && i.props.onClick(b), O instanceof HTMLLabelElement) {
      let _ = document.getElementById(O.htmlFor);
      if (_) {
        let E = _.getAttribute("disabled");
        if (E === "true" || E === "") return;
        let S = _.getAttribute("aria-disabled");
        if (S === "true" || S === "") return;
        (_ instanceof HTMLInputElement && (_.type === "radio" || _.type === "checkbox") || _.role === "radio" || _.role === "checkbox" || _.role === "switch") && _.click(), _.focus({ preventScroll: !0 });
      }
    }
  }), d = s || !1, p = U(() => ({ ...i.slot, disabled: d }), [i.slot, d]), g = { ref: f, ...i.props, id: a, htmlFor: l, onClick: h };
  return c && ("onClick" in g && (delete g.htmlFor, delete g.onClick), "onClick" in u && delete u.onClick), De()({ ourProps: g, theirProps: u, slot: p, defaultTag: l ? hh : "div", name: i.name || "Label" });
}
let gh = Oe(vh), mh = Object.assign(gh, {});
function bh(e, t) {
  return e !== null && t !== null && typeof e == "object" && typeof t == "object" && "id" in e && "id" in t ? e.id === t.id : e === t;
}
function _h(e = bh) {
  return q((t, n) => {
    if (typeof e == "string") {
      let r = e;
      return (t == null ? void 0 : t[r]) === (n == null ? void 0 : n[r]);
    }
    return e(t, n);
  }, [e]);
}
function yh(e) {
  if (e === null) return { width: 0, height: 0 };
  let { width: t, height: n } = e.getBoundingClientRect();
  return { width: t, height: n };
}
function Eh(e, t = !1) {
  let [n, r] = bo(() => ({}), {}), i = U(() => yh(e), [e, n]);
  return re(() => {
    if (!e) return;
    let o = new ResizeObserver(r);
    return o.observe(e), () => {
      o.disconnect();
    };
  }, [e]), t ? { width: `${i.width}px`, height: `${i.height}px` } : i;
}
let Oh = class extends Map {
  constructor(t) {
    super(), this.factory = t;
  }
  get(t) {
    let n = super.get(t);
    return n === void 0 && (n = this.factory(t), this.set(t, n)), n;
  }
};
function tu(e, t) {
  let n = e(), r = /* @__PURE__ */ new Set();
  return { getSnapshot() {
    return n;
  }, subscribe(i) {
    return r.add(i), () => r.delete(i);
  }, dispatch(i, ...o) {
    let s = t[i].call(n, ...o);
    s && (n = s, r.forEach((a) => a()));
  } };
}
function nu(e) {
  return ma(e.subscribe, e.getSnapshot, e.getSnapshot);
}
let wh = new Oh(() => tu(() => [], { ADD(e) {
  return this.includes(e) ? this : [...this, e];
}, REMOVE(e) {
  let t = this.indexOf(e);
  if (t === -1) return this;
  let n = this.slice();
  return n.splice(t, 1), n;
} }));
function ko(e, t) {
  let n = wh.get(t), r = dn(), i = nu(n);
  if (re(() => {
    if (e) return n.dispatch("ADD", r), () => n.dispatch("REMOVE", r);
  }, [n, e]), !e) return !1;
  let o = i.indexOf(r), s = i.length;
  return o === -1 && (o = s, s += 1), o === s - 1;
}
let io = /* @__PURE__ */ new Map(), xn = /* @__PURE__ */ new Map();
function Cs(e) {
  var t;
  let n = (t = xn.get(e)) != null ? t : 0;
  return xn.set(e, n + 1), n !== 0 ? () => Ds(e) : (io.set(e, { "aria-hidden": e.getAttribute("aria-hidden"), inert: e.inert }), e.setAttribute("aria-hidden", "true"), e.inert = !0, () => Ds(e));
}
function Ds(e) {
  var t;
  let n = (t = xn.get(e)) != null ? t : 1;
  if (n === 1 ? xn.delete(e) : xn.set(e, n - 1), n !== 1) return;
  let r = io.get(e);
  r && (r["aria-hidden"] === null ? e.removeAttribute("aria-hidden") : e.setAttribute("aria-hidden", r["aria-hidden"]), e.inert = r.inert, io.delete(e));
}
function Sh(e, { allowed: t, disallowed: n } = {}) {
  let r = ko(e, "inert-others");
  re(() => {
    var i, o;
    if (!r) return;
    let s = bt();
    for (let l of (i = n == null ? void 0 : n()) != null ? i : []) l && s.add(Cs(l));
    let a = (o = t == null ? void 0 : t()) != null ? o : [];
    for (let l of a) {
      if (!l) continue;
      let c = Xn(l);
      if (!c) continue;
      let u = l.parentElement;
      for (; u && u !== c.body; ) {
        for (let f of u.children) a.some((h) => f.contains(h)) || s.add(Cs(f));
        u = u.parentElement;
      }
    }
    return s.dispose;
  }, [r, t, n]);
}
function Nh(e, t, n) {
  let r = Yt((i) => {
    let o = i.getBoundingClientRect();
    o.x === 0 && o.y === 0 && o.width === 0 && o.height === 0 && n();
  });
  z(() => {
    if (!e) return;
    let i = t === null ? null : t instanceof HTMLElement ? t : t.current;
    if (!i) return;
    let o = bt();
    if (typeof ResizeObserver < "u") {
      let s = new ResizeObserver(() => r.current(i));
      s.observe(i), o.add(() => s.disconnect());
    }
    if (typeof IntersectionObserver < "u") {
      let s = new IntersectionObserver(() => r.current(i));
      s.observe(i), o.add(() => s.disconnect());
    }
    return () => o.dispose();
  }, [t, r, e]);
}
let oo = ["[contentEditable=true]", "[tabindex]", "a[href]", "area[href]", "button:not([disabled])", "iframe", "input:not([disabled])", "select:not([disabled])", "textarea:not([disabled])"].map((e) => `${e}:not([tabindex='-1'])`).join(","), xh = ["[data-autofocus]"].map((e) => `${e}:not([tabindex='-1'])`).join(",");
var so = ((e) => (e[e.First = 1] = "First", e[e.Previous = 2] = "Previous", e[e.Next = 4] = "Next", e[e.Last = 8] = "Last", e[e.WrapAround = 16] = "WrapAround", e[e.NoScroll = 32] = "NoScroll", e[e.AutoFocus = 64] = "AutoFocus", e))(so || {}), Ah = ((e) => (e[e.Error = 0] = "Error", e[e.Overflow = 1] = "Overflow", e[e.Success = 2] = "Success", e[e.Underflow = 3] = "Underflow", e))(Ah || {}), Th = ((e) => (e[e.Previous = -1] = "Previous", e[e.Next = 1] = "Next", e))(Th || {});
function ru(e = document.body) {
  return e == null ? [] : Array.from(e.querySelectorAll(oo)).sort((t, n) => Math.sign((t.tabIndex || Number.MAX_SAFE_INTEGER) - (n.tabIndex || Number.MAX_SAFE_INTEGER)));
}
function Rh(e = document.body) {
  return e == null ? [] : Array.from(e.querySelectorAll(xh)).sort((t, n) => Math.sign((t.tabIndex || Number.MAX_SAFE_INTEGER) - (n.tabIndex || Number.MAX_SAFE_INTEGER)));
}
var Bo = ((e) => (e[e.Strict = 0] = "Strict", e[e.Loose = 1] = "Loose", e))(Bo || {});
function iu(e, t = 0) {
  var n;
  return e === ((n = Xn(e)) == null ? void 0 : n.body) ? !1 : Qe(t, { 0() {
    return e.matches(oo);
  }, 1() {
    let r = e;
    for (; r !== null; ) {
      if (r.matches(oo)) return !0;
      r = r.parentElement;
    }
    return !1;
  } });
}
var Ch = ((e) => (e[e.Keyboard = 0] = "Keyboard", e[e.Mouse = 1] = "Mouse", e))(Ch || {});
typeof window < "u" && typeof document < "u" && (document.addEventListener("keydown", (e) => {
  e.metaKey || e.altKey || e.ctrlKey || (document.documentElement.dataset.headlessuiFocusVisible = "");
}, !0), document.addEventListener("click", (e) => {
  e.detail === 1 ? delete document.documentElement.dataset.headlessuiFocusVisible : e.detail === 0 && (document.documentElement.dataset.headlessuiFocusVisible = "");
}, !0));
let Dh = ["textarea", "input"].join(",");
function $h(e) {
  var t, n;
  return (n = (t = e == null ? void 0 : e.matches) == null ? void 0 : t.call(e, Dh)) != null ? n : !1;
}
function ou(e, t = (n) => n) {
  return e.slice().sort((n, r) => {
    let i = t(n), o = t(r);
    if (i === null || o === null) return 0;
    let s = i.compareDocumentPosition(o);
    return s & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : s & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
  });
}
function Lh(e, t) {
  return Ph(ru(), t, { relativeTo: e });
}
function Ph(e, t, { sorted: n = !0, relativeTo: r = null, skipElements: i = [] } = {}) {
  let o = Array.isArray(e) ? e.length > 0 ? e[0].ownerDocument : document : e.ownerDocument, s = Array.isArray(e) ? n ? ou(e) : e : t & 64 ? Rh(e) : ru(e);
  i.length > 0 && s.length > 1 && (s = s.filter((d) => !i.some((p) => p != null && "current" in p ? (p == null ? void 0 : p.current) === d : p === d))), r = r ?? o.activeElement;
  let a = (() => {
    if (t & 5) return 1;
    if (t & 10) return -1;
    throw new Error("Missing Focus.First, Focus.Previous, Focus.Next or Focus.Last");
  })(), l = (() => {
    if (t & 1) return 0;
    if (t & 2) return Math.max(0, s.indexOf(r)) - 1;
    if (t & 4) return Math.max(0, s.indexOf(r)) + 1;
    if (t & 8) return s.length - 1;
    throw new Error("Missing Focus.First, Focus.Previous, Focus.Next or Focus.Last");
  })(), c = t & 32 ? { preventScroll: !0 } : {}, u = 0, f = s.length, h;
  do {
    if (u >= f || u + f <= 0) return 0;
    let d = l + u;
    if (t & 16) d = (d + f) % f;
    else {
      if (d < 0) return 3;
      if (d >= f) return 1;
    }
    h = s[d], h == null || h.focus(c), u += a;
  } while (h !== o.activeElement);
  return t & 6 && $h(h) && h.select(), 2;
}
function su() {
  return /iPhone/gi.test(window.navigator.platform) || /Mac/gi.test(window.navigator.platform) && window.navigator.maxTouchPoints > 0;
}
function Ih() {
  return /Android/gi.test(window.navigator.userAgent);
}
function Vh() {
  return su() || Ih();
}
function wn(e, t, n, r) {
  let i = Yt(n);
  z(() => {
    if (!e) return;
    function o(s) {
      i.current(s);
    }
    return document.addEventListener(t, o, r), () => document.removeEventListener(t, o, r);
  }, [e, t, r]);
}
function Fh(e, t, n, r) {
  let i = Yt(n);
  z(() => {
    if (!e) return;
    function o(s) {
      i.current(s);
    }
    return window.addEventListener(t, o, r), () => window.removeEventListener(t, o, r);
  }, [e, t, r]);
}
const $s = 30;
function Mh(e, t, n) {
  let r = ko(e, "outside-click"), i = Yt(n), o = q(function(l, c) {
    if (l.defaultPrevented) return;
    let u = c(l);
    if (u === null || !u.getRootNode().contains(u) || !u.isConnected) return;
    let f = function h(d) {
      return typeof d == "function" ? h(d()) : Array.isArray(d) || d instanceof Set ? d : [d];
    }(t);
    for (let h of f) if (h !== null && (h.contains(u) || l.composed && l.composedPath().includes(h))) return;
    return !iu(u, Bo.Loose) && u.tabIndex !== -1 && l.preventDefault(), i.current(l, u);
  }, [i, t]), s = D(null);
  wn(r, "pointerdown", (l) => {
    var c, u;
    s.current = ((u = (c = l.composedPath) == null ? void 0 : c.call(l)) == null ? void 0 : u[0]) || l.target;
  }, !0), wn(r, "mousedown", (l) => {
    var c, u;
    s.current = ((u = (c = l.composedPath) == null ? void 0 : c.call(l)) == null ? void 0 : u[0]) || l.target;
  }, !0), wn(r, "click", (l) => {
    Vh() || s.current && (o(l, () => s.current), s.current = null);
  }, !0);
  let a = D({ x: 0, y: 0 });
  wn(r, "touchstart", (l) => {
    a.current.x = l.touches[0].clientX, a.current.y = l.touches[0].clientY;
  }, !0), wn(r, "touchend", (l) => {
    let c = { x: l.changedTouches[0].clientX, y: l.changedTouches[0].clientY };
    if (!(Math.abs(c.x - a.current.x) >= $s || Math.abs(c.y - a.current.y) >= $s)) return o(l, () => l.target instanceof HTMLElement ? l.target : null);
  }, !0), Fh(r, "blur", (l) => o(l, () => window.document.activeElement instanceof HTMLIFrameElement ? window.document.activeElement : null), !0);
}
function Uo(...e) {
  return U(() => Xn(...e), [...e]);
}
function jh(e, t) {
  return U(() => {
    var n;
    if (e.type) return e.type;
    let r = (n = e.as) != null ? n : "button";
    if (typeof r == "string" && r.toLowerCase() === "button" || (t == null ? void 0 : t.tagName) === "BUTTON" && !t.hasAttribute("type")) return "button";
  }, [e.type, e.as, t]);
}
function kh() {
  let e;
  return { before({ doc: t }) {
    var n;
    let r = t.documentElement, i = (n = t.defaultView) != null ? n : window;
    e = Math.max(0, i.innerWidth - r.clientWidth);
  }, after({ doc: t, d: n }) {
    let r = t.documentElement, i = Math.max(0, r.clientWidth - r.offsetWidth), o = Math.max(0, e - i);
    n.style(r, "paddingRight", `${o}px`);
  } };
}
function Bh() {
  return su() ? { before({ doc: e, d: t, meta: n }) {
    function r(i) {
      return n.containers.flatMap((o) => o()).some((o) => o.contains(i));
    }
    t.microTask(() => {
      var i;
      if (window.getComputedStyle(e.documentElement).scrollBehavior !== "auto") {
        let a = bt();
        a.style(e.documentElement, "scrollBehavior", "auto"), t.add(() => t.microTask(() => a.dispose()));
      }
      let o = (i = window.scrollY) != null ? i : window.pageYOffset, s = null;
      t.addEventListener(e, "click", (a) => {
        if (a.target instanceof HTMLElement) try {
          let l = a.target.closest("a");
          if (!l) return;
          let { hash: c } = new URL(l.href), u = e.querySelector(c);
          u && !r(u) && (s = u);
        } catch {
        }
      }, !0), t.addEventListener(e, "touchstart", (a) => {
        if (a.target instanceof HTMLElement) if (r(a.target)) {
          let l = a.target;
          for (; l.parentElement && r(l.parentElement); ) l = l.parentElement;
          t.style(l, "overscrollBehavior", "contain");
        } else t.style(a.target, "touchAction", "none");
      }), t.addEventListener(e, "touchmove", (a) => {
        if (a.target instanceof HTMLElement) {
          if (a.target.tagName === "INPUT") return;
          if (r(a.target)) {
            let l = a.target;
            for (; l.parentElement && l.dataset.headlessuiPortal !== "" && !(l.scrollHeight > l.clientHeight || l.scrollWidth > l.clientWidth); ) l = l.parentElement;
            l.dataset.headlessuiPortal === "" && a.preventDefault();
          } else a.preventDefault();
        }
      }, { passive: !1 }), t.add(() => {
        var a;
        let l = (a = window.scrollY) != null ? a : window.pageYOffset;
        o !== l && window.scrollTo(0, o), s && s.isConnected && (s.scrollIntoView({ block: "nearest" }), s = null);
      });
    });
  } } : {};
}
function Uh() {
  return { before({ doc: e, d: t }) {
    t.style(e.documentElement, "overflow", "hidden");
  } };
}
function Hh(e) {
  let t = {};
  for (let n of e) Object.assign(t, n(t));
  return t;
}
let It = tu(() => /* @__PURE__ */ new Map(), { PUSH(e, t) {
  var n;
  let r = (n = this.get(e)) != null ? n : { doc: e, count: 0, d: bt(), meta: /* @__PURE__ */ new Set() };
  return r.count++, r.meta.add(t), this.set(e, r), this;
}, POP(e, t) {
  let n = this.get(e);
  return n && (n.count--, n.meta.delete(t)), this;
}, SCROLL_PREVENT({ doc: e, d: t, meta: n }) {
  let r = { doc: e, d: t, meta: Hh(n) }, i = [Bh(), kh(), Uh()];
  i.forEach(({ before: o }) => o == null ? void 0 : o(r)), i.forEach(({ after: o }) => o == null ? void 0 : o(r));
}, SCROLL_ALLOW({ d: e }) {
  e.dispose();
}, TEARDOWN({ doc: e }) {
  this.delete(e);
} });
It.subscribe(() => {
  let e = It.getSnapshot(), t = /* @__PURE__ */ new Map();
  for (let [n] of e) t.set(n, n.documentElement.style.overflow);
  for (let n of e.values()) {
    let r = t.get(n.doc) === "hidden", i = n.count !== 0;
    (i && !r || !i && r) && It.dispatch(n.count > 0 ? "SCROLL_PREVENT" : "SCROLL_ALLOW", n), n.count === 0 && It.dispatch("TEARDOWN", n);
  }
});
function Gh(e, t, n = () => ({ containers: [] })) {
  let r = nu(It), i = t ? r.get(t) : void 0, o = i ? i.count > 0 : !1;
  return re(() => {
    if (!(!t || !e)) return It.dispatch("PUSH", t, n), () => It.dispatch("POP", t, n);
  }, [e, t]), o;
}
function qh(e, t, n = () => [document.body]) {
  let r = ko(e, "scroll-lock");
  Gh(r, t, (i) => {
    var o;
    return { containers: [...(o = i.containers) != null ? o : [], n] };
  });
}
function Ls(e) {
  return [e.screenX, e.screenY];
}
function Wh() {
  let e = D([-1, -1]);
  return { wasMoved(t) {
    let n = Ls(t);
    return e.current[0] === n[0] && e.current[1] === n[1] ? !1 : (e.current = n, !0);
  }, update(t) {
    e.current = Ls(t);
  } };
}
function Kh(e = 0) {
  let [t, n] = W(e), r = q((l) => n(l), [t]), i = q((l) => n((c) => c | l), [t]), o = q((l) => (t & l) === l, [t]), s = q((l) => n((c) => c & ~l), [n]), a = q((l) => n((c) => c ^ l), [n]);
  return { flags: t, setFlag: r, addFlag: i, hasFlag: o, removeFlag: s, toggleFlag: a };
}
var zh = {}, Ps, Is;
typeof process < "u" && typeof globalThis < "u" && typeof Element < "u" && ((Ps = process == null ? void 0 : zh) == null ? void 0 : Ps.NODE_ENV) === "test" && typeof ((Is = Element == null ? void 0 : Element.prototype) == null ? void 0 : Is.getAnimations) > "u" && (Element.prototype.getAnimations = function() {
  return console.warn(["Headless UI has polyfilled `Element.prototype.getAnimations` for your tests.", "Please install a proper polyfill e.g. `jsdom-testing-mocks`, to silence these warnings.", "", "Example usage:", "```js", "import { mockAnimationsApi } from 'jsdom-testing-mocks'", "mockAnimationsApi()", "```"].join(`
`)), [];
});
var Yh = ((e) => (e[e.None = 0] = "None", e[e.Closed = 1] = "Closed", e[e.Enter = 2] = "Enter", e[e.Leave = 4] = "Leave", e))(Yh || {});
function au(e) {
  let t = {};
  for (let n in e) e[n] === !0 && (t[`data-${n}`] = "");
  return t;
}
function lu(e, t, n, r) {
  let [i, o] = W(n), { hasFlag: s, addFlag: a, removeFlag: l } = Kh(e && i ? 3 : 0), c = D(!1), u = D(!1), f = zt();
  return re(() => {
    var h;
    if (e) {
      if (n && o(!0), !t) {
        n && a(3);
        return;
      }
      return (h = r == null ? void 0 : r.start) == null || h.call(r, n), Xh(t, { inFlight: c, prepare() {
        u.current ? u.current = !1 : u.current = c.current, c.current = !0, !u.current && (n ? (a(3), l(4)) : (a(4), l(2)));
      }, run() {
        u.current ? n ? (l(3), a(4)) : (l(4), a(3)) : n ? l(1) : a(1);
      }, done() {
        var d;
        u.current && typeof t.getAnimations == "function" && t.getAnimations().length > 0 || (c.current = !1, l(7), n || o(!1), (d = r == null ? void 0 : r.end) == null || d.call(r, n));
      } });
    }
  }, [e, n, t, f]), e ? [i, { closed: s(1), enter: s(2), leave: s(4), transition: s(2) || s(4) }] : [n, { closed: void 0, enter: void 0, leave: void 0, transition: void 0 }];
}
function Xh(e, { prepare: t, run: n, done: r, inFlight: i }) {
  let o = bt();
  return Zh(e, { prepare: t, inFlight: i }), o.nextFrame(() => {
    n(), o.requestAnimationFrame(() => {
      o.add(Qh(e, r));
    });
  }), o.dispose;
}
function Qh(e, t) {
  var n, r;
  let i = bt();
  if (!e) return i.dispose;
  let o = !1;
  i.add(() => {
    o = !0;
  });
  let s = (r = (n = e.getAnimations) == null ? void 0 : n.call(e).filter((a) => a instanceof CSSTransition)) != null ? r : [];
  return s.length === 0 ? (t(), i.dispose) : (Promise.allSettled(s.map((a) => a.finished)).then(() => {
    o || t();
  }), i.dispose);
}
function Zh(e, { inFlight: t, prepare: n }) {
  if (t != null && t.current) {
    n();
    return;
  }
  let r = e.style.transition;
  e.style.transition = "none", n(), e.offsetHeight, e.style.transition = r;
}
function Xr() {
  return typeof window < "u";
}
function mn(e) {
  return uu(e) ? (e.nodeName || "").toLowerCase() : "#document";
}
function Re(e) {
  var t;
  return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function at(e) {
  var t;
  return (t = (uu(e) ? e.ownerDocument : e.document) || window.document) == null ? void 0 : t.documentElement;
}
function uu(e) {
  return Xr() ? e instanceof Node || e instanceof Re(e).Node : !1;
}
function _e(e) {
  return Xr() ? e instanceof Element || e instanceof Re(e).Element : !1;
}
function _t(e) {
  return Xr() ? e instanceof HTMLElement || e instanceof Re(e).HTMLElement : !1;
}
function Vs(e) {
  return !Xr() || typeof ShadowRoot > "u" ? !1 : e instanceof ShadowRoot || e instanceof Re(e).ShadowRoot;
}
function Qn(e) {
  const {
    overflow: t,
    overflowX: n,
    overflowY: r,
    display: i
  } = Ze(e);
  return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && i !== "inline" && i !== "contents";
}
function Jh(e) {
  return /^(table|td|th)$/.test(mn(e));
}
function Qr(e) {
  try {
    if (e.matches(":popover-open"))
      return !0;
  } catch {
  }
  try {
    return e.matches(":modal");
  } catch {
    return !1;
  }
}
const ev = /transform|translate|scale|rotate|perspective|filter/, tv = /paint|layout|strict|content/, $t = (e) => !!e && e !== "none";
let bi;
function Ho(e) {
  const t = _e(e) ? Ze(e) : e;
  return $t(t.transform) || $t(t.translate) || $t(t.scale) || $t(t.rotate) || $t(t.perspective) || !Go() && ($t(t.backdropFilter) || $t(t.filter)) || ev.test(t.willChange || "") || tv.test(t.contain || "");
}
function nv(e) {
  let t = St(e);
  for (; _t(t) && !fn(t); ) {
    if (Ho(t))
      return t;
    if (Qr(t))
      return null;
    t = St(t);
  }
  return null;
}
function Go() {
  return bi == null && (bi = typeof CSS < "u" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none")), bi;
}
function fn(e) {
  return /^(html|body|#document)$/.test(mn(e));
}
function Ze(e) {
  return Re(e).getComputedStyle(e);
}
function Zr(e) {
  return _e(e) ? {
    scrollLeft: e.scrollLeft,
    scrollTop: e.scrollTop
  } : {
    scrollLeft: e.scrollX,
    scrollTop: e.scrollY
  };
}
function St(e) {
  if (mn(e) === "html")
    return e;
  const t = (
    // Step into the shadow DOM of the parent of a slotted node.
    e.assignedSlot || // DOM Element detected.
    e.parentNode || // ShadowRoot detected.
    Vs(e) && e.host || // Fallback.
    at(e)
  );
  return Vs(t) ? t.host : t;
}
function cu(e) {
  const t = St(e);
  return fn(t) ? e.ownerDocument ? e.ownerDocument.body : e.body : _t(t) && Qn(t) ? t : cu(t);
}
function Ln(e, t, n) {
  var r;
  t === void 0 && (t = []), n === void 0 && (n = !0);
  const i = cu(e), o = i === ((r = e.ownerDocument) == null ? void 0 : r.body), s = Re(i);
  if (o) {
    const a = ao(s);
    return t.concat(s, s.visualViewport || [], Qn(i) ? i : [], a && n ? Ln(a) : []);
  } else
    return t.concat(i, Ln(i, [], n));
}
function ao(e) {
  return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
function rv() {
  const e = navigator.userAgentData;
  return e && Array.isArray(e.brands) ? e.brands.map((t) => {
    let {
      brand: n,
      version: r
    } = t;
    return n + "/" + r;
  }).join(" ") : navigator.userAgent;
}
const Ht = Math.min, be = Math.max, Pn = Math.round, ar = Math.floor, st = (e) => ({
  x: e,
  y: e
}), iv = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
};
function Fs(e, t, n) {
  return be(e, Ht(t, n));
}
function bn(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function Nt(e) {
  return e.split("-")[0];
}
function Zn(e) {
  return e.split("-")[1];
}
function fu(e) {
  return e === "x" ? "y" : "x";
}
function du(e) {
  return e === "y" ? "height" : "width";
}
function dt(e) {
  const t = e[0];
  return t === "t" || t === "b" ? "y" : "x";
}
function pu(e) {
  return fu(dt(e));
}
function ov(e, t, n) {
  n === void 0 && (n = !1);
  const r = Zn(e), i = pu(e), o = du(i);
  let s = i === "x" ? r === (n ? "end" : "start") ? "right" : "left" : r === "start" ? "bottom" : "top";
  return t.reference[o] > t.floating[o] && (s = Cr(s)), [s, Cr(s)];
}
function sv(e) {
  const t = Cr(e);
  return [lo(e), t, lo(t)];
}
function lo(e) {
  return e.includes("start") ? e.replace("start", "end") : e.replace("end", "start");
}
const Ms = ["left", "right"], js = ["right", "left"], av = ["top", "bottom"], lv = ["bottom", "top"];
function uv(e, t, n) {
  switch (e) {
    case "top":
    case "bottom":
      return n ? t ? js : Ms : t ? Ms : js;
    case "left":
    case "right":
      return t ? av : lv;
    default:
      return [];
  }
}
function cv(e, t, n, r) {
  const i = Zn(e);
  let o = uv(Nt(e), n === "start", r);
  return i && (o = o.map((s) => s + "-" + i), t && (o = o.concat(o.map(lo)))), o;
}
function Cr(e) {
  const t = Nt(e);
  return iv[t] + e.slice(t.length);
}
function fv(e) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...e
  };
}
function dv(e) {
  return typeof e != "number" ? fv(e) : {
    top: e,
    right: e,
    bottom: e,
    left: e
  };
}
function Dr(e) {
  const {
    x: t,
    y: n,
    width: r,
    height: i
  } = e;
  return {
    width: r,
    height: i,
    top: n,
    left: t,
    right: t + r,
    bottom: n + i,
    x: t,
    y: n
  };
}
function ks(e, t, n) {
  let {
    reference: r,
    floating: i
  } = e;
  const o = dt(t), s = pu(t), a = du(s), l = Nt(t), c = o === "y", u = r.x + r.width / 2 - i.width / 2, f = r.y + r.height / 2 - i.height / 2, h = r[a] / 2 - i[a] / 2;
  let d;
  switch (l) {
    case "top":
      d = {
        x: u,
        y: r.y - i.height
      };
      break;
    case "bottom":
      d = {
        x: u,
        y: r.y + r.height
      };
      break;
    case "right":
      d = {
        x: r.x + r.width,
        y: f
      };
      break;
    case "left":
      d = {
        x: r.x - i.width,
        y: f
      };
      break;
    default:
      d = {
        x: r.x,
        y: r.y
      };
  }
  switch (Zn(t)) {
    case "start":
      d[s] -= h * (n && c ? -1 : 1);
      break;
    case "end":
      d[s] += h * (n && c ? -1 : 1);
      break;
  }
  return d;
}
async function hu(e, t) {
  var n;
  t === void 0 && (t = {});
  const {
    x: r,
    y: i,
    platform: o,
    rects: s,
    elements: a,
    strategy: l
  } = e, {
    boundary: c = "clippingAncestors",
    rootBoundary: u = "viewport",
    elementContext: f = "floating",
    altBoundary: h = !1,
    padding: d = 0
  } = bn(t, e), p = dv(d), b = a[h ? f === "floating" ? "reference" : "floating" : f], O = Dr(await o.getClippingRect({
    element: (n = await (o.isElement == null ? void 0 : o.isElement(b))) == null || n ? b : b.contextElement || await (o.getDocumentElement == null ? void 0 : o.getDocumentElement(a.floating)),
    boundary: c,
    rootBoundary: u,
    strategy: l
  })), _ = f === "floating" ? {
    x: r,
    y: i,
    width: s.floating.width,
    height: s.floating.height
  } : s.reference, E = await (o.getOffsetParent == null ? void 0 : o.getOffsetParent(a.floating)), S = await (o.isElement == null ? void 0 : o.isElement(E)) ? await (o.getScale == null ? void 0 : o.getScale(E)) || {
    x: 1,
    y: 1
  } : {
    x: 1,
    y: 1
  }, x = Dr(o.convertOffsetParentRelativeRectToViewportRelativeRect ? await o.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements: a,
    rect: _,
    offsetParent: E,
    strategy: l
  }) : _);
  return {
    top: (O.top - x.top + p.top) / S.y,
    bottom: (x.bottom - O.bottom + p.bottom) / S.y,
    left: (O.left - x.left + p.left) / S.x,
    right: (x.right - O.right + p.right) / S.x
  };
}
const pv = 50, hv = async (e, t, n) => {
  const {
    placement: r = "bottom",
    strategy: i = "absolute",
    middleware: o = [],
    platform: s
  } = n, a = s.detectOverflow ? s : {
    ...s,
    detectOverflow: hu
  }, l = await (s.isRTL == null ? void 0 : s.isRTL(t));
  let c = await s.getElementRects({
    reference: e,
    floating: t,
    strategy: i
  }), {
    x: u,
    y: f
  } = ks(c, r, l), h = r, d = 0;
  const p = {};
  for (let g = 0; g < o.length; g++) {
    const b = o[g];
    if (!b)
      continue;
    const {
      name: O,
      fn: _
    } = b, {
      x: E,
      y: S,
      data: x,
      reset: y
    } = await _({
      x: u,
      y: f,
      initialPlacement: r,
      placement: h,
      strategy: i,
      middlewareData: p,
      rects: c,
      platform: a,
      elements: {
        reference: e,
        floating: t
      }
    });
    u = E ?? u, f = S ?? f, p[O] = {
      ...p[O],
      ...x
    }, y && d < pv && (d++, typeof y == "object" && (y.placement && (h = y.placement), y.rects && (c = y.rects === !0 ? await s.getElementRects({
      reference: e,
      floating: t,
      strategy: i
    }) : y.rects), {
      x: u,
      y: f
    } = ks(c, h, l)), g = -1);
  }
  return {
    x: u,
    y: f,
    placement: h,
    strategy: i,
    middlewareData: p
  };
}, vv = function(e) {
  return e === void 0 && (e = {}), {
    name: "flip",
    options: e,
    async fn(t) {
      var n, r;
      const {
        placement: i,
        middlewareData: o,
        rects: s,
        initialPlacement: a,
        platform: l,
        elements: c
      } = t, {
        mainAxis: u = !0,
        crossAxis: f = !0,
        fallbackPlacements: h,
        fallbackStrategy: d = "bestFit",
        fallbackAxisSideDirection: p = "none",
        flipAlignment: g = !0,
        ...b
      } = bn(e, t);
      if ((n = o.arrow) != null && n.alignmentOffset)
        return {};
      const O = Nt(i), _ = dt(a), E = Nt(a) === a, S = await (l.isRTL == null ? void 0 : l.isRTL(c.floating)), x = h || (E || !g ? [Cr(a)] : sv(a)), y = p !== "none";
      !h && y && x.push(...cv(a, g, p, S));
      const R = [a, ...x], T = await l.detectOverflow(t, b), $ = [];
      let L = ((r = o.flip) == null ? void 0 : r.overflows) || [];
      if (u && $.push(T[O]), f) {
        const B = ov(i, s, S);
        $.push(T[B[0]], T[B[1]]);
      }
      if (L = [...L, {
        placement: i,
        overflows: $
      }], !$.every((B) => B <= 0)) {
        var N, P;
        const B = (((N = o.flip) == null ? void 0 : N.index) || 0) + 1, Q = R[B];
        if (Q && (!(f === "alignment" ? _ !== dt(Q) : !1) || // We leave the current main axis only if every placement on that axis
        // overflows the main axis.
        L.every((k) => dt(k.placement) === _ ? k.overflows[0] > 0 : !0)))
          return {
            data: {
              index: B,
              overflows: L
            },
            reset: {
              placement: Q
            }
          };
        let X = (P = L.filter((j) => j.overflows[0] <= 0).sort((j, k) => j.overflows[1] - k.overflows[1])[0]) == null ? void 0 : P.placement;
        if (!X)
          switch (d) {
            case "bestFit": {
              var M;
              const j = (M = L.filter((k) => {
                if (y) {
                  const K = dt(k.placement);
                  return K === _ || // Create a bias to the `y` side axis due to horizontal
                  // reading directions favoring greater width.
                  K === "y";
                }
                return !0;
              }).map((k) => [k.placement, k.overflows.filter((K) => K > 0).reduce((K, te) => K + te, 0)]).sort((k, K) => k[1] - K[1])[0]) == null ? void 0 : M[0];
              j && (X = j);
              break;
            }
            case "initialPlacement":
              X = a;
              break;
          }
        if (i !== X)
          return {
            reset: {
              placement: X
            }
          };
      }
      return {};
    }
  };
}, gv = /* @__PURE__ */ new Set(["left", "top"]);
async function mv(e, t) {
  const {
    placement: n,
    platform: r,
    elements: i
  } = e, o = await (r.isRTL == null ? void 0 : r.isRTL(i.floating)), s = Nt(n), a = Zn(n), l = dt(n) === "y", c = gv.has(s) ? -1 : 1, u = o && l ? -1 : 1, f = bn(t, e);
  let {
    mainAxis: h,
    crossAxis: d,
    alignmentAxis: p
  } = typeof f == "number" ? {
    mainAxis: f,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: f.mainAxis || 0,
    crossAxis: f.crossAxis || 0,
    alignmentAxis: f.alignmentAxis
  };
  return a && typeof p == "number" && (d = a === "end" ? p * -1 : p), l ? {
    x: d * u,
    y: h * c
  } : {
    x: h * c,
    y: d * u
  };
}
const bv = function(e) {
  return e === void 0 && (e = 0), {
    name: "offset",
    options: e,
    async fn(t) {
      var n, r;
      const {
        x: i,
        y: o,
        placement: s,
        middlewareData: a
      } = t, l = await mv(t, e);
      return s === ((n = a.offset) == null ? void 0 : n.placement) && (r = a.arrow) != null && r.alignmentOffset ? {} : {
        x: i + l.x,
        y: o + l.y,
        data: {
          ...l,
          placement: s
        }
      };
    }
  };
}, _v = function(e) {
  return e === void 0 && (e = {}), {
    name: "shift",
    options: e,
    async fn(t) {
      const {
        x: n,
        y: r,
        placement: i,
        platform: o
      } = t, {
        mainAxis: s = !0,
        crossAxis: a = !1,
        limiter: l = {
          fn: (O) => {
            let {
              x: _,
              y: E
            } = O;
            return {
              x: _,
              y: E
            };
          }
        },
        ...c
      } = bn(e, t), u = {
        x: n,
        y: r
      }, f = await o.detectOverflow(t, c), h = dt(Nt(i)), d = fu(h);
      let p = u[d], g = u[h];
      if (s) {
        const O = d === "y" ? "top" : "left", _ = d === "y" ? "bottom" : "right", E = p + f[O], S = p - f[_];
        p = Fs(E, p, S);
      }
      if (a) {
        const O = h === "y" ? "top" : "left", _ = h === "y" ? "bottom" : "right", E = g + f[O], S = g - f[_];
        g = Fs(E, g, S);
      }
      const b = l.fn({
        ...t,
        [d]: p,
        [h]: g
      });
      return {
        ...b,
        data: {
          x: b.x - n,
          y: b.y - r,
          enabled: {
            [d]: s,
            [h]: a
          }
        }
      };
    }
  };
}, yv = function(e) {
  return e === void 0 && (e = {}), {
    name: "size",
    options: e,
    async fn(t) {
      var n, r;
      const {
        placement: i,
        rects: o,
        platform: s,
        elements: a
      } = t, {
        apply: l = () => {
        },
        ...c
      } = bn(e, t), u = await s.detectOverflow(t, c), f = Nt(i), h = Zn(i), d = dt(i) === "y", {
        width: p,
        height: g
      } = o.floating;
      let b, O;
      f === "top" || f === "bottom" ? (b = f, O = h === (await (s.isRTL == null ? void 0 : s.isRTL(a.floating)) ? "start" : "end") ? "left" : "right") : (O = f, b = h === "end" ? "top" : "bottom");
      const _ = g - u.top - u.bottom, E = p - u.left - u.right, S = Ht(g - u[b], _), x = Ht(p - u[O], E), y = !t.middlewareData.shift;
      let R = S, T = x;
      if ((n = t.middlewareData.shift) != null && n.enabled.x && (T = E), (r = t.middlewareData.shift) != null && r.enabled.y && (R = _), y && !h) {
        const L = be(u.left, 0), N = be(u.right, 0), P = be(u.top, 0), M = be(u.bottom, 0);
        d ? T = p - 2 * (L !== 0 || N !== 0 ? L + N : be(u.left, u.right)) : R = g - 2 * (P !== 0 || M !== 0 ? P + M : be(u.top, u.bottom));
      }
      await l({
        ...t,
        availableWidth: T,
        availableHeight: R
      });
      const $ = await s.getDimensions(a.floating);
      return p !== $.width || g !== $.height ? {
        reset: {
          rects: !0
        }
      } : {};
    }
  };
};
function vu(e) {
  const t = Ze(e);
  let n = parseFloat(t.width) || 0, r = parseFloat(t.height) || 0;
  const i = _t(e), o = i ? e.offsetWidth : n, s = i ? e.offsetHeight : r, a = Pn(n) !== o || Pn(r) !== s;
  return a && (n = o, r = s), {
    width: n,
    height: r,
    $: a
  };
}
function qo(e) {
  return _e(e) ? e : e.contextElement;
}
function sn(e) {
  const t = qo(e);
  if (!_t(t))
    return st(1);
  const n = t.getBoundingClientRect(), {
    width: r,
    height: i,
    $: o
  } = vu(t);
  let s = (o ? Pn(n.width) : n.width) / r, a = (o ? Pn(n.height) : n.height) / i;
  return (!s || !Number.isFinite(s)) && (s = 1), (!a || !Number.isFinite(a)) && (a = 1), {
    x: s,
    y: a
  };
}
const Ev = /* @__PURE__ */ st(0);
function gu(e) {
  const t = Re(e);
  return !Go() || !t.visualViewport ? Ev : {
    x: t.visualViewport.offsetLeft,
    y: t.visualViewport.offsetTop
  };
}
function Ov(e, t, n) {
  return t === void 0 && (t = !1), !n || t && n !== Re(e) ? !1 : t;
}
function Gt(e, t, n, r) {
  t === void 0 && (t = !1), n === void 0 && (n = !1);
  const i = e.getBoundingClientRect(), o = qo(e);
  let s = st(1);
  t && (r ? _e(r) && (s = sn(r)) : s = sn(e));
  const a = Ov(o, n, r) ? gu(o) : st(0);
  let l = (i.left + a.x) / s.x, c = (i.top + a.y) / s.y, u = i.width / s.x, f = i.height / s.y;
  if (o) {
    const h = Re(o), d = r && _e(r) ? Re(r) : r;
    let p = h, g = ao(p);
    for (; g && r && d !== p; ) {
      const b = sn(g), O = g.getBoundingClientRect(), _ = Ze(g), E = O.left + (g.clientLeft + parseFloat(_.paddingLeft)) * b.x, S = O.top + (g.clientTop + parseFloat(_.paddingTop)) * b.y;
      l *= b.x, c *= b.y, u *= b.x, f *= b.y, l += E, c += S, p = Re(g), g = ao(p);
    }
  }
  return Dr({
    width: u,
    height: f,
    x: l,
    y: c
  });
}
function Jr(e, t) {
  const n = Zr(e).scrollLeft;
  return t ? t.left + n : Gt(at(e)).left + n;
}
function mu(e, t) {
  const n = e.getBoundingClientRect(), r = n.left + t.scrollLeft - Jr(e, n), i = n.top + t.scrollTop;
  return {
    x: r,
    y: i
  };
}
function wv(e) {
  let {
    elements: t,
    rect: n,
    offsetParent: r,
    strategy: i
  } = e;
  const o = i === "fixed", s = at(r), a = t ? Qr(t.floating) : !1;
  if (r === s || a && o)
    return n;
  let l = {
    scrollLeft: 0,
    scrollTop: 0
  }, c = st(1);
  const u = st(0), f = _t(r);
  if ((f || !f && !o) && ((mn(r) !== "body" || Qn(s)) && (l = Zr(r)), f)) {
    const d = Gt(r);
    c = sn(r), u.x = d.x + r.clientLeft, u.y = d.y + r.clientTop;
  }
  const h = s && !f && !o ? mu(s, l) : st(0);
  return {
    width: n.width * c.x,
    height: n.height * c.y,
    x: n.x * c.x - l.scrollLeft * c.x + u.x + h.x,
    y: n.y * c.y - l.scrollTop * c.y + u.y + h.y
  };
}
function Sv(e) {
  return Array.from(e.getClientRects());
}
function Nv(e) {
  const t = at(e), n = Zr(e), r = e.ownerDocument.body, i = be(t.scrollWidth, t.clientWidth, r.scrollWidth, r.clientWidth), o = be(t.scrollHeight, t.clientHeight, r.scrollHeight, r.clientHeight);
  let s = -n.scrollLeft + Jr(e);
  const a = -n.scrollTop;
  return Ze(r).direction === "rtl" && (s += be(t.clientWidth, r.clientWidth) - i), {
    width: i,
    height: o,
    x: s,
    y: a
  };
}
const Bs = 25;
function xv(e, t) {
  const n = Re(e), r = at(e), i = n.visualViewport;
  let o = r.clientWidth, s = r.clientHeight, a = 0, l = 0;
  if (i) {
    o = i.width, s = i.height;
    const u = Go();
    (!u || u && t === "fixed") && (a = i.offsetLeft, l = i.offsetTop);
  }
  const c = Jr(r);
  if (c <= 0) {
    const u = r.ownerDocument, f = u.body, h = getComputedStyle(f), d = u.compatMode === "CSS1Compat" && parseFloat(h.marginLeft) + parseFloat(h.marginRight) || 0, p = Math.abs(r.clientWidth - f.clientWidth - d);
    p <= Bs && (o -= p);
  } else c <= Bs && (o += c);
  return {
    width: o,
    height: s,
    x: a,
    y: l
  };
}
function Av(e, t) {
  const n = Gt(e, !0, t === "fixed"), r = n.top + e.clientTop, i = n.left + e.clientLeft, o = _t(e) ? sn(e) : st(1), s = e.clientWidth * o.x, a = e.clientHeight * o.y, l = i * o.x, c = r * o.y;
  return {
    width: s,
    height: a,
    x: l,
    y: c
  };
}
function Us(e, t, n) {
  let r;
  if (t === "viewport")
    r = xv(e, n);
  else if (t === "document")
    r = Nv(at(e));
  else if (_e(t))
    r = Av(t, n);
  else {
    const i = gu(e);
    r = {
      x: t.x - i.x,
      y: t.y - i.y,
      width: t.width,
      height: t.height
    };
  }
  return Dr(r);
}
function bu(e, t) {
  const n = St(e);
  return n === t || !_e(n) || fn(n) ? !1 : Ze(n).position === "fixed" || bu(n, t);
}
function Tv(e, t) {
  const n = t.get(e);
  if (n)
    return n;
  let r = Ln(e, [], !1).filter((a) => _e(a) && mn(a) !== "body"), i = null;
  const o = Ze(e).position === "fixed";
  let s = o ? St(e) : e;
  for (; _e(s) && !fn(s); ) {
    const a = Ze(s), l = Ho(s);
    !l && a.position === "fixed" && (i = null), (o ? !l && !i : !l && a.position === "static" && !!i && (i.position === "absolute" || i.position === "fixed") || Qn(s) && !l && bu(e, s)) ? r = r.filter((u) => u !== s) : i = a, s = St(s);
  }
  return t.set(e, r), r;
}
function Rv(e) {
  let {
    element: t,
    boundary: n,
    rootBoundary: r,
    strategy: i
  } = e;
  const s = [...n === "clippingAncestors" ? Qr(t) ? [] : Tv(t, this._c) : [].concat(n), r], a = Us(t, s[0], i);
  let l = a.top, c = a.right, u = a.bottom, f = a.left;
  for (let h = 1; h < s.length; h++) {
    const d = Us(t, s[h], i);
    l = be(d.top, l), c = Ht(d.right, c), u = Ht(d.bottom, u), f = be(d.left, f);
  }
  return {
    width: c - f,
    height: u - l,
    x: f,
    y: l
  };
}
function Cv(e) {
  const {
    width: t,
    height: n
  } = vu(e);
  return {
    width: t,
    height: n
  };
}
function Dv(e, t, n) {
  const r = _t(t), i = at(t), o = n === "fixed", s = Gt(e, !0, o, t);
  let a = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const l = st(0);
  function c() {
    l.x = Jr(i);
  }
  if (r || !r && !o)
    if ((mn(t) !== "body" || Qn(i)) && (a = Zr(t)), r) {
      const d = Gt(t, !0, o, t);
      l.x = d.x + t.clientLeft, l.y = d.y + t.clientTop;
    } else i && c();
  o && !r && i && c();
  const u = i && !r && !o ? mu(i, a) : st(0), f = s.left + a.scrollLeft - l.x - u.x, h = s.top + a.scrollTop - l.y - u.y;
  return {
    x: f,
    y: h,
    width: s.width,
    height: s.height
  };
}
function _i(e) {
  return Ze(e).position === "static";
}
function Hs(e, t) {
  if (!_t(e) || Ze(e).position === "fixed")
    return null;
  if (t)
    return t(e);
  let n = e.offsetParent;
  return at(e) === n && (n = n.ownerDocument.body), n;
}
function _u(e, t) {
  const n = Re(e);
  if (Qr(e))
    return n;
  if (!_t(e)) {
    let i = St(e);
    for (; i && !fn(i); ) {
      if (_e(i) && !_i(i))
        return i;
      i = St(i);
    }
    return n;
  }
  let r = Hs(e, t);
  for (; r && Jh(r) && _i(r); )
    r = Hs(r, t);
  return r && fn(r) && _i(r) && !Ho(r) ? n : r || nv(e) || n;
}
const $v = async function(e) {
  const t = this.getOffsetParent || _u, n = this.getDimensions, r = await n(e.floating);
  return {
    reference: Dv(e.reference, await t(e.floating), e.strategy),
    floating: {
      x: 0,
      y: 0,
      width: r.width,
      height: r.height
    }
  };
};
function Lv(e) {
  return Ze(e).direction === "rtl";
}
const Pv = {
  convertOffsetParentRelativeRectToViewportRelativeRect: wv,
  getDocumentElement: at,
  getClippingRect: Rv,
  getOffsetParent: _u,
  getElementRects: $v,
  getClientRects: Sv,
  getDimensions: Cv,
  getScale: sn,
  isElement: _e,
  isRTL: Lv
};
function yu(e, t) {
  return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function Iv(e, t) {
  let n = null, r;
  const i = at(e);
  function o() {
    var a;
    clearTimeout(r), (a = n) == null || a.disconnect(), n = null;
  }
  function s(a, l) {
    a === void 0 && (a = !1), l === void 0 && (l = 1), o();
    const c = e.getBoundingClientRect(), {
      left: u,
      top: f,
      width: h,
      height: d
    } = c;
    if (a || t(), !h || !d)
      return;
    const p = ar(f), g = ar(i.clientWidth - (u + h)), b = ar(i.clientHeight - (f + d)), O = ar(u), E = {
      rootMargin: -p + "px " + -g + "px " + -b + "px " + -O + "px",
      threshold: be(0, Ht(1, l)) || 1
    };
    let S = !0;
    function x(y) {
      const R = y[0].intersectionRatio;
      if (R !== l) {
        if (!S)
          return s();
        R ? s(!1, R) : r = setTimeout(() => {
          s(!1, 1e-7);
        }, 1e3);
      }
      R === 1 && !yu(c, e.getBoundingClientRect()) && s(), S = !1;
    }
    try {
      n = new IntersectionObserver(x, {
        ...E,
        // Handle <iframe>s
        root: i.ownerDocument
      });
    } catch {
      n = new IntersectionObserver(x, E);
    }
    n.observe(e);
  }
  return s(!0), o;
}
function Vv(e, t, n, r) {
  r === void 0 && (r = {});
  const {
    ancestorScroll: i = !0,
    ancestorResize: o = !0,
    elementResize: s = typeof ResizeObserver == "function",
    layoutShift: a = typeof IntersectionObserver == "function",
    animationFrame: l = !1
  } = r, c = qo(e), u = i || o ? [...c ? Ln(c) : [], ...t ? Ln(t) : []] : [];
  u.forEach((O) => {
    i && O.addEventListener("scroll", n, {
      passive: !0
    }), o && O.addEventListener("resize", n);
  });
  const f = c && a ? Iv(c, n) : null;
  let h = -1, d = null;
  s && (d = new ResizeObserver((O) => {
    let [_] = O;
    _ && _.target === c && d && t && (d.unobserve(t), cancelAnimationFrame(h), h = requestAnimationFrame(() => {
      var E;
      (E = d) == null || E.observe(t);
    })), n();
  }), c && !l && d.observe(c), t && d.observe(t));
  let p, g = l ? Gt(e) : null;
  l && b();
  function b() {
    const O = Gt(e);
    g && !yu(g, O) && n(), g = O, p = requestAnimationFrame(b);
  }
  return n(), () => {
    var O;
    u.forEach((_) => {
      i && _.removeEventListener("scroll", n), o && _.removeEventListener("resize", n);
    }), f == null || f(), (O = d) == null || O.disconnect(), d = null, l && cancelAnimationFrame(p);
  };
}
const yi = hu, Fv = bv, Mv = _v, jv = vv, kv = yv, Bv = (e, t, n) => {
  const r = /* @__PURE__ */ new Map(), i = {
    platform: Pv,
    ...n
  }, o = {
    ...i.platform,
    _c: r
  };
  return hv(e, t, {
    ...i,
    platform: o
  });
};
var Uv = typeof document < "u", Hv = function() {
}, pr = Uv ? jr : Hv;
function $r(e, t) {
  if (e === t)
    return !0;
  if (typeof e != typeof t)
    return !1;
  if (typeof e == "function" && e.toString() === t.toString())
    return !0;
  let n, r, i;
  if (e && t && typeof e == "object") {
    if (Array.isArray(e)) {
      if (n = e.length, n !== t.length) return !1;
      for (r = n; r-- !== 0; )
        if (!$r(e[r], t[r]))
          return !1;
      return !0;
    }
    if (i = Object.keys(e), n = i.length, n !== Object.keys(t).length)
      return !1;
    for (r = n; r-- !== 0; )
      if (!{}.hasOwnProperty.call(t, i[r]))
        return !1;
    for (r = n; r-- !== 0; ) {
      const o = i[r];
      if (!(o === "_owner" && e.$$typeof) && !$r(e[o], t[o]))
        return !1;
    }
    return !0;
  }
  return e !== e && t !== t;
}
function Eu(e) {
  return typeof window > "u" ? 1 : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function Gs(e, t) {
  const n = Eu(e);
  return Math.round(t * n) / n;
}
function Ei(e) {
  const t = D(e);
  return pr(() => {
    t.current = e;
  }), t;
}
function Gv(e) {
  e === void 0 && (e = {});
  const {
    placement: t = "bottom",
    strategy: n = "absolute",
    middleware: r = [],
    platform: i,
    elements: {
      reference: o,
      floating: s
    } = {},
    transform: a = !0,
    whileElementsMounted: l,
    open: c
  } = e, [u, f] = W({
    x: 0,
    y: 0,
    strategy: n,
    placement: t,
    middlewareData: {},
    isPositioned: !1
  }), [h, d] = W(r);
  $r(h, r) || d(r);
  const [p, g] = W(null), [b, O] = W(null), _ = q((k) => {
    k !== y.current && (y.current = k, g(k));
  }, []), E = q((k) => {
    k !== R.current && (R.current = k, O(k));
  }, []), S = o || p, x = s || b, y = D(null), R = D(null), T = D(u), $ = l != null, L = Ei(l), N = Ei(i), P = Ei(c), M = q(() => {
    if (!y.current || !R.current)
      return;
    const k = {
      placement: t,
      strategy: n,
      middleware: h
    };
    N.current && (k.platform = N.current), Bv(y.current, R.current, k).then((K) => {
      const te = {
        ...K,
        // The floating element's position may be recomputed while it's closed
        // but still mounted (such as when transitioning out). To ensure
        // `isPositioned` will be `false` initially on the next open, avoid
        // setting it to `true` when `open === false` (must be specified).
        isPositioned: P.current !== !1
      };
      B.current && !$r(T.current, te) && (T.current = te, ze(() => {
        f(te);
      }));
    });
  }, [h, t, n, N, P]);
  pr(() => {
    c === !1 && T.current.isPositioned && (T.current.isPositioned = !1, f((k) => ({
      ...k,
      isPositioned: !1
    })));
  }, [c]);
  const B = D(!1);
  pr(() => (B.current = !0, () => {
    B.current = !1;
  }), []), pr(() => {
    if (S && (y.current = S), x && (R.current = x), S && x) {
      if (L.current)
        return L.current(S, x, M);
      M();
    }
  }, [S, x, M, L, $]);
  const Q = U(() => ({
    reference: y,
    floating: R,
    setReference: _,
    setFloating: E
  }), [_, E]), X = U(() => ({
    reference: S,
    floating: x
  }), [S, x]), j = U(() => {
    const k = {
      position: n,
      left: 0,
      top: 0
    };
    if (!X.floating)
      return k;
    const K = Gs(X.floating, u.x), te = Gs(X.floating, u.y);
    return a ? {
      ...k,
      transform: "translate(" + K + "px, " + te + "px)",
      ...Eu(X.floating) >= 1.5 && {
        willChange: "transform"
      }
    } : {
      position: n,
      left: K,
      top: te
    };
  }, [n, a, X.floating, u.x, u.y]);
  return U(() => ({
    ...u,
    update: M,
    refs: Q,
    elements: X,
    floatingStyles: j
  }), [u, M, Q, X, j]);
}
const Ou = (e, t) => ({
  ...Fv(e),
  options: [e, t]
}), qv = (e, t) => ({
  ...Mv(e),
  options: [e, t]
}), Wv = (e, t) => ({
  ...jv(e),
  options: [e, t]
}), Kv = (e, t) => ({
  ...kv(e),
  options: [e, t]
});
var ei = {};
const wu = {
  ...ba
}, zv = wu.useInsertionEffect, Yv = zv || ((e) => e());
function Su(e) {
  const t = D(() => {
    if (ei.NODE_ENV !== "production")
      throw new Error("Cannot call an event handler while rendering.");
  });
  return Yv(() => {
    t.current = e;
  }), q(function() {
    for (var n = arguments.length, r = new Array(n), i = 0; i < n; i++)
      r[i] = arguments[i];
    return t.current == null ? void 0 : t.current(...r);
  }, []);
}
var uo = typeof document < "u" ? jr : z;
let qs = !1, Xv = 0;
const Ws = () => (
  // Ensure the id is unique with multiple independent versions of Floating UI
  // on <React 18
  "floating-ui-" + Math.random().toString(36).slice(2, 6) + Xv++
);
function Qv() {
  const [e, t] = W(() => qs ? Ws() : void 0);
  return uo(() => {
    e == null && t(Ws());
  }, []), z(() => {
    qs = !0;
  }, []), e;
}
const Zv = wu.useId, Jv = Zv || Qv;
let In;
ei.NODE_ENV !== "production" && (In = /* @__PURE__ */ new Set());
function eg() {
  for (var e, t = arguments.length, n = new Array(t), r = 0; r < t; r++)
    n[r] = arguments[r];
  const i = "Floating UI: " + n.join(" ");
  if (!((e = In) != null && e.has(i))) {
    var o;
    (o = In) == null || o.add(i), console.warn(i);
  }
}
function tg() {
  for (var e, t = arguments.length, n = new Array(t), r = 0; r < t; r++)
    n[r] = arguments[r];
  const i = "Floating UI: " + n.join(" ");
  if (!((e = In) != null && e.has(i))) {
    var o;
    (o = In) == null || o.add(i), console.error(i);
  }
}
function ng() {
  const e = /* @__PURE__ */ new Map();
  return {
    emit(t, n) {
      var r;
      (r = e.get(t)) == null || r.forEach((i) => i(n));
    },
    on(t, n) {
      e.set(t, [...e.get(t) || [], n]);
    },
    off(t, n) {
      var r;
      e.set(t, ((r = e.get(t)) == null ? void 0 : r.filter((i) => i !== n)) || []);
    }
  };
}
const rg = /* @__PURE__ */ ae(null), ig = /* @__PURE__ */ ae(null), og = () => {
  var e;
  return ((e = Z(rg)) == null ? void 0 : e.id) || null;
}, sg = () => Z(ig), ag = "data-floating-ui-focusable";
function lg(e) {
  const {
    open: t = !1,
    onOpenChange: n,
    elements: r
  } = e, i = Jv(), o = D({}), [s] = W(() => ng()), a = og() != null;
  if (ei.NODE_ENV !== "production") {
    const d = r.reference;
    d && !_e(d) && tg("Cannot pass a virtual element to the `elements.reference` option,", "as it must be a real DOM element. Use `refs.setPositionReference()`", "instead.");
  }
  const [l, c] = W(r.reference), u = Su((d, p, g) => {
    o.current.openEvent = d ? p : void 0, s.emit("openchange", {
      open: d,
      event: p,
      reason: g,
      nested: a
    }), n == null || n(d, p, g);
  }), f = U(() => ({
    setPositionReference: c
  }), []), h = U(() => ({
    reference: l || r.reference || null,
    floating: r.floating || null,
    domReference: r.reference
  }), [l, r.reference, r.floating]);
  return U(() => ({
    dataRef: o,
    open: t,
    onOpenChange: u,
    elements: h,
    events: s,
    floatingId: i,
    refs: f
  }), [t, u, h, s, i, f]);
}
function ug(e) {
  e === void 0 && (e = {});
  const {
    nodeId: t
  } = e, n = lg({
    ...e,
    elements: {
      reference: null,
      floating: null,
      ...e.elements
    }
  }), r = e.rootContext || n, i = r.elements, [o, s] = W(null), [a, l] = W(null), u = (i == null ? void 0 : i.domReference) || o, f = D(null), h = sg();
  uo(() => {
    u && (f.current = u);
  }, [u]);
  const d = Gv({
    ...e,
    elements: {
      ...i,
      ...a && {
        reference: a
      }
    }
  }), p = q((E) => {
    const S = _e(E) ? {
      getBoundingClientRect: () => E.getBoundingClientRect(),
      contextElement: E
    } : E;
    l(S), d.refs.setReference(S);
  }, [d.refs]), g = q((E) => {
    (_e(E) || E === null) && (f.current = E, s(E)), (_e(d.refs.reference.current) || d.refs.reference.current === null || // Don't allow setting virtual elements using the old technique back to
    // `null` to support `positionReference` + an unstable `reference`
    // callback ref.
    E !== null && !_e(E)) && d.refs.setReference(E);
  }, [d.refs]), b = U(() => ({
    ...d.refs,
    setReference: g,
    setPositionReference: p,
    domReference: f
  }), [d.refs, g, p]), O = U(() => ({
    ...d.elements,
    domReference: u
  }), [d.elements, u]), _ = U(() => ({
    ...d,
    ...r,
    refs: b,
    elements: O,
    nodeId: t
  }), [d, b, O, t, r]);
  return uo(() => {
    r.dataRef.current.floatingContext = _;
    const E = h == null ? void 0 : h.nodesRef.current.find((S) => S.id === t);
    E && (E.context = _);
  }), U(() => ({
    ...d,
    context: _,
    refs: b,
    elements: O
  }), [d, b, O, _]);
}
const Ks = "active", zs = "selected";
function Oi(e, t, n) {
  const r = /* @__PURE__ */ new Map(), i = n === "item";
  let o = e;
  if (i && e) {
    const {
      [Ks]: s,
      [zs]: a,
      ...l
    } = e;
    o = l;
  }
  return {
    ...n === "floating" && {
      tabIndex: -1,
      [ag]: ""
    },
    ...o,
    ...t.map((s) => {
      const a = s ? s[n] : null;
      return typeof a == "function" ? e ? a(e) : null : a;
    }).concat(e).reduce((s, a) => (a && Object.entries(a).forEach((l) => {
      let [c, u] = l;
      if (!(i && [Ks, zs].includes(c)))
        if (c.indexOf("on") === 0) {
          if (r.has(c) || r.set(c, []), typeof u == "function") {
            var f;
            (f = r.get(c)) == null || f.push(u), s[c] = function() {
              for (var h, d = arguments.length, p = new Array(d), g = 0; g < d; g++)
                p[g] = arguments[g];
              return (h = r.get(c)) == null ? void 0 : h.map((b) => b(...p)).find((b) => b !== void 0);
            };
          }
        } else
          s[c] = u;
    }), s), {})
  };
}
function cg(e) {
  e === void 0 && (e = []);
  const t = e.map((a) => a == null ? void 0 : a.reference), n = e.map((a) => a == null ? void 0 : a.floating), r = e.map((a) => a == null ? void 0 : a.item), i = q(
    (a) => Oi(a, e, "reference"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    t
  ), o = q(
    (a) => Oi(a, e, "floating"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    n
  ), s = q(
    (a) => Oi(a, e, "item"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    r
  );
  return U(() => ({
    getReferenceProps: i,
    getFloatingProps: o,
    getItemProps: s
  }), [i, o, s]);
}
function Ys(e, t) {
  return {
    ...e,
    rects: {
      ...e.rects,
      floating: {
        ...e.rects.floating,
        height: t
      }
    }
  };
}
const fg = (e) => ({
  name: "inner",
  options: e,
  async fn(t) {
    const {
      listRef: n,
      overflowRef: r,
      onFallbackChange: i,
      offset: o = 0,
      index: s = 0,
      minItemsVisible: a = 4,
      referenceOverflowThreshold: l = 0,
      scrollRef: c,
      ...u
    } = bn(e, t), {
      rects: f,
      elements: {
        floating: h
      }
    } = t, d = n.current[s], p = (c == null ? void 0 : c.current) || h, g = h.clientTop || p.clientTop, b = h.clientTop !== 0, O = p.clientTop !== 0, _ = h === p;
    if (ei.NODE_ENV !== "production" && (t.placement.startsWith("bottom") || eg('`placement` side must be "bottom" when using the `inner`', "middleware.")), !d)
      return {};
    const E = {
      ...t,
      ...await Ou(-d.offsetTop - h.clientTop - f.reference.height / 2 - d.offsetHeight / 2 - o).fn(t)
    }, S = await yi(Ys(E, p.scrollHeight + g + h.clientTop), u), x = await yi(E, {
      ...u,
      elementContext: "reference"
    }), y = be(0, S.top), R = E.y + y, L = (p.scrollHeight > p.clientHeight ? (N) => N : Pn)(be(0, p.scrollHeight + (b && _ || O ? g * 2 : 0) - y - be(0, S.bottom)));
    if (p.style.maxHeight = L + "px", p.scrollTop = y, i) {
      const N = p.offsetHeight < d.offsetHeight * Ht(a, n.current.length) - 1 || x.top >= -l || x.bottom >= -l;
      ze(() => i(N));
    }
    return r && (r.current = await yi(Ys({
      ...E,
      y: R
    }, p.offsetHeight + g + h.clientTop), u)), {
      y: R
    };
  }
});
function dg(e, t) {
  const {
    open: n,
    elements: r
  } = e, {
    enabled: i = !0,
    overflowRef: o,
    scrollRef: s,
    onChange: a
  } = t, l = Su(a), c = D(!1), u = D(null), f = D(null);
  z(() => {
    if (!i) return;
    function d(g) {
      if (g.ctrlKey || !p || o.current == null)
        return;
      const b = g.deltaY, O = o.current.top >= -0.5, _ = o.current.bottom >= -0.5, E = p.scrollHeight - p.clientHeight, S = b < 0 ? -1 : 1, x = b < 0 ? "max" : "min";
      p.scrollHeight <= p.clientHeight || (!O && b > 0 || !_ && b < 0 ? (g.preventDefault(), ze(() => {
        l((y) => y + Math[x](b, E * S));
      })) : /firefox/i.test(rv()) && (p.scrollTop += b));
    }
    const p = (s == null ? void 0 : s.current) || r.floating;
    if (n && p)
      return p.addEventListener("wheel", d), requestAnimationFrame(() => {
        u.current = p.scrollTop, o.current != null && (f.current = {
          ...o.current
        });
      }), () => {
        u.current = null, f.current = null, p.removeEventListener("wheel", d);
      };
  }, [i, n, r.floating, o, s, l]);
  const h = U(() => ({
    onKeyDown() {
      c.current = !0;
    },
    onWheel() {
      c.current = !1;
    },
    onPointerMove() {
      c.current = !1;
    },
    onScroll() {
      const d = (s == null ? void 0 : s.current) || r.floating;
      if (!(!o.current || !d || !c.current)) {
        if (u.current !== null) {
          const p = d.scrollTop - u.current;
          (o.current.bottom < -0.5 && p < -1 || o.current.top < -0.5 && p > 1) && ze(() => l((g) => g + p));
        }
        requestAnimationFrame(() => {
          u.current = d.scrollTop;
        });
      }
    }
  }), [r.floating, l, o, s]);
  return U(() => i ? {
    floating: h
  } : {}, [i, h]);
}
let _n = ae({ styles: void 0, setReference: () => {
}, setFloating: () => {
}, getReferenceProps: () => ({}), getFloatingProps: () => ({}), slot: {} });
_n.displayName = "FloatingContext";
let Wo = ae(null);
Wo.displayName = "PlacementContext";
function pg(e) {
  return U(() => e ? typeof e == "string" ? { to: e } : e : null, [e]);
}
function hg() {
  return Z(_n).setReference;
}
function vg() {
  return Z(_n).getReferenceProps;
}
function gg() {
  let { getFloatingProps: e, slot: t } = Z(_n);
  return q((...n) => Object.assign({}, e(...n), { "data-anchor": t.anchor }), [e, t]);
}
function mg(e = null) {
  e === !1 && (e = null), typeof e == "string" && (e = { to: e });
  let t = Z(Wo), n = U(() => e, [JSON.stringify(e, (i, o) => {
    var s;
    return (s = o == null ? void 0 : o.outerHTML) != null ? s : o;
  })]);
  re(() => {
    t == null || t(n ?? null);
  }, [t, n]);
  let r = Z(_n);
  return U(() => [r.setFloating, e ? r.styles : {}], [r.setFloating, e, r.styles]);
}
let Xs = 4;
function bg({ children: e, enabled: t = !0 }) {
  let [n, r] = W(null), [i, o] = W(0), s = D(null), [a, l] = W(null);
  _g(a);
  let c = t && n !== null && a !== null, { to: u = "bottom", gap: f = 0, offset: h = 0, padding: d = 0, inner: p } = yg(n, a), [g, b = "center"] = u.split(" ");
  re(() => {
    c && o(0);
  }, [c]);
  let { refs: O, floatingStyles: _, context: E } = ug({ open: c, placement: g === "selection" ? b === "center" ? "bottom" : `bottom-${b}` : b === "center" ? `${g}` : `${g}-${b}`, strategy: "absolute", transform: !1, middleware: [Ou({ mainAxis: g === "selection" ? 0 : f, crossAxis: h }), qv({ padding: d }), g !== "selection" && Wv({ padding: d }), g === "selection" && p ? fg({ ...p, padding: d, overflowRef: s, offset: i, minItemsVisible: Xs, referenceOverflowThreshold: d, onFallbackChange(N) {
    var P, M;
    if (!N) return;
    let B = E.elements.floating;
    if (!B) return;
    let Q = parseFloat(getComputedStyle(B).scrollPaddingBottom) || 0, X = Math.min(Xs, B.childElementCount), j = 0, k = 0;
    for (let K of (M = (P = E.elements.floating) == null ? void 0 : P.childNodes) != null ? M : []) if (K instanceof HTMLElement) {
      let te = K.offsetTop, we = te + K.clientHeight + Q, $e = B.scrollTop, I = $e + B.clientHeight;
      if (te >= $e && we <= I) X--;
      else {
        k = Math.max(0, Math.min(we, I) - Math.max(te, $e)), j = K.clientHeight;
        break;
      }
    }
    X >= 1 && o((K) => {
      let te = j * X - k + Q;
      return K >= te ? K : te;
    });
  } }) : null, Kv({ padding: d, apply({ availableWidth: N, availableHeight: P, elements: M }) {
    Object.assign(M.floating.style, { overflow: "auto", maxWidth: `${N}px`, maxHeight: `min(var(--anchor-max-height, 100vh), ${P}px)` });
  } })].filter(Boolean), whileElementsMounted: Vv }), [S = g, x = b] = E.placement.split("-");
  g === "selection" && (S = "selection");
  let y = U(() => ({ anchor: [S, x].filter(Boolean).join(" ") }), [S, x]), R = dg(E, { overflowRef: s, onChange: o }), { getReferenceProps: T, getFloatingProps: $ } = cg([R]), L = H((N) => {
    l(N), O.setFloating(N);
  });
  return Fe(Wo.Provider, { value: r }, Fe(_n.Provider, { value: { setFloating: L, setReference: O.setReference, styles: _, getReferenceProps: T, getFloatingProps: $, slot: y } }, e));
}
function _g(e) {
  re(() => {
    if (!e) return;
    let t = new MutationObserver(() => {
      let n = window.getComputedStyle(e).maxHeight, r = parseFloat(n);
      if (isNaN(r)) return;
      let i = parseInt(n);
      isNaN(i) || r !== i && (e.style.maxHeight = `${Math.ceil(r)}px`);
    });
    return t.observe(e, { attributes: !0, attributeFilter: ["style"] }), () => {
      t.disconnect();
    };
  }, [e]);
}
function yg(e, t) {
  var n, r, i;
  let o = wi((n = e == null ? void 0 : e.gap) != null ? n : "var(--anchor-gap, 0)", t), s = wi((r = e == null ? void 0 : e.offset) != null ? r : "var(--anchor-offset, 0)", t), a = wi((i = e == null ? void 0 : e.padding) != null ? i : "var(--anchor-padding, 0)", t);
  return { ...e, gap: o, offset: s, padding: a };
}
function wi(e, t, n = void 0) {
  let r = zt(), i = H((l, c) => {
    if (l == null) return [n, null];
    if (typeof l == "number") return [l, null];
    if (typeof l == "string") {
      if (!c) return [n, null];
      let u = Qs(l, c);
      return [u, (f) => {
        let h = Nu(l);
        {
          let d = h.map((p) => window.getComputedStyle(c).getPropertyValue(p));
          r.requestAnimationFrame(function p() {
            r.nextFrame(p);
            let g = !1;
            for (let [O, _] of h.entries()) {
              let E = window.getComputedStyle(c).getPropertyValue(_);
              if (d[O] !== E) {
                d[O] = E, g = !0;
                break;
              }
            }
            if (!g) return;
            let b = Qs(l, c);
            u !== b && (f(b), u = b);
          });
        }
        return r.dispose;
      }];
    }
    return [n, null];
  }), o = U(() => i(e, t)[0], [e, t]), [s = o, a] = W();
  return re(() => {
    let [l, c] = i(e, t);
    if (a(l), !!c) return c(a);
  }, [e, t]), s;
}
function Nu(e) {
  let t = /var\((.*)\)/.exec(e);
  if (t) {
    let n = t[1].indexOf(",");
    if (n === -1) return [t[1]];
    let r = t[1].slice(0, n).trim(), i = t[1].slice(n + 1).trim();
    return i ? [r, ...Nu(i)] : [r];
  }
  return [];
}
function Qs(e, t) {
  let n = document.createElement("div");
  t.appendChild(n), n.style.setProperty("margin-top", "0px", "important"), n.style.setProperty("margin-top", e, "important");
  let r = parseFloat(window.getComputedStyle(n).marginTop) || 0;
  return t.removeChild(n), r;
}
function Eg(e, t) {
  let [n, r] = W(t);
  return !e && n !== t && r(t), e ? n : t;
}
let Ko = ae(null);
Ko.displayName = "OpenClosedContext";
var Ke = ((e) => (e[e.Open = 1] = "Open", e[e.Closed = 2] = "Closed", e[e.Closing = 4] = "Closing", e[e.Opening = 8] = "Opening", e))(Ke || {});
function zo() {
  return Z(Ko);
}
function xu({ value: e, children: t }) {
  return G.createElement(Ko.Provider, { value: e }, t);
}
function Og(e) {
  throw new Error("Unexpected object: " + e);
}
var ue = ((e) => (e[e.First = 0] = "First", e[e.Previous = 1] = "Previous", e[e.Next = 2] = "Next", e[e.Last = 3] = "Last", e[e.Specific = 4] = "Specific", e[e.Nothing = 5] = "Nothing", e))(ue || {});
function Si(e, t) {
  let n = t.resolveItems();
  if (n.length <= 0) return null;
  let r = t.resolveActiveIndex(), i = r ?? -1;
  switch (e.focus) {
    case 0: {
      for (let o = 0; o < n.length; ++o) if (!t.resolveDisabled(n[o], o, n)) return o;
      return r;
    }
    case 1: {
      i === -1 && (i = n.length);
      for (let o = i - 1; o >= 0; --o) if (!t.resolveDisabled(n[o], o, n)) return o;
      return r;
    }
    case 2: {
      for (let o = i + 1; o < n.length; ++o) if (!t.resolveDisabled(n[o], o, n)) return o;
      return r;
    }
    case 3: {
      for (let o = n.length - 1; o >= 0; --o) if (!t.resolveDisabled(n[o], o, n)) return o;
      return r;
    }
    case 4: {
      for (let o = 0; o < n.length; ++o) if (t.resolveId(n[o], o, n) === e.id) return o;
      return r;
    }
    case 5:
      return null;
    default:
      Og(e);
  }
}
function wg(e) {
  let t = H(e), n = D(!1);
  z(() => (n.current = !1, () => {
    n.current = !0, Hl(() => {
      n.current && t();
    });
  }), [t]);
}
function Sg() {
  let e = typeof document > "u";
  return ((t) => t.useSyncExternalStore)(ba)(() => () => {
  }, () => !1, () => !e);
}
function Yo() {
  let e = Sg(), [t, n] = W(Ft.isHandoffComplete);
  return t && Ft.isHandoffComplete === !1 && n(!1), z(() => {
    t !== !0 && n(!0);
  }, [t]), z(() => Ft.handoff(), []), e ? !1 : t;
}
let Ng = ae(!1);
function xg() {
  return Z(Ng);
}
function Ag(e) {
  let t = xg(), n = Z(Tu), r = Uo(e), [i, o] = W(() => {
    var s;
    if (!t && n !== null) return (s = n.current) != null ? s : null;
    if (Ft.isServer) return null;
    let a = r == null ? void 0 : r.getElementById("headlessui-portal-root");
    if (a) return a;
    if (r === null) return null;
    let l = r.createElement("div");
    return l.setAttribute("id", "headlessui-portal-root"), r.body.appendChild(l);
  });
  return z(() => {
    i !== null && (r != null && r.body.contains(i) || r == null || r.body.appendChild(i));
  }, [i, r]), z(() => {
    t || n !== null && o(n.current);
  }, [n, o, t]), i;
}
let Au = de, Tg = Oe(function(e, t) {
  let n = e, r = D(null), i = Ge(lh((f) => {
    r.current = f;
  }), t), o = Uo(r), s = Ag(r), [a] = W(() => {
    var f;
    return Ft.isServer ? null : (f = o == null ? void 0 : o.createElement("div")) != null ? f : null;
  }), l = Z($g), c = Yo();
  re(() => {
    !s || !a || s.contains(a) || (a.setAttribute("data-headlessui-portal", ""), s.appendChild(a));
  }, [s, a]), re(() => {
    if (a && l) return l.register(a);
  }, [l, a]), wg(() => {
    var f;
    !s || !a || (a instanceof Node && s.contains(a) && s.removeChild(a), s.childNodes.length <= 0 && ((f = s.parentElement) == null || f.removeChild(s)));
  });
  let u = De();
  return c ? !s || !a ? null : ga(u({ ourProps: { ref: i }, theirProps: n, slot: {}, defaultTag: Au, name: "Portal" }), a) : null;
});
function Rg(e, t) {
  let n = Ge(t), { enabled: r = !0, ...i } = e, o = De();
  return r ? G.createElement(Tg, { ...i, ref: n }) : o({ ourProps: { ref: n }, theirProps: i, slot: {}, defaultTag: Au, name: "Portal" });
}
let Cg = de, Tu = ae(null);
function Dg(e, t) {
  let { target: n, ...r } = e, i = { ref: Ge(t) }, o = De();
  return G.createElement(Tu.Provider, { value: n }, o({ ourProps: i, theirProps: r, defaultTag: Cg, name: "Popover.Group" }));
}
let $g = ae(null), Lg = Oe(Rg), Pg = Oe(Dg), Ig = Object.assign(Lg, { Group: Pg });
function Vg() {
  let e = D(!1);
  return re(() => (e.current = !0, () => {
    e.current = !1;
  }), []), e;
}
function Ru(e) {
  var t;
  return !!(e.enter || e.enterFrom || e.enterTo || e.leave || e.leaveFrom || e.leaveTo) || ((t = e.as) != null ? t : Du) !== de || G.Children.count(e.children) === 1;
}
let ti = ae(null);
ti.displayName = "TransitionContext";
var Fg = ((e) => (e.Visible = "visible", e.Hidden = "hidden", e))(Fg || {});
function Mg() {
  let e = Z(ti);
  if (e === null) throw new Error("A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.");
  return e;
}
function jg() {
  let e = Z(ni);
  if (e === null) throw new Error("A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.");
  return e;
}
let ni = ae(null);
ni.displayName = "NestingContext";
function ri(e) {
  return "children" in e ? ri(e.children) : e.current.filter(({ el: t }) => t.current !== null).filter(({ state: t }) => t === "visible").length > 0;
}
function Cu(e, t) {
  let n = Yt(e), r = D([]), i = Vg(), o = zt(), s = H((d, p = Ot.Hidden) => {
    let g = r.current.findIndex(({ el: b }) => b === d);
    g !== -1 && (Qe(p, { [Ot.Unmount]() {
      r.current.splice(g, 1);
    }, [Ot.Hidden]() {
      r.current[g].state = "hidden";
    } }), o.microTask(() => {
      var b;
      !ri(r) && i.current && ((b = n.current) == null || b.call(n));
    }));
  }), a = H((d) => {
    let p = r.current.find(({ el: g }) => g === d);
    return p ? p.state !== "visible" && (p.state = "visible") : r.current.push({ el: d, state: "visible" }), () => s(d, Ot.Unmount);
  }), l = D([]), c = D(Promise.resolve()), u = D({ enter: [], leave: [] }), f = H((d, p, g) => {
    l.current.splice(0), t && (t.chains.current[p] = t.chains.current[p].filter(([b]) => b !== d)), t == null || t.chains.current[p].push([d, new Promise((b) => {
      l.current.push(b);
    })]), t == null || t.chains.current[p].push([d, new Promise((b) => {
      Promise.all(u.current[p].map(([O, _]) => _)).then(() => b());
    })]), p === "enter" ? c.current = c.current.then(() => t == null ? void 0 : t.wait.current).then(() => g(p)) : g(p);
  }), h = H((d, p, g) => {
    Promise.all(u.current[p].splice(0).map(([b, O]) => O)).then(() => {
      var b;
      (b = l.current.shift()) == null || b();
    }).then(() => g(p));
  });
  return U(() => ({ children: r, register: a, unregister: s, onStart: f, onStop: h, wait: c, chains: u }), [a, s, r, f, h, u, c]);
}
let Du = de, $u = Rr.RenderStrategy;
function kg(e, t) {
  var n, r;
  let { transition: i = !0, beforeEnter: o, afterEnter: s, beforeLeave: a, afterLeave: l, enter: c, enterFrom: u, enterTo: f, entered: h, leave: d, leaveFrom: p, leaveTo: g, ...b } = e, [O, _] = W(null), E = D(null), S = Ru(e), x = Ge(...S ? [E, t, _] : t === null ? [] : [t]), y = (n = b.unmount) == null || n ? Ot.Unmount : Ot.Hidden, { show: R, appear: T, initial: $ } = Mg(), [L, N] = W(R ? "visible" : "hidden"), P = jg(), { register: M, unregister: B } = P;
  re(() => M(E), [M, E]), re(() => {
    if (y === Ot.Hidden && E.current) {
      if (R && L !== "visible") {
        N("visible");
        return;
      }
      return Qe(L, { hidden: () => B(E), visible: () => M(E) });
    }
  }, [L, E, M, B, R, y]);
  let Q = Yo();
  re(() => {
    if (S && Q && L === "visible" && E.current === null) throw new Error("Did you forget to passthrough the `ref` to the actual DOM node?");
  }, [E, L, Q, S]);
  let X = $ && !T, j = T && R && $, k = D(!1), K = Cu(() => {
    k.current || (N("hidden"), B(E));
  }, P), te = H((lt) => {
    k.current = !0;
    let J = lt ? "enter" : "leave";
    K.onStart(E, J, (me) => {
      me === "enter" ? o == null || o() : me === "leave" && (a == null || a());
    });
  }), we = H((lt) => {
    let J = lt ? "enter" : "leave";
    k.current = !1, K.onStop(E, J, (me) => {
      me === "enter" ? s == null || s() : me === "leave" && (l == null || l());
    }), J === "leave" && !ri(K) && (N("hidden"), B(E));
  });
  z(() => {
    S && i || (te(R), we(R));
  }, [R, S, i]);
  let $e = !(!i || !S || !Q || X), [, I] = lu($e, O, R, { start: te, end: we }), le = yt({ ref: x, className: ((r = ro(b.className, j && c, j && u, I.enter && c, I.enter && I.closed && u, I.enter && !I.closed && f, I.leave && d, I.leave && !I.closed && p, I.leave && I.closed && g, !I.transition && R && h)) == null ? void 0 : r.trim()) || void 0, ...au(I) }), ye = 0;
  L === "visible" && (ye |= Ke.Open), L === "hidden" && (ye |= Ke.Closed), I.enter && (ye |= Ke.Opening), I.leave && (ye |= Ke.Closing);
  let Rt = De();
  return G.createElement(ni.Provider, { value: K }, G.createElement(xu, { value: ye }, Rt({ ourProps: le, theirProps: b, defaultTag: Du, features: $u, visible: L === "visible", name: "Transition.Child" })));
}
function Bg(e, t) {
  let { show: n, appear: r = !1, unmount: i = !0, ...o } = e, s = D(null), a = Ru(e), l = Ge(...a ? [s, t] : t === null ? [] : [t]);
  Yo();
  let c = zo();
  if (n === void 0 && c !== null && (n = (c & Ke.Open) === Ke.Open), n === void 0) throw new Error("A <Transition /> is used but it is missing a `show={true | false}` prop.");
  let [u, f] = W(n ? "visible" : "hidden"), h = Cu(() => {
    n || f("hidden");
  }), [d, p] = W(!0), g = D([n]);
  re(() => {
    d !== !1 && g.current[g.current.length - 1] !== n && (g.current.push(n), p(!1));
  }, [g, n]);
  let b = U(() => ({ show: n, appear: r, initial: d }), [n, r, d]);
  re(() => {
    n ? f("visible") : !ri(h) && s.current !== null && f("hidden");
  }, [n, h]);
  let O = { unmount: i }, _ = H(() => {
    var x;
    d && p(!1), (x = e.beforeEnter) == null || x.call(e);
  }), E = H(() => {
    var x;
    d && p(!1), (x = e.beforeLeave) == null || x.call(e);
  }), S = De();
  return G.createElement(ni.Provider, { value: h }, G.createElement(ti.Provider, { value: b }, S({ ourProps: { ...O, as: de, children: G.createElement(Lu, { ref: l, ...O, ...o, beforeEnter: _, beforeLeave: E }) }, theirProps: {}, defaultTag: de, features: $u, visible: u === "visible", name: "Transition" })));
}
function Ug(e, t) {
  let n = Z(ti) !== null, r = zo() !== null;
  return G.createElement(G.Fragment, null, !n && r ? G.createElement(co, { ref: t, ...e }) : G.createElement(Lu, { ref: t, ...e }));
}
let co = Oe(Bg), Lu = Oe(kg), Pu = Oe(Ug), Xo = Object.assign(co, { Child: Pu, Root: co });
function Hg(e, t) {
  let n = D({ left: 0, top: 0 });
  if (re(() => {
    if (!t) return;
    let i = t.getBoundingClientRect();
    i && (n.current = i);
  }, [e, t]), t == null || !e || t === document.activeElement) return !1;
  let r = t.getBoundingClientRect();
  return r.top !== n.current.top || r.left !== n.current.left;
}
let Zs = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
function Js(e) {
  var t, n;
  let r = (t = e.innerText) != null ? t : "", i = e.cloneNode(!0);
  if (!(i instanceof HTMLElement)) return r;
  let o = !1;
  for (let a of i.querySelectorAll('[hidden],[aria-hidden],[role="img"]')) a.remove(), o = !0;
  let s = o ? (n = i.innerText) != null ? n : "" : r;
  return Zs.test(s) && (s = s.replace(Zs, "")), s;
}
function Gg(e) {
  let t = e.getAttribute("aria-label");
  if (typeof t == "string") return t.trim();
  let n = e.getAttribute("aria-labelledby");
  if (n) {
    let r = n.split(" ").map((i) => {
      let o = document.getElementById(i);
      if (o) {
        let s = o.getAttribute("aria-label");
        return typeof s == "string" ? s.trim() : Js(o).trim();
      }
      return null;
    }).filter(Boolean);
    if (r.length > 0) return r.join(", ");
  }
  return Js(e).trim();
}
function qg(e) {
  let t = D(""), n = D("");
  return H(() => {
    let r = e.current;
    if (!r) return "";
    let i = r.innerText;
    if (t.current === i) return n.current;
    let o = Gg(r).trim().toLowerCase();
    return t.current = i, n.current = o, o;
  });
}
var Wg = ((e) => (e[e.Open = 0] = "Open", e[e.Closed = 1] = "Closed", e))(Wg || {}), Kg = ((e) => (e[e.Single = 0] = "Single", e[e.Multi = 1] = "Multi", e))(Kg || {}), zg = ((e) => (e[e.Pointer = 0] = "Pointer", e[e.Other = 1] = "Other", e))(zg || {}), Yg = ((e) => (e[e.OpenListbox = 0] = "OpenListbox", e[e.CloseListbox = 1] = "CloseListbox", e[e.GoToOption = 2] = "GoToOption", e[e.Search = 3] = "Search", e[e.ClearSearch = 4] = "ClearSearch", e[e.RegisterOption = 5] = "RegisterOption", e[e.UnregisterOption = 6] = "UnregisterOption", e[e.SetButtonElement = 7] = "SetButtonElement", e[e.SetOptionsElement = 8] = "SetOptionsElement", e))(Yg || {});
function Ni(e, t = (n) => n) {
  let n = e.activeOptionIndex !== null ? e.options[e.activeOptionIndex] : null, r = ou(t(e.options.slice()), (o) => o.dataRef.current.domRef.current), i = n ? r.indexOf(n) : null;
  return i === -1 && (i = null), { options: r, activeOptionIndex: i };
}
let Xg = { 1(e) {
  return e.dataRef.current.disabled || e.listboxState === 1 ? e : { ...e, activeOptionIndex: null, listboxState: 1, __demoMode: !1 };
}, 0(e) {
  if (e.dataRef.current.disabled || e.listboxState === 0) return e;
  let t = e.activeOptionIndex, { isSelected: n } = e.dataRef.current, r = e.options.findIndex((i) => n(i.dataRef.current.value));
  return r !== -1 && (t = r), { ...e, listboxState: 0, activeOptionIndex: t, __demoMode: !1 };
}, 2(e, t) {
  var n, r, i, o, s;
  if (e.dataRef.current.disabled || e.listboxState === 1) return e;
  let a = { ...e, searchQuery: "", activationTrigger: (n = t.trigger) != null ? n : 1, __demoMode: !1 };
  if (t.focus === ue.Nothing) return { ...a, activeOptionIndex: null };
  if (t.focus === ue.Specific) return { ...a, activeOptionIndex: e.options.findIndex((u) => u.id === t.id) };
  if (t.focus === ue.Previous) {
    let u = e.activeOptionIndex;
    if (u !== null) {
      let f = e.options[u].dataRef.current.domRef, h = Si(t, { resolveItems: () => e.options, resolveActiveIndex: () => e.activeOptionIndex, resolveId: (d) => d.id, resolveDisabled: (d) => d.dataRef.current.disabled });
      if (h !== null) {
        let d = e.options[h].dataRef.current.domRef;
        if (((r = f.current) == null ? void 0 : r.previousElementSibling) === d.current || ((i = d.current) == null ? void 0 : i.previousElementSibling) === null) return { ...a, activeOptionIndex: h };
      }
    }
  } else if (t.focus === ue.Next) {
    let u = e.activeOptionIndex;
    if (u !== null) {
      let f = e.options[u].dataRef.current.domRef, h = Si(t, { resolveItems: () => e.options, resolveActiveIndex: () => e.activeOptionIndex, resolveId: (d) => d.id, resolveDisabled: (d) => d.dataRef.current.disabled });
      if (h !== null) {
        let d = e.options[h].dataRef.current.domRef;
        if (((o = f.current) == null ? void 0 : o.nextElementSibling) === d.current || ((s = d.current) == null ? void 0 : s.nextElementSibling) === null) return { ...a, activeOptionIndex: h };
      }
    }
  }
  let l = Ni(e), c = Si(t, { resolveItems: () => l.options, resolveActiveIndex: () => l.activeOptionIndex, resolveId: (u) => u.id, resolveDisabled: (u) => u.dataRef.current.disabled });
  return { ...a, ...l, activeOptionIndex: c };
}, 3: (e, t) => {
  if (e.dataRef.current.disabled || e.listboxState === 1) return e;
  let n = e.searchQuery !== "" ? 0 : 1, r = e.searchQuery + t.value.toLowerCase(), i = (e.activeOptionIndex !== null ? e.options.slice(e.activeOptionIndex + n).concat(e.options.slice(0, e.activeOptionIndex + n)) : e.options).find((s) => {
    var a;
    return !s.dataRef.current.disabled && ((a = s.dataRef.current.textValue) == null ? void 0 : a.startsWith(r));
  }), o = i ? e.options.indexOf(i) : -1;
  return o === -1 || o === e.activeOptionIndex ? { ...e, searchQuery: r } : { ...e, searchQuery: r, activeOptionIndex: o, activationTrigger: 1 };
}, 4(e) {
  return e.dataRef.current.disabled || e.listboxState === 1 || e.searchQuery === "" ? e : { ...e, searchQuery: "" };
}, 5: (e, t) => {
  let n = { id: t.id, dataRef: t.dataRef }, r = Ni(e, (i) => [...i, n]);
  return e.activeOptionIndex === null && e.dataRef.current.isSelected(t.dataRef.current.value) && (r.activeOptionIndex = r.options.indexOf(n)), { ...e, ...r };
}, 6: (e, t) => {
  let n = Ni(e, (r) => {
    let i = r.findIndex((o) => o.id === t.id);
    return i !== -1 && r.splice(i, 1), r;
  });
  return { ...e, ...n, activationTrigger: 1 };
}, 7: (e, t) => e.buttonElement === t.element ? e : { ...e, buttonElement: t.element }, 8: (e, t) => e.optionsElement === t.element ? e : { ...e, optionsElement: t.element } }, Qo = ae(null);
Qo.displayName = "ListboxActionsContext";
function ii(e) {
  let t = Z(Qo);
  if (t === null) {
    let n = new Error(`<${e} /> is missing a parent <Listbox /> component.`);
    throw Error.captureStackTrace && Error.captureStackTrace(n, ii), n;
  }
  return t;
}
let oi = ae(null);
oi.displayName = "ListboxDataContext";
function Jn(e) {
  let t = Z(oi);
  if (t === null) {
    let n = new Error(`<${e} /> is missing a parent <Listbox /> component.`);
    throw Error.captureStackTrace && Error.captureStackTrace(n, Jn), n;
  }
  return t;
}
function Qg(e, t) {
  return Qe(t.type, Xg, e, t);
}
let Zg = de;
function Jg(e, t) {
  var n;
  let r = Fo(), { value: i, defaultValue: o, form: s, name: a, onChange: l, by: c, invalid: u = !1, disabled: f = r || !1, horizontal: h = !1, multiple: d = !1, __demoMode: p = !1, ...g } = e;
  const b = h ? "horizontal" : "vertical";
  let O = Ge(t), _ = Qp(o), [E = d ? [] : void 0, S] = Xp(i, l, _), [x, y] = bo(Qg, { dataRef: Nc(), listboxState: p ? 0 : 1, options: [], searchQuery: "", activeOptionIndex: null, activationTrigger: 1, optionsVisible: !1, buttonElement: null, optionsElement: null, __demoMode: p }), R = D({ static: !1, hold: !1 }), T = D(/* @__PURE__ */ new Map()), $ = _h(c), L = q((ne) => Qe(N.mode, { 1: () => E.some((pe) => $(pe, ne)), 0: () => $(E, ne) }), [E]), N = U(() => ({ ...x, value: E, disabled: f, invalid: u, mode: d ? 1 : 0, orientation: b, compare: $, isSelected: L, optionsPropsRef: R, listRef: T }), [E, f, u, d, x, T]);
  re(() => {
    x.dataRef.current = N;
  }, [N]);
  let P = N.listboxState === 0;
  Mh(P, [N.buttonElement, N.optionsElement], (ne, pe) => {
    var tt;
    y({ type: 1 }), iu(pe, Bo.Loose) || (ne.preventDefault(), (tt = N.buttonElement) == null || tt.focus());
  });
  let M = U(() => ({ open: N.listboxState === 0, disabled: f, invalid: u, value: E }), [N, f, E, u]), B = H((ne) => {
    let pe = N.options.find((tt) => tt.id === ne);
    pe && we(pe.dataRef.current.value);
  }), Q = H(() => {
    if (N.activeOptionIndex !== null) {
      let { dataRef: ne, id: pe } = N.options[N.activeOptionIndex];
      we(ne.current.value), y({ type: 2, focus: ue.Specific, id: pe });
    }
  }), X = H(() => y({ type: 0 })), j = H(() => y({ type: 1 })), k = zt(), K = H((ne, pe, tt) => {
    k.dispose(), k.microTask(() => ne === ue.Specific ? y({ type: 2, focus: ue.Specific, id: pe, trigger: tt }) : y({ type: 2, focus: ne, trigger: tt }));
  }), te = H((ne, pe) => (y({ type: 5, id: ne, dataRef: pe }), () => y({ type: 6, id: ne }))), we = H((ne) => Qe(N.mode, { 0() {
    return S == null ? void 0 : S(ne);
  }, 1() {
    let pe = N.value.slice(), tt = pe.findIndex((Ec) => $(Ec, ne));
    return tt === -1 ? pe.push(ne) : pe.splice(tt, 1), S == null ? void 0 : S(pe);
  } })), $e = H((ne) => y({ type: 3, value: ne })), I = H(() => y({ type: 4 })), le = H((ne) => {
    y({ type: 7, element: ne });
  }), ye = H((ne) => {
    y({ type: 8, element: ne });
  }), Rt = U(() => ({ onChange: we, registerOption: te, goToOption: K, closeListbox: j, openListbox: X, selectActiveOption: Q, selectOption: B, search: $e, clearSearch: I, setButtonElement: le, setOptionsElement: ye }), []), [lt, J] = ph({ inherit: !0 }), me = { ref: O }, Ct = q(() => {
    if (_ !== void 0) return S == null ? void 0 : S(_);
  }, [S, _]), er = De();
  return G.createElement(J, { value: lt, props: { htmlFor: (n = N.buttonElement) == null ? void 0 : n.id }, slot: { open: N.listboxState === 0, disabled: f } }, G.createElement(bg, null, G.createElement(Qo.Provider, { value: Rt }, G.createElement(oi.Provider, { value: N }, G.createElement(xu, { value: Qe(N.listboxState, { 0: Ke.Open, 1: Ke.Closed }) }, a != null && E != null && G.createElement(rh, { disabled: f, data: { [a]: E }, form: s, onReset: Ct }), er({ ourProps: me, theirProps: g, slot: M, defaultTag: Zg, name: "Listbox" }))))));
}
let em = "button";
function tm(e, t) {
  var n;
  let r = Jn("Listbox.Button"), i = ii("Listbox.Button"), o = dn(), s = Xl(), { id: a = s || `headlessui-listbox-button-${o}`, disabled: l = r.disabled || !1, autoFocus: c = !1, ...u } = e, f = Ge(t, hg(), i.setButtonElement), h = vg(), d = H((N) => {
    switch (N.key) {
      case fe.Enter:
        Zp(N.currentTarget);
        break;
      case fe.Space:
      case fe.ArrowDown:
        N.preventDefault(), ze(() => i.openListbox()), r.value || i.goToOption(ue.First);
        break;
      case fe.ArrowUp:
        N.preventDefault(), ze(() => i.openListbox()), r.value || i.goToOption(ue.Last);
        break;
    }
  }), p = H((N) => {
    switch (N.key) {
      case fe.Space:
        N.preventDefault();
        break;
    }
  }), g = H((N) => {
    var P;
    if (sh(N.currentTarget)) return N.preventDefault();
    r.listboxState === 0 ? (ze(() => i.closeListbox()), (P = r.buttonElement) == null || P.focus({ preventScroll: !0 })) : (N.preventDefault(), i.openListbox());
  }), b = H((N) => N.preventDefault()), O = eu([a]), _ = uh(), { isFocusVisible: E, focusProps: S } = Pp({ autoFocus: c }), { isHovered: x, hoverProps: y } = Fp({ isDisabled: l }), { pressed: R, pressProps: T } = Gp({ disabled: l }), $ = U(() => ({ open: r.listboxState === 0, active: R || r.listboxState === 0, disabled: l, invalid: r.invalid, value: r.value, hover: x, focus: E, autofocus: c }), [r.listboxState, r.value, l, x, E, R, r.invalid, c]), L = ql(h(), { ref: f, id: a, type: jh(e, r.buttonElement), "aria-haspopup": "listbox", "aria-controls": (n = r.optionsElement) == null ? void 0 : n.id, "aria-expanded": r.listboxState === 0, "aria-labelledby": O, "aria-describedby": _, disabled: l || void 0, autoFocus: c, onKeyDown: d, onKeyUp: p, onKeyPress: b, onClick: g }, S, y, T);
  return De()({ ourProps: L, theirProps: u, slot: $, defaultTag: em, name: "Listbox.Button" });
}
let Iu = ae(!1), nm = "div", rm = Rr.RenderStrategy | Rr.Static;
function im(e, t) {
  var n, r;
  let i = dn(), { id: o = `headlessui-listbox-options-${i}`, anchor: s, portal: a = !1, modal: l = !0, transition: c = !1, ...u } = e, f = pg(s), [h, d] = W(null);
  f && (a = !0);
  let p = Jn("Listbox.Options"), g = ii("Listbox.Options"), b = Uo(p.optionsElement), O = zo(), [_, E] = lu(c, h, O !== null ? (O & Ke.Open) === Ke.Open : p.listboxState === 0);
  Nh(_, p.buttonElement, g.closeListbox);
  let S = p.__demoMode ? !1 : l && p.listboxState === 0;
  qh(S, b);
  let x = p.__demoMode ? !1 : l && p.listboxState === 0;
  Sh(x, { allowed: q(() => [p.buttonElement, p.optionsElement], [p.buttonElement, p.optionsElement]) });
  let y = p.listboxState !== 0, R = Hg(y, p.buttonElement) ? !1 : _, T = _ && p.listboxState === 1, $ = Eg(T, p.value), L = H((I) => p.compare($, I)), N = U(() => {
    var I;
    if (f == null || !((I = f == null ? void 0 : f.to) != null && I.includes("selection"))) return null;
    let le = p.options.findIndex((ye) => L(ye.dataRef.current.value));
    return le === -1 && (le = 0), le;
  }, [f, p.options]), P = (() => {
    if (f == null) return;
    if (N === null) return { ...f, inner: void 0 };
    let I = Array.from(p.listRef.current.values());
    return { ...f, inner: { listRef: { current: I }, index: N } };
  })(), [M, B] = mg(P), Q = gg(), X = Ge(t, f ? M : null, g.setOptionsElement, d), j = zt();
  z(() => {
    var I;
    let le = p.optionsElement;
    le && p.listboxState === 0 && le !== ((I = Xn(le)) == null ? void 0 : I.activeElement) && (le == null || le.focus({ preventScroll: !0 }));
  }, [p.listboxState, p.optionsElement]);
  let k = H((I) => {
    var le, ye;
    switch (j.dispose(), I.key) {
      case fe.Space:
        if (p.searchQuery !== "") return I.preventDefault(), I.stopPropagation(), g.search(I.key);
      case fe.Enter:
        if (I.preventDefault(), I.stopPropagation(), p.activeOptionIndex !== null) {
          let { dataRef: Rt } = p.options[p.activeOptionIndex];
          g.onChange(Rt.current.value);
        }
        p.mode === 0 && (ze(() => g.closeListbox()), (le = p.buttonElement) == null || le.focus({ preventScroll: !0 }));
        break;
      case Qe(p.orientation, { vertical: fe.ArrowDown, horizontal: fe.ArrowRight }):
        return I.preventDefault(), I.stopPropagation(), g.goToOption(ue.Next);
      case Qe(p.orientation, { vertical: fe.ArrowUp, horizontal: fe.ArrowLeft }):
        return I.preventDefault(), I.stopPropagation(), g.goToOption(ue.Previous);
      case fe.Home:
      case fe.PageUp:
        return I.preventDefault(), I.stopPropagation(), g.goToOption(ue.First);
      case fe.End:
      case fe.PageDown:
        return I.preventDefault(), I.stopPropagation(), g.goToOption(ue.Last);
      case fe.Escape:
        I.preventDefault(), I.stopPropagation(), ze(() => g.closeListbox()), (ye = p.buttonElement) == null || ye.focus({ preventScroll: !0 });
        return;
      case fe.Tab:
        I.preventDefault(), I.stopPropagation(), ze(() => g.closeListbox()), Lh(p.buttonElement, I.shiftKey ? so.Previous : so.Next);
        break;
      default:
        I.key.length === 1 && (g.search(I.key), j.setTimeout(() => g.clearSearch(), 350));
        break;
    }
  }), K = (n = p.buttonElement) == null ? void 0 : n.id, te = U(() => ({ open: p.listboxState === 0 }), [p.listboxState]), we = ql(f ? Q() : {}, { id: o, ref: X, "aria-activedescendant": p.activeOptionIndex === null || (r = p.options[p.activeOptionIndex]) == null ? void 0 : r.id, "aria-multiselectable": p.mode === 1 ? !0 : void 0, "aria-labelledby": K, "aria-orientation": p.orientation, onKeyDown: k, role: "listbox", tabIndex: p.listboxState === 0 ? 0 : void 0, style: { ...u.style, ...B, "--button-width": Eh(p.buttonElement, !0).width }, ...au(E) }), $e = De();
  return G.createElement(Ig, { enabled: a ? e.static || _ : !1 }, G.createElement(oi.Provider, { value: p.mode === 1 ? p : { ...p, isSelected: L } }, $e({ ourProps: we, theirProps: u, slot: te, defaultTag: nm, features: rm, visible: R, name: "Listbox.Options" })));
}
let om = "div";
function sm(e, t) {
  let n = dn(), { id: r = `headlessui-listbox-option-${n}`, disabled: i = !1, value: o, ...s } = e, a = Z(Iu) === !0, l = Jn("Listbox.Option"), c = ii("Listbox.Option"), u = l.activeOptionIndex !== null ? l.options[l.activeOptionIndex].id === r : !1, f = l.isSelected(o), h = D(null), d = qg(h), p = Yt({ disabled: i, value: o, domRef: h, get textValue() {
    return d();
  } }), g = Ge(t, h, ($) => {
    $ ? l.listRef.current.set(r, $) : l.listRef.current.delete(r);
  });
  re(() => {
    if (!l.__demoMode && l.listboxState === 0 && u && l.activationTrigger !== 0) return bt().requestAnimationFrame(() => {
      var $, L;
      (L = ($ = h.current) == null ? void 0 : $.scrollIntoView) == null || L.call($, { block: "nearest" });
    });
  }, [h, u, l.__demoMode, l.listboxState, l.activationTrigger, l.activeOptionIndex]), re(() => {
    if (!a) return c.registerOption(r, p);
  }, [p, r, a]);
  let b = H(($) => {
    var L;
    if (i) return $.preventDefault();
    c.onChange(o), l.mode === 0 && (ze(() => c.closeListbox()), (L = l.buttonElement) == null || L.focus({ preventScroll: !0 }));
  }), O = H(() => {
    if (i) return c.goToOption(ue.Nothing);
    c.goToOption(ue.Specific, r);
  }), _ = Wh(), E = H(($) => {
    _.update($), !i && (u || c.goToOption(ue.Specific, r, 0));
  }), S = H(($) => {
    _.wasMoved($) && (i || u || c.goToOption(ue.Specific, r, 0));
  }), x = H(($) => {
    _.wasMoved($) && (i || u && c.goToOption(ue.Nothing));
  }), y = U(() => ({ active: u, focus: u, selected: f, disabled: i, selectedOption: f && a }), [u, f, i, a]), R = a ? {} : { id: r, ref: g, role: "option", tabIndex: i === !0 ? void 0 : -1, "aria-disabled": i === !0 ? !0 : void 0, "aria-selected": f, disabled: void 0, onClick: b, onFocus: O, onPointerEnter: E, onMouseEnter: E, onPointerMove: S, onMouseMove: S, onPointerLeave: x, onMouseLeave: x }, T = De();
  return !f && a ? null : T({ ourProps: R, theirProps: s, slot: y, defaultTag: om, name: "Listbox.Option" });
}
let am = de;
function lm(e, t) {
  let { options: n, placeholder: r, ...i } = e, o = { ref: Ge(t) }, s = Jn("ListboxSelectedOption"), a = U(() => ({}), []), l = s.value === void 0 || s.value === null || s.mode === 1 && Array.isArray(s.value) && s.value.length === 0, c = De();
  return G.createElement(Iu.Provider, { value: !0 }, c({ ourProps: o, theirProps: { ...i, children: G.createElement(G.Fragment, null, r && l ? r : n) }, slot: a, defaultTag: am, name: "ListboxSelectedOption" }));
}
let um = Oe(Jg), cm = Oe(tm), fm = mh, Vu = Oe(im), dm = Oe(sm), pm = Oe(lm), Lr = Object.assign(um, { Button: cm, Label: fm, Options: Vu, Option: dm, SelectedOption: pm });
const hm = window.matchMedia("(min-width: 0px) and (max-width: 1023px)"), vm = window.matchMedia("(min-width: 768px)"), Zo = {
  isMediumDeviceDownMediaQuery: hm,
  isTabletUpMediaQuery: vm
}, ea = (e) => e instanceof MediaQueryList ? e : window.matchMedia(e);
function Jo(e) {
  const [t, n] = W(ea(e).matches);
  return z(() => {
    const r = ea(e), i = (o) => {
      n(o.matches);
    };
    return r.addEventListener("change", i), () => {
      r.addEventListener("change", i);
    };
  }, [e]), t;
}
const gm = (e) => {
  const t = D();
  return z(() => {
    t.current = e;
  }, [e]), t.current;
}, mm = (e, {
  onSubmit: t
} = {}) => (z(() => {
  const r = e.current, i = (o) => {
    typeof t == "function" && t(o);
  };
  return r == null || r.addEventListener("submit", i), () => {
    r == null || r.removeEventListener("submit", i);
  };
}, [e, t]), q(() => {
  e.current && typeof e.current.requestSubmit == "function" && e.current.requestSubmit();
}, [e]));
function bm(e, {
  replaceState: t = !1
} = {}) {
  const n = new URL(`${window.location.origin}${window.location.pathname}`);
  n.search = e.toString(), t ? (window.history.replaceState({}, "", n), window.dispatchEvent(new CustomEvent("replacestate"))) : (window.history.pushState({}, "", n), window.dispatchEvent(new CustomEvent("pushstate")));
}
class _m extends URLSearchParams {
  constructor(t, n = {}) {
    super(t), this.onUpdate = n == null ? void 0 : n.onUpdate;
  }
  set(t, n) {
    super.set(t, n), this.onUpdate(this);
  }
  replace(t, n) {
    const r = new URLSearchParams(Object.fromEntries(new URLSearchParams(t)));
    Array.from(this).forEach(([i]) => super.delete(i)), r.forEach((i, o) => super.set(o, i)), super.sort(), this.onUpdate(this, n);
  }
}
const ta = (e) => new _m(e, {
  onUpdate: bm
});
class ym {
  constructor() {
    /** @type {CustomURLSearchParams} */
    ie(this, "state");
    /**
     * @template T
     * @type {Set<function(typeof state): T>}
     */
    ie(this, "listeners", /* @__PURE__ */ new Set());
    this.state = ta(window.location.search), this.onChange = this.onChange.bind(this), this.subscribe = this.subscribe.bind(this), this.on = this.on.bind(this), this.off = this.off.bind(this), this.getState = this.getState.bind(this), this.setState = this.setState.bind(this);
  }
  getState() {
    return this.state;
  }
  setState(t) {
    this.state = t;
  }
  onChange() {
    this.setState(ta(window.location.search)), this.listeners.forEach((t) => t(this.state));
  }
  on() {
    window.addEventListener("popstate", this.onChange), window.addEventListener("pushstate", this.onChange), window.addEventListener("replacestate", this.onChange);
  }
  off() {
    window.removeEventListener("popstate", this.onChange), window.removeEventListener("pushstate", this.onChange), window.removeEventListener("replacestate", this.onChange);
  }
  subscribe(t) {
    return this.listeners.add(t), this.on(), this.off;
  }
}
const na = new ym();
function Fu() {
  return {
    state: ma(na.subscribe, na.getState)
  };
}
const fo = (e, t) => Ic.sanitize(e, t), Mu = () => Z(Rl), ra = ["em"], Jt = {
  IDLE: "idle",
  PENDING: "pending",
  SUCCESS: "success",
  FAILURE: "failure",
  NOTHING_FOUND: "nothing_found"
}, wt = {
  IDLE: "idle",
  LOAD: "load",
  LOAD_SUCCESS: "load_success",
  LOAD_FAILED: "load_failed"
}, ju = {
  status: Jt.IDLE,
  hits: [],
  total: 0,
  error: null
}, ku = (e) => ({
  ...e
}), Em = (e) => {
  const {
    contentSourceId: t,
    languageCode: n,
    versionName: r,
    variantName: i,
    path: o,
    ...s
  } = e;
  return {
    contentSourceName: _o(t),
    languageCode: n,
    versionName: r,
    variantName: i,
    url: o,
    title: (
      /** @type {string} */
      fo(s.title, {
        ALLOWED_TAGS: ra
      })
    ),
    description: (
      /** @type {string} */
      fo(s.description, {
        ALLOWED_TAGS: ra
      })
    )
  };
}, Om = (e, t) => {
  var n;
  switch (t.type) {
    case wt.IDLE:
      return {
        ...e,
        status: Jt.IDLE,
        error: null
      };
    case wt.LOAD:
      return {
        ...e,
        status: Jt.PENDING
      };
    case wt.LOAD_SUCCESS: {
      const r = t.payload.total ?? 0;
      return r <= 0 ? {
        ...ku(ju),
        status: Jt.NOTHING_FOUND
      } : {
        ...e,
        status: Jt.SUCCESS,
        hits: t.payload.hits.map(Em),
        total: r,
        error: null
      };
    }
    case wt.LOAD_FAILED:
      return {
        ...e,
        status: Jt.FAILURE,
        hits: [],
        total: 0,
        // TODO: IVPC-1127 Refine error handling
        error: (n = t.payload) == null ? void 0 : n.message
      };
    default:
      throw new Error(`Unknown action type: ${t == null ? void 0 : t.type}`);
  }
}, wm = () => {
  const e = Mu(), [t, n] = bo(Om, ju, ku), {
    state: r
  } = Fu(), i = q(async () => {
    n({
      type: wt.IDLE
    });
    try {
      n({
        type: wt.LOAD
      });
      const o = await e.searchService.fetchSuggestions({
        query: r.get(V.QUERY),
        contentSource: r.get(V.CONTENT_SOURCE),
        version: r.get(V.VERSION),
        variant: r.get(V.VARIANT),
        language: r.get(V.LANGUAGE),
        max: Number(r.get(V.MAX)),
        start: Number(r.get(V.START))
      });
      n({
        type: wt.LOAD_SUCCESS,
        payload: o
      });
    } catch (o) {
      n({
        type: wt.LOAD_FAILED,
        payload: o
      });
    }
  }, [r, e.searchService]);
  return U(() => ({
    ...t,
    load: i
  }), [i, t]);
}, Sm = ({
  totalHits: e,
  state: t
}) => {
  const n = () => Number(t[V.MAX]) || 1, r = () => Number(t[V.START]) || 0, i = Math.ceil(e / n()), o = ({
    currentIndex: l,
    activeIndex: c,
    total: u
  }) => {
    const g = l <= c + 1 && l >= c - 1, b = l >= u - 2 || l < 2, O = l === c - 1 - 1 && l === 2, _ = l === c + 1 + 1 && l === u - 2 - 1, E = 5 > l && 5 > c || u - 5 <= l && u - 5 <= c;
    return u <= 8 || g || b || _ || O || E;
  }, s = (l) => {
    let c = null;
    const u = r(), f = i * n();
    if (l === zi) {
      const h = u + n();
      !Number.isNaN(h) && h < f ? c = h : c = null;
    }
    if (l === Yi) {
      const h = u - n();
      !Number.isNaN(h) && h >= 0 ? c = h : c = null;
    }
    return c;
  }, a = Array(i).fill(!0).map((l, c) => ({
    value: c * n(),
    get active() {
      return this.value === r();
    }
  })).map((l, c, u) => ({
    ...l,
    get hidden() {
      return !o({
        currentIndex: c,
        activeIndex: u.indexOf(u.find(({
          active: f
        }) => f)),
        total: u.length
      });
    }
  }));
  return {
    next: s(zi),
    prev: s(Yi),
    pages: a
  };
}, Bu = (e) => {
  var n, r;
  const t = ((r = (n = Rc()) == null ? void 0 : n.collection) == null ? void 0 : r.members) ?? [];
  return t.length === 1 ? t[0] : t.find((i) => i.id === e);
}, Uu = (e, t) => {
  var r;
  if (Cc() && !Dc(e == null ? void 0 : e.name, Pc.language))
    return null;
  const n = e && ((r = e[t]) == null ? void 0 : r.available);
  return (n == null ? void 0 : n.length) > 0 ? n : null;
}, Nm = (e) => {
  const t = Bu(e);
  return Uu(t, "versions");
}, xm = (e) => {
  const t = Bu(e);
  return Uu(t, "variants");
}, Am = (e, {
  id: t,
  label: n,
  name: r,
  items: i
}) => {
  const o = [];
  i.length > 1 && o.push({
    name: Pe(`search.filter.${t}.all`),
    id: ""
  });
  const s = [...o, ...i].map((a, l, c) => ({
    ...a,
    total: c.length,
    get value() {
      return this.id ?? this.name;
    },
    get active() {
      return this.value === e[r];
    }
  })).map(({
    active: a,
    ...l
  }, c, u) => ({
    ...l,
    // Set the first item to be active if there is no other active item
    get active() {
      return u.some(({
        active: f
      }) => f) ? a : c === 0;
    }
  })).filter(Boolean);
  return {
    id: t,
    label: n,
    name: r,
    items: s
  };
}, Tm = [{
  id: "content",
  get label() {
    return Pe("search.filter.content.label");
  },
  name: V.CONTENT_SOURCE,
  items: () => yo()
}, {
  id: "version",
  get label() {
    return Pe("search.filter.version.label");
  },
  name: V.VERSION,
  items: (e) => Nm(e[V.CONTENT_SOURCE])
}, {
  id: "variant",
  get label() {
    return Pe("search.filter.variant.label");
  },
  name: V.VARIANT,
  items: (e) => xm(e[V.CONTENT_SOURCE])
}], Rm = (e) => Tm.map(({
  items: t,
  ...n
}) => ({
  ...n,
  items: t(e)
})).filter(({
  items: t
}) => Array.isArray(t)).map((t) => Am(e, t)).filter(Boolean);
let ia = !0, xi = null;
const Cm = (e, t) => {
  const n = new FormData();
  for (const [o, s] of new FormData(e).entries())
    n.set(o, s);
  const r = n.get(V.CONTENT_SOURCE), i = _o(r);
  return xi !== null && xi !== i && (n.delete(V.VARIANT), n.delete(V.VERSION)), Object.values(V).forEach((o) => {
    n.has(o) || n.set(o, ""), o === V.IN_APP_HELP && n.get(o) !== "true" && n.delete(o), o === V.REFERRER && !n.get(o) && n.delete(o);
  }), $c(i) || n.delete(V.VARIANT), Lc(i) || n.delete(V.VERSION), (t == null ? void 0 : t.name) !== V.START && !ia && n.set(V.START, "0"), ia = !1, xi = i, n;
};
let Ai = !1;
const Dm = (e) => {
  const {
    state: t
  } = Fu(), {
    hits: n,
    total: r,
    status: i,
    error: o,
    load: s
  } = wm(), a = q(async (h) => {
    h.preventDefault();
    const d = Cm(h.target, h.submitter);
    t.replace(d, {
      replaceState: !Ai
    }), await s();
  }, [s, t]), l = mm(e, {
    onSubmit: a
  });
  z(() => {
    !Ai && t.has(V.QUERY) && l(), Ai = !0;
  }, [t, l]);
  const c = Object.fromEntries(t), u = Rm(c), f = Sm({
    totalHits: r,
    state: c
  });
  return {
    state: c,
    results: n,
    total: r,
    status: i,
    error: o,
    pagination: f,
    filter: u
  };
}, hr = ({
  classNames: e,
  children: t,
  value: n,
  label: r,
  active: i,
  onClick: o,
  disabled: s = !1
}) => /* @__PURE__ */ m("button", {
  type: "button",
  "aria-label": r,
  "aria-current": i,
  value: n,
  onClick: o,
  className: oe(e),
  disabled: s,
  children: t
});
hr.propTypes = {
  classNames: v.string,
  children: v.node.isRequired,
  value: v.string.isRequired,
  label: v.string,
  active: v.bool,
  onClick: v.func,
  disabled: v.bool
};
const Hu = ({
  vpId: e,
  form: t,
  pages: n = [],
  nextPage: r,
  prevPage: i,
  onClick: o
}) => {
  const s = D(null), a = D(null), {
    t: l
  } = Un(), c = Jo(Zo.isTabletUpMediaQuery), u = n.find(({
    active: p
  }) => p === !0), f = (p) => {
    p.target.value.length && (s.current.setAttribute("value", `${p.target.value}`), a.current.setAttribute("value", `${p.target.value}`), a.current.click(), typeof o == "function" && o());
  };
  let h = !1, d = !1;
  return /* @__PURE__ */ m("nav", {
    "data-id": e,
    className: oe("pagination", {
      "pagination--simple": !c
    }),
    "aria-label": l("pagination.label"),
    children: [/* @__PURE__ */ m("div", {
      className: "pagination__inner",
      children: [/* @__PURE__ */ m("span", {
        className: "pagination__action-container",
        children: /* @__PURE__ */ m(hr, {
          classNames: oe("button pagination__action pagination__action--prev", {
            "button--secondary": !c
          }),
          value: i === null ? "" : `${i}`,
          onClick: f,
          disabled: i === null,
          children: /* @__PURE__ */ m(qe, {
            i18nKey: "pagination.prev.label"
          })
        })
      }), c ? /* @__PURE__ */ m("ul", {
        className: "pagination__items list-none m-0 p-0",
        children: n.map(({
          value: p,
          active: g,
          hidden: b
        }, O) => b ? !h && O > n.indexOf(u) ? (h = !0, /* @__PURE__ */ m("li", {
          children: /* @__PURE__ */ m("select", {
            className: "pagination__item button",
            "aria-label": "Select page number",
            onChange: f,
            children: [/* @__PURE__ */ m("option", {
              disabled: !0,
              selected: !0,
              value: "",
              children: "···"
            }), n.map(({
              value: _,
              hidden: E
            }, S) => !E || S < n.indexOf(u) ? null : /* @__PURE__ */ m("option", {
              value: _,
              children: S + 1
            }, _))]
          }, u)
        })) : !d && O < n.indexOf(u) ? (d = !0, /* @__PURE__ */ m("li", {
          children: /* @__PURE__ */ m("select", {
            className: "pagination__item button",
            "aria-label": "Select page number",
            onChange: f,
            children: [/* @__PURE__ */ m("option", {
              disabled: !0,
              selected: !0,
              value: "",
              children: "···"
            }), n.map(({
              value: _,
              hidden: E
            }, S) => !E || S > n.indexOf(u) ? null : /* @__PURE__ */ m("option", {
              value: _,
              children: S + 1
            }, _))]
          }, u)
        })) : null : (h = !1, d = !1, /* @__PURE__ */ m("li", {
          children: /* @__PURE__ */ m(hr, {
            value: `${p}`,
            label: l("pagination.page.label", {
              index: O + 1
            }),
            active: g,
            onClick: f,
            classNames: "pagination__item button",
            children: O + 1
          })
        }, p)))
      }) : /* @__PURE__ */ m("span", {
        className: "pagination__page-indicator",
        "aria-label": l("pagination.page.context.label", {
          index: n.indexOf(u) + 1,
          count: n.length
        }),
        children: [n.indexOf(u) + 1, " / ", n.length]
      }), /* @__PURE__ */ m("span", {
        className: "pagination__action-container",
        children: /* @__PURE__ */ m(hr, {
          classNames: oe("button pagination__action pagination__action--next", {
            "button--secondary": !c
          }),
          value: r === null ? "" : `${r}`,
          onClick: f,
          disabled: r === null,
          children: /* @__PURE__ */ m(qe, {
            i18nKey: "pagination.next.label"
          })
        })
      })]
    }), /* @__PURE__ */ m("input", {
      ref: s,
      type: "hidden",
      form: t,
      name: V.START,
      defaultValue: u == null ? void 0 : u.value
    }), /* @__PURE__ */ m("input", {
      ref: a,
      type: "submit",
      hidden: !0,
      "aria-hidden": "true",
      form: t,
      name: V.START,
      defaultValue: u == null ? void 0 : u.value
    })]
  });
};
Hu.propTypes = {
  vpId: v.string,
  form: v.string.isRequired,
  pages: v.array,
  nextPage: v.number,
  prevPage: v.number,
  onClick: v.func
};
const Gu = ({
  vpId: e,
  children: t,
  open: n = !0
}) => /* @__PURE__ */ m("details", {
  "data-id": e,
  "data-component": "expand",
  open: n,
  className: "expand",
  children: t
});
Gu.propTypes = {
  vpId: v.string.isRequired,
  open: v.bool,
  children: v.node.isRequired
};
const qu = ({
  vpId: e,
  children: t
}) => /* @__PURE__ */ m("summary", {
  "data-id": e,
  className: "expand-control",
  children: t
});
qu.propTypes = {
  vpId: v.string.isRequired,
  children: v.node.isRequired
};
const Wu = ({
  children: e
}) => /* @__PURE__ */ m("div", {
  className: "expand-body",
  children: e
});
Wu.propTypes = {
  children: v.node.isRequired
};
const Ti = Object.assign(Gu, {
  Summary: qu,
  Body: Wu
}), $m = (e, t, n) => {
  const [r, i] = W(t), o = q((s) => {
    s.key === "ArrowDown" || s.key === "ArrowRight" ? (s.preventDefault(), i((r + 1) % n)) : (s.key === "ArrowUp" || s.key === "ArrowLeft") && (s.preventDefault(), i((r - 1 + n) % n));
  }, [n, r, i]);
  return z(() => {
    const s = e.current;
    return s == null || s.addEventListener("keydown", o, !1), () => {
      s == null || s.removeEventListener("keydown", o, !1);
    };
  }, [e, o]), [r, i];
}, Ku = ae(null), zu = ({
  id: e,
  name: t,
  onChange: n,
  checked: r,
  children: i,
  index: o
}) => {
  const s = D(null), {
    currentIndex: a,
    setCurrentIndex: l,
    active: c
  } = Z(Ku), u = o === a, f = () => {
    l(o), n == null || n();
  };
  return jr(() => {
    u && c && s.current.focus();
  }, [u, c]), /* @__PURE__ */ m("button", {
    id: e,
    "data-name": t,
    "data-value": e,
    ref: s,
    tabIndex: u ? 0 : -1,
    type: "button",
    role: "radio",
    onClick: () => f(),
    "aria-checked": r,
    children: i
  });
};
zu.propTypes = {
  name: v.string.isRequired,
  onChange: v.func,
  checked: v.bool.isRequired,
  id: v.string.isRequired,
  children: v.node.isRequired,
  index: v.number.isRequired
};
const Yu = ({
  id: e,
  items: t = [],
  value: n,
  getId: r,
  label: i,
  children: o
}) => {
  const s = D(null), a = t.findIndex((d) => n === r(d)), [l, c] = $m(s, a, t.length), [u, f] = W(!1);
  z(() => {
    const d = s.current, p = (b) => {
      b.currentTarget.contains(b.relatedTarget) || (c(a), f(!1));
    }, g = () => {
      f(!0);
    };
    return d == null || d.addEventListener("focusin", g), d == null || d.addEventListener("blur", p), () => {
      d == null || d.removeEventListener("focusin", g), d == null || d.removeEventListener("blur", p);
    };
  }, [a, c]);
  const h = U(() => ({
    currentIndex: l,
    setCurrentIndex: c,
    active: u
  }), [l, c, u]);
  return /* @__PURE__ */ m(Ku.Provider, {
    value: h,
    children: /* @__PURE__ */ m("div", {
      "data-id": e,
      className: "m-0 p-0 list-none",
      role: "radiogroup",
      "aria-labelledby": i,
      ref: s,
      children: o
    })
  });
};
Yu.propTypes = {
  id: v.string.isRequired,
  items: v.array,
  value: v.string,
  getId: v.func,
  label: v.string,
  children: v.node.isRequired
};
const oa = Object.assign(Yu, {
  Item: zu
}), Xu = ({
  id: e,
  summary: t,
  items: n = [],
  form: r,
  name: i,
  value: o,
  getLabel: s,
  getId: a,
  onChange: l,
  disabled: c = !1
}) => {
  const u = D(null), f = D(null), h = (d) => {
    f.current.setAttribute("value", a(d)), u.current.click(), typeof l == "function" && l(d);
  };
  return /* @__PURE__ */ m(de, {
    children: [/* @__PURE__ */ m(Ti, {
      vpId: `search-page-vertical-filter-${e}`,
      children: [/* @__PURE__ */ m(Ti.Summary, {
        vpId: `search-page-vertical-filter-${e}-summary`,
        children: t
      }), /* @__PURE__ */ m(Ti.Body, {
        children: /* @__PURE__ */ m(oa, {
          id: `search-page-vertical-filter-${e}-items`,
          items: n,
          value: a(o),
          getId: a,
          children: n.map((d, p) => /* @__PURE__ */ m(oa.Item, {
            id: a(d),
            name: i,
            onChange: () => h(d),
            checked: a(d) === a(o),
            index: p,
            children: /* @__PURE__ */ m("span", {
              className: "filter-vertical__button",
              children: s(d)
            })
          }, a(d)))
        })
      })]
    }), /* @__PURE__ */ m("input", {
      ref: f,
      type: "hidden",
      form: r,
      name: i,
      value: a(o) ?? ""
    }), /* @__PURE__ */ m("input", {
      ref: u,
      type: "submit",
      hidden: !0,
      "aria-hidden": "true",
      form: r,
      disabled: c
    })]
  });
};
Xu.propTypes = {
  id: v.string.isRequired,
  summary: v.string,
  items: v.array,
  form: v.string.isRequired,
  name: v.string.isRequired,
  value: v.shape({
    name: v.string,
    id: v.string,
    total: v.number,
    value: v.string,
    active: v.bool
  }),
  getLabel: v.func,
  getId: v.func,
  onChange: v.func,
  disabled: v.bool
};
const Pr = 24, Lm = `0 0 ${Pr} ${Pr}`, yn = ({
  vpId: e,
  children: t,
  fill: n,
  width: r = Pr,
  height: i = Pr,
  viewBox: o = Lm
}) => /* @__PURE__ */ m("svg", {
  "data-id": e,
  xmlns: "http://www.w3.org/2000/svg",
  width: r,
  height: i,
  viewBox: o,
  fill: n || "currentColor",
  "aria-hidden": "true",
  children: t
});
yn.propTypes = {
  vpId: v.string,
  children: v.node.isRequired,
  fill: v.string,
  width: v.oneOfType([v.number, v.string]),
  height: v.oneOfType([v.number, v.string]),
  viewBox: v.string
};
const Qu = ({
  vpId: e,
  color: t,
  size: n
}) => /* @__PURE__ */ m(yn, {
  vpId: ["chevron-right-icon", e].filter(Boolean).join("-"),
  fill: "none",
  width: n,
  height: n,
  viewBox: "0 0 16 16",
  children: /* @__PURE__ */ m("path", {
    d: "M7 5L10 8L7 11",
    stroke: t || "currentColor",
    strokeWidth: "1px",
    strokeLinecap: "square"
  })
});
Qu.propTypes = {
  vpId: v.string,
  color: v.string,
  size: v.oneOfType([v.string, v.number])
};
const Zu = ({
  vpId: e,
  label: t,
  lang: n,
  IconComponent: r,
  classNames: i = {}
}) => /* @__PURE__ */ m(Lr.Button, {
  "data-id": `${e}-button`,
  className: oe("dropdown__button", i == null ? void 0 : i.button),
  lang: n,
  children: [r ? /* @__PURE__ */ m("span", {
    className: oe("dropdown__button-icon", "dropdown__button-icon--custom", i == null ? void 0 : i.icon),
    children: /* @__PURE__ */ m(r, {})
  }) : null, /* @__PURE__ */ m("span", {
    className: oe("dropdown__button-label", i == null ? void 0 : i.label),
    children: t
  }), /* @__PURE__ */ m("span", {
    className: oe("dropdown__button-icon", "dropdown__button-icon--chevron", i == null ? void 0 : i.icon),
    children: /* @__PURE__ */ m(Qu, {
      size: "16"
    })
  })]
});
Zu.propTypes = {
  vpId: v.string,
  label: v.string,
  lang: v.string,
  IconComponent: v.element,
  classNames: v.object
};
const po = {
  name: v.string,
  id: v.string,
  total: v.number,
  value: v.string,
  active: v.bool
}, Ju = ({
  vpId: e,
  value: t,
  lang: n,
  label: r,
  name: i,
  getId: o = (s) => s.id
}) => /* @__PURE__ */ m(Lr.Option, {
  "data-id": `${e}-item`,
  "data-name": i,
  "data-value": o(t),
  value: t,
  lang: n,
  className: ({
    active: s,
    selected: a
  }) => oe("dropdown__option", {
    "dropdown__option--active": s,
    "is-active": s,
    "is-selected": a
  }),
  children: ({
    active: s,
    selected: a
  }) => /* @__PURE__ */ m("span", {
    className: oe("dropdown__option-label", {
      "is-active": s,
      "is-selected": a
    }),
    children: r
  })
});
Ju.propTypes = {
  vpId: v.string,
  value: v.shape(po).isRequired,
  lang: v.string,
  label: v.string,
  name: v.string,
  getId: v.func
};
const ec = ({
  vpId: e,
  variant: t,
  items: n,
  value: r,
  onChange: i,
  getLabel: o,
  getId: s,
  label: a,
  ButtonComponent: l = Zu,
  ButtonIconComponent: c,
  ListItemComponent: u = Ju,
  TransitionComponent: f = Xo,
  classNames: h = {},
  name: d
}) => /* @__PURE__ */ m(Lr, {
  "data-component": "dropdown",
  "data-appearance": t,
  "data-id": e,
  className: oe("dropdown", h == null ? void 0 : h.container),
  value: r,
  onChange: i,
  children: /* @__PURE__ */ m("div", {
    "data-id": `${e}-inner`,
    className: oe("dropdown__inner", h == null ? void 0 : h.inner),
    children: [a ? /* @__PURE__ */ m(Lr.Label, {
      className: "sr-only",
      children: a
    }) : null, /* @__PURE__ */ m(l, {
      vpId: e,
      label: o(r),
      lang: r == null ? void 0 : r.lang,
      IconComponent: c,
      classNames: {
        button: h == null ? void 0 : h.button,
        label: h == null ? void 0 : h.buttonLabel,
        icon: h == null ? void 0 : h.buttonIcon
      }
    }), /* @__PURE__ */ m(f, {
      as: de,
      children: /* @__PURE__ */ m(Vu, {
        "data-id": `${e}-options`,
        className: oe("dropdown__options", h == null ? void 0 : h.options),
        children: n.map((p) => /* @__PURE__ */ m(u, {
          vpId: e,
          value: p,
          lang: p == null ? void 0 : p.lang,
          label: o(p),
          name: d,
          getId: s
        }, s(p)))
      })
    })]
  })
});
ec.propTypes = {
  vpId: v.string,
  variant: v.oneOf(["simple", "searchbar"]).isRequired,
  items: v.arrayOf(v.shape(po)).isRequired,
  value: v.shape(po).isRequired,
  label: v.string.isRequired,
  getLabel: v.func.isRequired,
  getId: v.func.isRequired,
  classNames: v.object,
  onChange: v.func.isRequired,
  ButtonIconComponent: v.element,
  ButtonComponent: v.element,
  ListItemComponent: v.element,
  TransitionComponent: v.element,
  name: v.string
};
const vr = {
  UP: "up",
  DOWN: "down"
}, Ir = {
  SEARCH_BAR: "searchbar",
  SIMPLE: "simple"
}, es = ({
  vpId: e,
  variant: t,
  items: n,
  value: r,
  label: i,
  getLabel: o = (h) => h.label,
  getId: s = (h) => h.id,
  classNames: a = {},
  onChange: l,
  ButtonIconComponent: c,
  direction: u = vr.DOWN,
  name: f
}) => /* @__PURE__ */ m(ec, {
  vpId: e,
  variant: t,
  items: n,
  value: r,
  label: i,
  getId: s,
  getLabel: o,
  onChange: l,
  name: f,
  ButtonIconComponent: c,
  classNames: {
    ...a,
    container: {
      ...a == null ? void 0 : a.container,
      "dropdown--simple": t === Ir.SIMPLE,
      "dropdown--searchbar": t === Ir.SEARCH_BAR
    },
    options: {
      "direction-up": u === vr.UP,
      "direction-down": u === vr.DOWN
    }
  }
}), sa = {
  name: v.string,
  id: v.string,
  total: v.number,
  value: v.string,
  active: v.bool
};
es.propTypes = {
  vpId: v.string,
  variant: v.oneOf(Object.values(Ir)).isRequired,
  items: v.arrayOf(v.shape(sa)).isRequired,
  value: v.shape(sa).isRequired,
  label: v.string,
  getLabel: v.func,
  getId: v.func,
  classNames: v.object,
  onChange: v.func.isRequired,
  ButtonIconComponent: v.element,
  direction: v.oneOf(Object.values(vr)),
  name: v.string
};
const tc = ({
  vpId: e,
  form: t,
  name: n,
  value: r,
  items: i,
  getId: o,
  onChange: s,
  ...a
}) => {
  const l = D(null), c = D(null);
  return /* @__PURE__ */ m(de, {
    children: [/* @__PURE__ */ m(es, {
      vpId: e,
      value: r,
      items: i,
      onChange: (f) => {
        l.current.setAttribute("value", o(f)), c.current.click(), typeof s == "function" && s(f);
      },
      getId: o,
      name: n,
      ...a
    }), /* @__PURE__ */ m("input", {
      ref: l,
      type: "hidden",
      form: t,
      name: n,
      value: o(r) ?? ""
    }), /* @__PURE__ */ m("input", {
      ref: c,
      type: "submit",
      hidden: !0,
      "aria-hidden": "true",
      form: t
    })]
  });
}, Vr = {
  name: v.string,
  id: v.string,
  total: v.number,
  value: v.string,
  active: v.bool
};
tc.propTypes = {
  vpId: v.string,
  form: v.string.isRequired,
  name: v.string.isRequired,
  value: v.shape(Vr),
  items: v.arrayOf(v.shape(Vr)),
  getId: v.func,
  onChange: v.func
};
const nc = ({
  form: e,
  id: t,
  label: n,
  name: r,
  value: i,
  items: o = [],
  getLabel: s,
  getId: a,
  onChange: l
}) => /* @__PURE__ */ m(tc, {
  vpId: `search-page-horizontal-filter-${t}`,
  variant: "simple",
  label: n,
  name: r,
  value: i,
  items: o,
  form: e,
  getLabel: s,
  getId: a,
  onChange: l
});
nc.propTypes = {
  form: v.string.isRequired,
  id: v.string,
  label: v.string,
  name: v.string,
  value: v.shape(Vr),
  items: v.arrayOf(v.shape(Vr)),
  getLabel: v.func,
  getId: v.func,
  onChange: v.func
};
const rc = ({
  vpId: e,
  color: t = "currentColor",
  size: n = 20
}) => /* @__PURE__ */ m(yn, {
  vpId: ["close-icon", e].filter(Boolean).join("-"),
  fill: "none",
  width: n,
  height: n,
  viewBox: "0 -960 960 960",
  children: /* @__PURE__ */ m("path", {
    fill: t,
    d: "m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"
  })
});
rc.propTypes = {
  vpId: v.string,
  color: v.string,
  size: v.oneOfType([v.string, v.number])
};
const ic = ({
  form: e,
  name: t,
  value: n,
  label: r
}) => {
  const {
    t: i
  } = Un(), o = D(null), s = D(null), a = (l) => {
    l.preventDefault(), s.current.setAttribute("value", ""), o.current.click();
  };
  return /* @__PURE__ */ m("div", {
    className: "filter-pill",
    children: [/* @__PURE__ */ m("button", {
      type: "button",
      "aria-label": i("search.filter.reset.label", {
        filter: r
      }),
      onClick: a,
      children: [/* @__PURE__ */ m(rc, {
        vpId: "filter-pill-remove"
      }), /* @__PURE__ */ m("span", {
        className: "filter-pill__label",
        children: r
      })]
    }), /* @__PURE__ */ m("input", {
      form: e,
      type: "hidden",
      ref: s,
      name: t,
      defaultValue: n
    }), /* @__PURE__ */ m("input", {
      form: e,
      type: "submit",
      ref: o,
      hidden: !0,
      "aria-hidden": "true"
    })]
  });
};
ic.propTypes = {
  form: v.string.isRequired,
  name: v.string.isRequired,
  value: v.string.isRequired,
  label: v.string.isRequired
};
const oc = ({
  title: e,
  description: t,
  labels: n = [],
  url: r,
  contentSource: i,
  openInNewTab: o
}) => /* @__PURE__ */ m("div", {
  className: "search-result",
  children: [/* @__PURE__ */ m("div", {
    className: "search-result__content-source",
    children: i
  }), /* @__PURE__ */ m("a", {
    className: "search-result__title",
    href: r,
    dangerouslySetInnerHTML: {
      __html: e
    },
    "aria-describedby": o ? "a11y-open-new-tab" : null,
    target: o ? "_blank" : null,
    rel: o ? "noopener noreferrer" : null
  }), t ? /* @__PURE__ */ m("p", {
    className: "search-result__description",
    dangerouslySetInnerHTML: {
      __html: t
    }
  }) : null, n && (n != null && n.length) ? /* @__PURE__ */ m("ul", {
    className: "search-result__labels",
    children: n.map((s) => /* @__PURE__ */ m("li", {
      children: /* @__PURE__ */ m("span", {
        "data-component": "status",
        "data-color": "neutral",
        class: "status",
        children: s
      }, s)
    }, s))
  }) : null]
});
oc.propTypes = {
  title: v.string.isRequired,
  description: v.string.isRequired,
  labels: v.array,
  url: v.string.isRequired,
  contentSource: v.string.isRequired,
  openInNewTab: v.bool
};
const ts = ht(({
  id: e,
  children: t,
  style: n,
  onSubmit: r,
  className: i
}, o) => {
  const s = U(() => `search-form-${Eo()}`, []), a = {
    action: wa(),
    "data-id": "search-form",
    className: oe(i),
    onSubmit: r
  };
  return /* @__PURE__ */ m("form", {
    role: "search",
    id: e ?? s,
    ref: o,
    method: "GET",
    style: n,
    ...a,
    children: t
  });
});
ts.propTypes = {
  id: v.string,
  children: v.node.isRequired,
  style: v.object,
  onSubmit: v.func,
  className: v.string
};
const sc = ({
  size: e = "medium",
  noColor: t = !1,
  noBackground: n = !1
}) => /* @__PURE__ */ m("div", {
  className: oe("spinner-container", {
    "spinner-variant-large": e === "large",
    "spinner-variant-small": e === "small",
    "spinner-variant-gray": t === !0,
    "spinner-variant-no-background": n === !0
  }),
  children: /* @__PURE__ */ m("svg", {
    "aria-hidden": "true",
    viewBox: "0 0 50 32",
    xmlns: "http://www.w3.org/2000/svg",
    children: [/* @__PURE__ */ m("circle", {
      className: "spinner-circle",
      cx: "6",
      cy: "6",
      r: "6"
    }), /* @__PURE__ */ m("circle", {
      className: "spinner-circle",
      cx: "25",
      cy: "6",
      r: "6"
    }), /* @__PURE__ */ m("circle", {
      className: "spinner-circle",
      cx: "44",
      cy: "6",
      r: "6"
    })]
  })
});
sc.propTypes = {
  size: v.oneOf(["small", "medium", "large"]),
  noColor: v.bool,
  noBackground: v.bool
};
if (!W)
  throw new Error("mobx-react-lite requires React with Hooks support");
if (!Fd)
  throw new Error("mobx-react-lite@3 requires mobx at least version 6 to be available");
var Pm = {};
function Im(e) {
  e();
}
function Vm(e) {
  e || (e = Im, Pm.NODE_ENV !== "production" && console.warn("[MobX] Failed to get unstable_batched updates from react-dom / react-native")), Td({ reactionScheduler: e });
}
function Fm(e) {
  return pl(e);
}
var Mm = 1e4, jm = 1e4, km = (
  /** @class */
  function() {
    function e(t) {
      var n = this;
      Object.defineProperty(this, "finalize", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: t
      }), Object.defineProperty(this, "registrations", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: /* @__PURE__ */ new Map()
      }), Object.defineProperty(this, "sweepTimeout", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: void 0
      }), Object.defineProperty(this, "sweep", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: function(r) {
          r === void 0 && (r = Mm), clearTimeout(n.sweepTimeout), n.sweepTimeout = void 0;
          var i = Date.now();
          n.registrations.forEach(function(o, s) {
            i - o.registeredAt >= r && (n.finalize(o.value), n.registrations.delete(s));
          }), n.registrations.size > 0 && n.scheduleSweep();
        }
      }), Object.defineProperty(this, "finalizeAllImmediately", {
        enumerable: !0,
        configurable: !0,
        writable: !0,
        value: function() {
          n.sweep(0);
        }
      });
    }
    return Object.defineProperty(e.prototype, "register", {
      enumerable: !1,
      configurable: !0,
      writable: !0,
      value: function(t, n, r) {
        this.registrations.set(r, {
          value: n,
          registeredAt: Date.now()
        }), this.scheduleSweep();
      }
    }), Object.defineProperty(e.prototype, "unregister", {
      enumerable: !1,
      configurable: !0,
      writable: !0,
      value: function(t) {
        this.registrations.delete(t);
      }
    }), Object.defineProperty(e.prototype, "scheduleSweep", {
      enumerable: !1,
      configurable: !0,
      writable: !0,
      value: function() {
        this.sweepTimeout === void 0 && (this.sweepTimeout = setTimeout(this.sweep, jm));
      }
    }), e;
  }()
), Bm = typeof FinalizationRegistry < "u" ? FinalizationRegistry : km, ho = new Bm(function(e) {
  var t;
  (t = e.reaction) === null || t === void 0 || t.dispose(), e.reaction = null;
}), lr = { exports: {} }, Ri = {};
/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var aa;
function Um() {
  if (aa) return Ri;
  aa = 1;
  var e = _a;
  function t(f, h) {
    return f === h && (f !== 0 || 1 / f === 1 / h) || f !== f && h !== h;
  }
  var n = typeof Object.is == "function" ? Object.is : t, r = e.useState, i = e.useEffect, o = e.useLayoutEffect, s = e.useDebugValue;
  function a(f, h) {
    var d = h(), p = r({ inst: { value: d, getSnapshot: h } }), g = p[0].inst, b = p[1];
    return o(
      function() {
        g.value = d, g.getSnapshot = h, l(g) && b({ inst: g });
      },
      [f, d, h]
    ), i(
      function() {
        return l(g) && b({ inst: g }), f(function() {
          l(g) && b({ inst: g });
        });
      },
      [f]
    ), s(d), d;
  }
  function l(f) {
    var h = f.getSnapshot;
    f = f.value;
    try {
      var d = h();
      return !n(f, d);
    } catch {
      return !0;
    }
  }
  function c(f, h) {
    return h();
  }
  var u = typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u" ? c : a;
  return Ri.useSyncExternalStore = e.useSyncExternalStore !== void 0 ? e.useSyncExternalStore : u, Ri;
}
var Ci = {}, la;
function Hm() {
  if (la) return Ci;
  la = 1;
  var e = {};
  /**
   * @license React
   * use-sync-external-store-shim.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   */
  return e.NODE_ENV !== "production" && function() {
    function t(p, g) {
      return p === g && (p !== 0 || 1 / p === 1 / g) || p !== p && g !== g;
    }
    function n(p, g) {
      f || o.startTransition === void 0 || (f = !0, console.error(
        "You are using an outdated, pre-release alpha of React 18 that does not support useSyncExternalStore. The use-sync-external-store shim will not work correctly. Upgrade to a newer pre-release."
      ));
      var b = g();
      if (!h) {
        var O = g();
        s(b, O) || (console.error(
          "The result of getSnapshot should be cached to avoid an infinite loop"
        ), h = !0);
      }
      O = a({
        inst: { value: b, getSnapshot: g }
      });
      var _ = O[0].inst, E = O[1];
      return c(
        function() {
          _.value = b, _.getSnapshot = g, r(_) && E({ inst: _ });
        },
        [p, b, g]
      ), l(
        function() {
          return r(_) && E({ inst: _ }), p(function() {
            r(_) && E({ inst: _ });
          });
        },
        [p]
      ), u(b), b;
    }
    function r(p) {
      var g = p.getSnapshot;
      p = p.value;
      try {
        var b = g();
        return !s(p, b);
      } catch {
        return !0;
      }
    }
    function i(p, g) {
      return g();
    }
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
    var o = _a, s = typeof Object.is == "function" ? Object.is : t, a = o.useState, l = o.useEffect, c = o.useLayoutEffect, u = o.useDebugValue, f = !1, h = !1, d = typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u" ? i : n;
    Ci.useSyncExternalStore = o.useSyncExternalStore !== void 0 ? o.useSyncExternalStore : d, typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop == "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  }(), Ci;
}
var ua;
function Gm() {
  if (ua) return lr.exports;
  ua = 1;
  var e = {};
  return e.NODE_ENV === "production" ? lr.exports = Um() : lr.exports = Hm(), lr.exports;
}
var qm = Gm();
function ca(e) {
  e.reaction = new gt("observer".concat(e.name), function() {
    var t;
    e.stateVersion = Symbol(), (t = e.onStoreChange) === null || t === void 0 || t.call(e);
  });
}
function Wm(e, t) {
  t === void 0 && (t = "observed");
  var n = G.useRef(null);
  if (!n.current) {
    var r = {
      reaction: null,
      onStoreChange: null,
      stateVersion: Symbol(),
      name: t,
      subscribe: function(a) {
        return ho.unregister(r), r.onStoreChange = a, r.reaction || (ca(r), r.stateVersion = Symbol()), function() {
          var l;
          r.onStoreChange = null, (l = r.reaction) === null || l === void 0 || l.dispose(), r.reaction = null;
        };
      },
      getSnapshot: function() {
        return r.stateVersion;
      }
    };
    n.current = r;
  }
  var i = n.current;
  i.reaction || (ca(i), ho.register(n, i, i)), G.useDebugValue(i.reaction, Fm), qm.useSyncExternalStore(
    // Both of these must be stable, otherwise it would keep resubscribing every render.
    i.subscribe,
    i.getSnapshot,
    i.getSnapshot
  );
  var o, s;
  if (i.reaction.track(function() {
    try {
      o = e();
    } catch (a) {
      s = a;
    }
  }), s)
    throw s;
  return o;
}
var fa = {}, Di, $i, da = !0, ac = typeof Symbol == "function" && Symbol.for, Km = ($i = (Di = Object.getOwnPropertyDescriptor(function() {
}, "name")) === null || Di === void 0 ? void 0 : Di.configurable) !== null && $i !== void 0 ? $i : !1, pa = ac ? Symbol.for("react.forward_ref") : typeof ht == "function" && ht(function(e) {
  return null;
}).$$typeof, ha = ac ? Symbol.for("react.memo") : typeof Ii == "function" && Ii(function(e) {
  return null;
}).$$typeof;
function ns(e, t) {
  var n;
  if (ha && e.$$typeof === ha)
    throw new Error("[mobx-react-lite] You are trying to use `observer` on a function component wrapped in either another `observer` or `React.memo`. The observer already applies 'React.memo' for you.");
  var r = (n = void 0) !== null && n !== void 0 ? n : !1, i = e, o = e.displayName || e.name;
  if (pa && e.$$typeof === pa && (r = !0, i = e.render, typeof i != "function"))
    throw new Error("[mobx-react-lite] `render` property of ForwardRef was not a function");
  var s = function(a, l) {
    return Wm(function() {
      return i(a, l);
    }, o);
  };
  return s.displayName = e.displayName, Km && Object.defineProperty(s, "name", {
    value: e.name,
    writable: !0,
    configurable: !0
  }), e.contextTypes && (s.contextTypes = e.contextTypes, fa.NODE_ENV !== "production" && da && (da = !1, console.warn("[mobx-react-lite] Support for Legacy Context in function components will be removed in the next major release."))), r && (s = ht(s)), s = Ii(s), Ym(e, s), fa.NODE_ENV !== "production" && Object.defineProperty(s, "contextTypes", {
    set: function() {
      var a, l;
      throw new Error("[mobx-react-lite] `".concat(this.displayName || ((a = this.type) === null || a === void 0 ? void 0 : a.displayName) || ((l = this.type) === null || l === void 0 ? void 0 : l.name) || "Component", ".contextTypes` must be set before applying `observer`."));
    }
  }), s;
}
var zm = {
  $$typeof: !0,
  render: !0,
  compare: !0,
  type: !0,
  // Don't redefine `displayName`,
  // it's defined as getter-setter pair on `memo` (see #3192).
  displayName: !0
};
function Ym(e, t) {
  Object.keys(e).forEach(function(n) {
    zm[n] || Object.defineProperty(t, n, Object.getOwnPropertyDescriptor(e, n));
  });
}
var Li;
Vm(xc);
Li = ho.finalizeAllImmediately;
const vo = ({
  id: e,
  children: t
}) => {
  const {
    t: n
  } = Un();
  return /* @__PURE__ */ m("ul", {
    id: e,
    "data-component": "search-suggestion",
    className: "search-suggestion-panel",
    role: "listbox",
    "aria-label": n("search.suggestions.label"),
    tabIndex: "-1",
    children: t
  });
};
vo.propTypes = {
  id: v.string,
  children: v.node.isRequired
};
const go = ({
  id: e,
  title: t,
  pageUrl: n,
  contentSourceName: r,
  versionName: i,
  variantName: o,
  isFocused: s = !1,
  ...a
}) => {
  const l = [r, i, o].filter(Boolean), c = n != null ? "a" : "div", u = Tn();
  return /* @__PURE__ */ m("li", {
    id: e,
    role: "option",
    "aria-selected": s,
    "aria-describedby": u ? "a11y-open-new-tab" : null,
    className: "search-suggestion-option-container",
    ...a,
    children: /* @__PURE__ */ m(c, {
      className: oe("search-suggestion-option", "search-suggestion-option--default"),
      href: n,
      target: u ? "_blank" : null,
      tabIndex: -1,
      children: [/* @__PURE__ */ m("span", {
        className: "search-suggestion-option__label",
        dangerouslySetInnerHTML: {
          __html: fo(t, {
            ALLOWED_TAGS: ["em"]
          })
        }
      }), l.length ? /* @__PURE__ */ m("div", {
        className: "search-suggestion-option__info-container",
        children: l.map((f) => /* @__PURE__ */ m("span", {
          className: "search-suggestion-option__info",
          children: f
        }))
      }) : null]
    })
  });
};
go.propTypes = {
  id: v.string,
  title: v.string,
  pageUrl: v.string,
  contentSourceName: v.string,
  versionName: v.string,
  variantName: v.string,
  isFocused: v.bool
};
const lc = ({
  vpId: e,
  color: t,
  size: n = 20
}) => /* @__PURE__ */ m(yn, {
  vpId: ["magnifier-icon", e].filter(Boolean).join("-"),
  fill: t || "currentColor",
  width: n,
  height: n,
  viewBox: "0 0 16 16",
  children: /* @__PURE__ */ m("path", {
    d: "M7.196 11.6q1.82 0 3.112-1.28Q11.6 9.043 11.6 7.205q0-1.82-1.289-3.112T7.2 2.8q-1.838 0-3.12 1.289Q2.8 5.378 2.8 7.2q0 1.838 1.28 3.12 1.278 1.28 3.116 1.28m.004 1.2a5.4 5.4 0 0 1-2.183-.442 5.8 5.8 0 0 1-1.784-1.2A5.512 5.512 0 0 1 1.6 7.2q0-1.149.442-2.174a5.7 5.7 0 0 1 1.196-1.784 5.6 5.6 0 0 1 1.774-1.2A5.4 5.4 0 0 1 7.198 1.6q1.152 0 2.177.442a5.7 5.7 0 0 1 1.783 1.2q.759.758 1.2 1.78.442 1.023.442 2.179 0 .999-.332 1.89a5.9 5.9 0 0 1-.918 1.626l2.85 2.85-.85.833-2.85-2.833a5.7 5.7 0 0 1-1.615.909A5.4 5.4 0 0 1 7.2 12.8"
  })
});
lc.propTypes = {
  vpId: v.string,
  color: v.string,
  size: v.oneOfType([v.string, v.number])
};
const uc = ({
  vpId: e,
  color: t,
  size: n = 20
}) => /* @__PURE__ */ m(yn, {
  vpId: ["magnifier-icon", e].filter(Boolean).join("-"),
  fill: t || "currentColor",
  width: n,
  height: n,
  viewBox: "0 0 16 16",
  children: [/* @__PURE__ */ m("path", {
    d: "M10.0017 6.93758C8.26716 6.45881 7.93563 6.12539 7.45542 4.38985C7.42295 4.27358 7.31871 4.19492 7.19738 4.19492C7.07604 4.19492 6.9718 4.27529 6.93933 4.38985C6.46083 6.12539 6.1276 6.4571 4.39305 6.93758C4.27684 6.97007 4.19652 7.07437 4.19652 7.19578C4.19652 7.31718 4.27684 7.42148 4.39305 7.45397C6.1276 7.93274 6.45913 8.26617 6.93933 9.99999C6.9718 10.1163 7.07604 10.1949 7.19738 10.1949C7.31871 10.1949 7.42295 10.1146 7.45542 9.99999C7.93392 8.26617 8.26716 7.93274 10.0017 7.45397C10.1179 7.42148 10.1965 7.31718 10.1965 7.19578C10.1965 7.07437 10.1162 6.97007 10.0017 6.93758Z"
  }), /* @__PURE__ */ m("path", {
    d: "M13.8701 3.82844C12.7138 3.50926 12.4927 3.28698 12.1726 2.12995C12.151 2.05244 12.0815 2 12.0006 2C11.9197 2 11.8502 2.05358 11.8285 2.12995C11.5095 3.28698 11.2874 3.50812 10.131 3.82844C10.0535 3.8501 10 3.91964 10 4.00057C10 4.08151 10.0535 4.15104 10.131 4.1727C11.2874 4.49188 11.5084 4.71416 11.8285 5.87005C11.8502 5.94756 11.9197 6 12.0006 6C12.0815 6 12.151 5.94642 12.1726 5.87005C12.4916 4.71416 12.7138 4.49188 13.8701 4.1727C13.9476 4.15104 14 4.08151 14 4.00057C14 3.91964 13.9465 3.8501 13.8701 3.82844Z"
  }), /* @__PURE__ */ m("path", {
    d: "M7.19824 1.59961C7.94604 1.59961 8.65353 1.7411 9.32129 2.02051L8.89551 3.125C8.37531 2.90799 7.81009 2.79983 7.2002 2.7998C5.97449 2.7998 4.93486 3.22983 4.08105 4.08887C3.22724 4.94792 2.7998 5.98496 2.7998 7.2002C2.79985 8.42575 3.22628 9.4656 4.0791 10.3193C4.932 11.1731 5.97096 11.5995 7.19531 11.5996C8.40935 11.5996 9.44748 11.1733 10.3086 10.3203C10.9613 9.67367 11.3647 8.9198 11.5225 8.05957L12.7861 7.58496C12.7515 8.1103 12.6462 8.61231 12.4678 9.09082C12.2463 9.68481 11.9401 10.227 11.5498 10.7168L14.4004 13.5664L13.5498 14.4004L10.7002 11.5664C10.2137 11.9564 9.67502 12.2595 9.08496 12.4756C8.49496 12.6917 7.86677 12.7998 7.2002 12.7998C6.42354 12.7998 5.69586 12.6528 5.01758 12.3584C4.33926 12.064 3.74451 11.6638 3.2334 11.1582C2.72237 10.6527 2.32208 10.0611 2.0332 9.38281C1.74431 8.70441 1.59961 7.976 1.59961 7.19922C1.59966 6.43302 1.74766 5.70853 2.04199 5.02539C2.33644 4.34206 2.73513 3.74702 3.23828 3.24121C3.74136 2.73553 4.33235 2.33518 5.01172 2.04102C5.69118 1.74685 6.42025 1.59964 7.19824 1.59961Z"
  })]
});
uc.propTypes = {
  vpId: v.string,
  color: v.string,
  size: v.oneOfType([v.string, v.number])
};
const cc = ht(({
  form: e,
  value: t,
  label: n,
  pending: r = !1,
  classNames: i,
  onChange: o,
  onBlur: s,
  placeholder: a,
  variant: l,
  children: c,
  ...u
}, f) => {
  var d;
  const {
    t: h
  } = Un();
  return /* @__PURE__ */ m("div", {
    "data-component": "search-input",
    "data-appearance": l,
    className: oe("search-input", {
      "search-input--border": l === "border"
    }, i == null ? void 0 : i.root),
    children: [/* @__PURE__ */ m("input", {
      ...u,
      ref: f,
      form: e,
      type: "search",
      autoComplete: "off",
      value: t,
      placeholder: a,
      "aria-label": n,
      className: oe("search-input__input", i == null ? void 0 : i.input),
      onChange: o,
      onBlur: s
    }), /* @__PURE__ */ m("div", {
      className: "search-input__slot",
      children: c
    }), /* @__PURE__ */ m("button", {
      type: "submit",
      "aria-label": h("search.submit.label"),
      className: "search-input__submit search-input__icon",
      form: e,
      children: (d = Oo("site")) != null && d.aiSearchEnabled ? /* @__PURE__ */ m(uc, {}) : /* @__PURE__ */ m(lc, {})
    }), /* @__PURE__ */ m(Xo, {
      as: "div",
      className: "search-input__spinner",
      enter: "transition-opacity duration-75 delay-150",
      enterFrom: "opacity-0",
      enterTo: "opacity-100",
      leave: "transition-opacity duration-75",
      leaveFrom: "opacity-100",
      leaveTo: "opacity-0",
      show: r,
      appear: !0
    })]
  });
});
cc.propTypes = {
  form: v.string,
  value: v.string,
  label: v.string,
  pending: v.bool,
  classNames: v.object,
  onChange: v.func,
  onBlur: v.func,
  placeholder: v.string,
  variant: v.string,
  children: v.node
};
const Xm = [he.SUGGESTIONS_FOUND, he.NO_SUGGESTIONS_FOUND, he.INVALID_QUERY], Qm = ns(({
  searchStore: e,
  classNames: t,
  onChange: n
}) => {
  const i = [{
    get name() {
      return Pe("search.filter.content.all");
    },
    id: null
  }, ...e.contentSources], o = e.selectedContentSource ?? i[0], s = (a) => {
    e.setContentSourceFilter(a.id), typeof n == "function" && n(a);
  };
  return /* @__PURE__ */ m(es, {
    vpId: "search-bar-content-source-filter",
    variant: Ir.SEARCH_BAR,
    items: i,
    value: o,
    getId: ({
      id: a
    } = {}) => a,
    getLabel: ({
      name: a
    } = {}) => a,
    onChange: s,
    classNames: t
  });
}), Zm = ns(({
  id: e,
  searchStore: t
}) => {
  var s, a;
  const n = t.suggestions.filter(({
    type: l
  }) => l === "suggestion"), r = t.suggestions.filter(({
    type: l
  }) => l === "cta"), i = t.suggestions.filter(({
    type: l
  }) => l === "tool"), o = t.suggestions.filter(({
    type: l
  }) => l === void 0);
  return ((s = t.activeTool) == null ? void 0 : s.id) === "ai-search" ? /* @__PURE__ */ m(vo, {
    id: e,
    children: /* @__PURE__ */ m("k15t-ai-search", {
      query: t.query,
      contentsource: (a = t.selectedContentSource) == null ? void 0 : a.id,
      version: t.selectedVersion,
      variant: t.selectedVariant,
      style: {
        "--border-width": 0
      }
    }, "")
  }) : /* @__PURE__ */ m(vo, {
    id: e,
    children: [i.length ? /* @__PURE__ */ m(de, {
      children: [/* @__PURE__ */ m("div", {
        className: "search-suggestion-tools-container",
        children: i.map(({
          id: l,
          focused: c,
          title: u,
          query: f,
          action: h,
          icon: d = () => {
          }
        }) => /* @__PURE__ */ m("li", {
          role: "option",
          "aria-selected": c,
          className: "search-suggestion-option search-suggestion-option--default search-suggestion-tools-option",
          children: /* @__PURE__ */ m("button", {
            type: "button",
            id: l,
            tabIndex: "-1",
            className: oe("search-suggestion-tools-item"),
            onClick: () => h(l),
            children: [/* @__PURE__ */ m("span", {
              role: "img",
              "aria-hidden": "true",
              dangerouslySetInnerHTML: {
                __html: d
              }
            }), /* @__PURE__ */ m("span", {
              children: [/* @__PURE__ */ m("b", {
                className: "title",
                children: u
              }), ": ", /* @__PURE__ */ m("span", {
                className: "query",
                children: f
              })]
            })]
          }, l)
        }))
      }), /* @__PURE__ */ m("p", {
        style: {
          textAlign: "left",
          marginLeft: "16px",
          marginBottom: "10px",
          marginTop: "10px",
          fontSize: "14px",
          color: "var(--K15t-foreground-subtle)"
        },
        children: Pe("search.results.label")
      })]
    }) : null, n.map(({
      id: l,
      focused: c,
      title: u,
      url: f,
      contentSourceName: h,
      versionName: d,
      variantName: p
    }) => /* @__PURE__ */ m(go, {
      id: l,
      isFocused: c,
      title: u,
      pageUrl: f,
      contentSourceName: h,
      versionName: d,
      variantName: p
    }, l)), o.map(({
      id: l,
      title: c,
      url: u
    }) => /* @__PURE__ */ m(go, {
      id: l,
      title: c,
      pageUrl: u,
      isFocused: !1
    }, l)), r.length ? /* @__PURE__ */ m("li", {
      className: "search-suggestion-action-container",
      children: r.map(({
        id: l,
        focused: c,
        title: u,
        url: f
      }) => /* @__PURE__ */ m("a", {
        id: l,
        role: "option",
        "aria-selected": c,
        href: f,
        rel: "noopener",
        tabIndex: "-1",
        className: "search-suggestion-action button button--secondary",
        children: u
      }, l))
    }) : null]
  });
}), fc = ht(({
  vpId: e,
  label: t,
  searchStore: n,
  noContentSourceFilter: r = !1,
  noSuggestions: i = !1,
  autoFocus: o = !1,
  form: s,
  variant: a,
  inputVariant: l,
  defaultValue: c,
  name: u
}, f) => {
  var y, R;
  const h = D(null), d = i ? null : Xm.includes(n.suggestionsState) || Array.isArray(n.suggestions) && n.suggestions.length >= 1;
  Mp({
    ref: h,
    onInteractOutside: () => {
      d && n.clearSuggestions();
    },
    isDisabled: !((y = h == null ? void 0 : h.current) != null && y.contains(document.activeElement))
  });
  const p = q((T) => {
    T.preventDefault(), n && n.query !== T.target.value && n.input(T.target.value, {
      fetchSuggestions: i === !1
    });
  }, [n, i]), {
    keyboardProps: g
  } = Ip({
    onKeyDown: (T) => {
      switch (T.nativeEvent.code) {
        case "ArrowDown": {
          T.preventDefault(), n.focusNextSuggestion();
          break;
        }
        case "ArrowUp": {
          T.preventDefault(), n.focusPreviousSuggestion();
          break;
        }
        case "Escape": {
          T.preventDefault(), n.clearSuggestions();
          break;
        }
      }
    }
  }), b = U(() => `suggestion-${Eo()}`, []), O = (R = n == null ? void 0 : n.suggestions.find(({
    focused: T
  }) => T)) == null ? void 0 : R.id, _ = i ? {} : {
    ...g,
    role: "combobox",
    "aria-controls": b,
    "aria-expanded": d,
    "aria-autocomplete": "list",
    "aria-activedescendant": O
  }, E = Jo(Zo.isMediumDeviceDownMediaQuery), S = !r && !E, x = D(null);
  return ya(f, () => ({
    focus() {
      var T;
      (T = x.current) == null || T.focus();
    },
    blur() {
      var T;
      (T = x.current) == null || T.blur();
    }
  }), []), /* @__PURE__ */ m("div", {
    "data-id": e,
    "data-component": "search-bar",
    "data-appearance": a,
    className: oe("search-bar", {
      "has-suggestions": !i,
      "has-filter": S
    }),
    ref: h,
    children: [/* @__PURE__ */ m("div", {
      className: "search-bar__input-container",
      children: /* @__PURE__ */ m(cc, {
        ..._,
        ref: x,
        form: s,
        autoFocus: o,
        value: n ? n.query : c,
        required: !0,
        variant: l,
        label: t ?? Pe("search.label"),
        name: u,
        pending: n ? n.pending : !1,
        classNames: {
          input: {
            "!rounded-r-none": S
          }
        },
        onChange: p,
        onFocus: p,
        children: S ? /* @__PURE__ */ m(Qm, {
          searchStore: n
        }) : null
      })
    }), i || !d ? null : /* @__PURE__ */ m(Zm, {
      id: b,
      expanded: d,
      searchStore: n
    })]
  });
});
fc.propTypes = {
  vpId: v.string,
  label: v.string,
  searchStore: v.instanceOf(gn),
  noContentSourceFilter: v.bool,
  noSuggestions: v.bool,
  autoFocus: v.bool,
  form: v.string,
  variant: v.string,
  inputVariant: v.string,
  defaultValue: v.string,
  name: v.string
};
const dc = ns(fc), pc = ht((e, t) => {
  const n = D(null), {
    children: r,
    variant: i = "default",
    className: o,
    ariaLabel: s,
    ariaHidden: a,
    tabIndex: l,
    onClick: c,
    ...u
  } = e;
  return ya(t, () => ({
    focus() {
      n.current.focus();
    }
  })), /* @__PURE__ */ m("button", {
    type: "button",
    className: oe("button", {
      "button--primary": i === "primary",
      "button--secondary": i === "secondary"
    }, o),
    ...u,
    onClick: c,
    "aria-label": s,
    "aria-hidden": a,
    tabIndex: l,
    ref: n,
    children: r
  });
});
pc.propTypes = {
  children: v.node.isRequired,
  variant: v.oneOf(["primary", "secondary"]),
  className: v.string,
  ariaLabel: v.string,
  ariaHidden: v.string,
  tabIndex: v.number
};
const hc = ({
  vpId: e,
  color: t = "currentColor",
  size: n = 20
}) => /* @__PURE__ */ m(yn, {
  vpId: ["filter-icon", e].filter(Boolean).join("-"),
  fill: "none",
  width: n,
  height: n,
  viewBox: "0 -960 960 960",
  children: /* @__PURE__ */ m("path", {
    fill: t,
    d: "M400-240v-80h160v80H400ZM240-440v-80h480v80H240ZM120-640v-80h720v80H120Z"
  })
});
hc.propTypes = {
  vpId: v.string,
  color: v.string,
  size: v.oneOfType([v.string, v.number])
};
const Jm = (e, t) => {
  try {
    const n = new URL(e);
    return ["http:", "https:"].includes(n.protocol) && n.origin === t;
  } catch {
    return !1;
  }
}, eb = (e) => {
  let t = "";
  if (e != null && e.length) {
    let n = null;
    try {
      n = decodeURIComponent(e);
    } catch {
    }
    n && Jm(n, self.location.origin) && (t = n);
  }
  return t;
}, on = "search-form", rs = () => window.scrollTo({
  top: 0
}), tb = (e) => e.focus(), va = (e, t, {
  disabled: n,
  onClick: r
}) => !Array.isArray(e) || !e.length ? null : /* @__PURE__ */ m("fieldset", {
  "data-id": "search-page-vertical-filter",
  disabled: n,
  className: "filter-vertical",
  children: [/* @__PURE__ */ m("legend", {
    className: "sr-only",
    children: /* @__PURE__ */ m(qe, {
      i18nKey: "search.filter.label"
    })
  }), e.map((i) => /* @__PURE__ */ m("div", {
    hidden: i.items.length <= 1,
    children: /* @__PURE__ */ m(Xu, {
      id: i.id,
      summary: i.label,
      name: i.name,
      value: i.items.find(({
        active: o
      }) => o),
      items: i.items,
      form: on,
      getLabel: ({
        name: o
      } = {}) => o,
      getId: ({
        value: o
      } = {}) => o,
      onChange: (o) => {
        rs(), typeof r == "function" && r(o);
      }
    })
  }, i.id))]
}), nb = (e, t, {
  disabled: n
}) => !Array.isArray(e) || !e.length ? null : /* @__PURE__ */ m("fieldset", {
  "data-id": "search-page-horizontal-filter",
  disabled: n,
  className: "search-page__filter-horizontal hidden lg:flex flex flex-row gap-4 p-0 m-0 border-0",
  children: [/* @__PURE__ */ m("legend", {
    className: "sr-only",
    children: /* @__PURE__ */ m(qe, {
      i18nKey: "search.filter.label"
    })
  }), e.map((r) => /* @__PURE__ */ m("div", {
    hidden: r.items.length <= 1,
    children: /* @__PURE__ */ m(nc, {
      id: r.id,
      label: r.label,
      name: r.name,
      value: r.items.find(({
        active: i
      }) => i),
      items: r.items,
      form: on,
      getLabel: ({
        name: i
      } = {}) => i,
      getId: ({
        value: i
      } = {}) => i,
      onChange: () => rs()
    })
  }, r.id))]
}), rb = (e) => Array.isArray(e) ? e.flatMap(({
  name: t,
  items: n
}) => n.filter(({
  active: r
}) => r === !0).map(({
  ...r
}) => ({
  ...r,
  filterName: t
}))) : [], Pi = Tn(), vc = ({
  filterLayout: e
}) => {
  var T, $, L;
  const t = D(null), n = D(null), [r, i] = W(!1), o = D(null), {
    state: s,
    results: a,
    total: l,
    status: c,
    pagination: u,
    filter: f
  } = Dm(t), h = gm(c), d = rb(f), p = Jo(Zo.isMediumDeviceDownMediaQuery), g = c === "success" || h === "success" && c === "pending", b = d.some(({
    value: N
  }) => N.length), O = p && b, _ = s[V.QUERY], E = eb(s[V.REFERRER]), {
    t: S
  } = Un();
  z(() => {
    document.title = [_, S("search.label"), document.title].filter(Boolean).join(" — ");
  }, [S, _]);
  const x = Pi && E.length, y = g || O, R = D(null);
  return /* @__PURE__ */ m(de, {
    children: [/* @__PURE__ */ m(ts, {
      id: on,
      ref: t,
      onSubmit: () => {
        var N;
        (N = n.current) == null || N.blur();
      },
      children: [np.map(({
        name: N,
        defaultValue: P
      }) => /* @__PURE__ */ m("input", {
        type: "hidden",
        name: N,
        value: s[N] ?? P
      }, N)), /* @__PURE__ */ m("input", {
        type: "hidden",
        name: V.LANGUAGE,
        value: document.documentElement.lang
      }, V.LANGUAGE)]
    }), /* @__PURE__ */ m("search", {
      id: "content",
      tabindex: "-1",
      className: "search-page",
      children: [/* @__PURE__ */ m("div", {
        className: "search-page__search-bar search-bar-container",
        children: [/* @__PURE__ */ m(dc, {
          vpId: "search-page-search-bar",
          form: on,
          variant: "large",
          inputVariant: "border",
          name: V.QUERY,
          defaultValue: _ ?? "",
          noSuggestions: !0,
          noContentSourceFilter: !0,
          ref: n
        }), !Pi && p && f.some(({
          items: N
        }) => N.length > 1) ? /* @__PURE__ */ m(pc, {
          variant: "secondary",
          onClick: () => {
            i(!0), o.current.showModal();
          },
          ariaLabel: S("search.filter.open.label"),
          "aria-controls": (T = o.current) == null ? void 0 : T.id,
          "aria-expanded": r,
          "aria-haspopup": "dialog",
          children: /* @__PURE__ */ m(hc, {
            vpId: "filter-icon"
          })
        }) : null]
      }), /* @__PURE__ */ m("div", {
        className: "search-page__subgrid",
        children: [e === xr.HORIZONTAL && !p && nb(f, s, {
          disabled: r
        }), /* @__PURE__ */ m("hr", {
          className: "search-page__hr"
        }), e === xr.VERTICAL && !p && /* @__PURE__ */ m("div", {
          className: "search-page__aside search-page__filter-vertical",
          children: va(f, s, {
            disabled: r
          })
        }), /* @__PURE__ */ m("div", {
          ref: R,
          tabIndex: "-1",
          "data-id": "search-page-main",
          className: "search-page__main",
          children: [/* @__PURE__ */ m("p", {
            role: "status",
            className: "sr-only",
            children: c === "pending" ? S("search.event.pending.label") : null
          }), ($ = Oo("site")) != null && $.aiSearchEnabled ? /* @__PURE__ */ m("k15t-ai-search", {
            query: _,
            mode: "manual",
            contentsource: s[V.CONTENT_SOURCE],
            version: s[V.VERSION],
            variant: s[V.VARIANT]
          }) : null, /* @__PURE__ */ m("div", {
            className: "search-page__main-inner",
            inert: c === "pending" ? "true" : void 0,
            children: [/* @__PURE__ */ m("div", {
              style: {
                position: "absolute",
                inset: 0,
                pointerEvents: "none"
              },
              children: /* @__PURE__ */ m(Xo, {
                show: c === "pending",
                appear: !0,
                enter: "transition-opacity duration-75 delay-150",
                enterFrom: "opacity-0",
                enterTo: "opacity-100",
                leave: "transition-opacity duration-75",
                leaveFrom: "opacity-100",
                leaveTo: "opacity-0",
                children: /* @__PURE__ */ m(Pu, {
                  as: G.Fragment,
                  children: /* @__PURE__ */ m("div", {
                    className: "search-page__loading",
                    children: /* @__PURE__ */ m(sc, {
                      noBackground: !0,
                      noColor: !0
                    })
                  })
                })
              })
            }), /* @__PURE__ */ m("div", {
              className: oe("search-page__results-header", {
                "search-page__results-header--hidden": !x && !y
              }),
              children: [x ? /* @__PURE__ */ m("a", {
                className: "m-0 search-results__go-back-button flex-shrink-0 flex items-center gap-2",
                href: E,
                children: [/* @__PURE__ */ m("svg", {
                  "aria-hidden": "true",
                  width: "12",
                  height: "12",
                  viewBox: "0 0 12 12",
                  fill: "none",
                  xmlns: "http://www.w3.org/2000/svg",
                  children: /* @__PURE__ */ m("path", {
                    d: "M5.99989 11.5554L0.444336 5.99989L5.99989 0.444336L6.98947 1.41656L3.10059 5.30545H11.5554V6.69434H3.10059L6.98947 10.5832L5.99989 11.5554Z",
                    fill: "#1C1B1F"
                  })
                }), /* @__PURE__ */ m(qe, {
                  i18nKey: "inAppHelp.search.back.label"
                })]
              }) : null, y && g ? /* @__PURE__ */ m("p", {
                role: "status",
                className: "m-0 search-results__results__label flex-shrink-0",
                children: /* @__PURE__ */ m(qe, {
                  i18nKey: "search.results.found.label",
                  values: {
                    count: l
                  }
                })
              }) : null, !x && g && O ? /* @__PURE__ */ m("fieldset", {
                role: "log",
                "data-id": "search-page-filter-pills",
                className: "m-0 p-0 border-none",
                disabled: r,
                children: [/* @__PURE__ */ m("label", {
                  className: "sr-only",
                  children: /* @__PURE__ */ m(qe, {
                    i18nKey: "search.filter.active.label"
                  })
                }), /* @__PURE__ */ m("ul", {
                  className: "list-none m-0 p-0 flex flex-wrap gap-2",
                  children: d.map(({
                    filterName: N,
                    name: P,
                    value: M,
                    total: B
                  }) => /* @__PURE__ */ m("li", {
                    hidden: B <= 1 || M.length === 0,
                    children: /* @__PURE__ */ m(ic, {
                      form: on,
                      name: N,
                      value: M,
                      label: P
                    })
                  }, N))
                })]
              }) : null]
            }), c === "nothing_found" && /* @__PURE__ */ m("div", {
              role: "log",
              children: [/* @__PURE__ */ m("p", {
                className: "mb-4",
                children: /* @__PURE__ */ m(qe, {
                  i18nKey: "search.results.nothing.label"
                })
              }), /* @__PURE__ */ m(qe, {
                i18nKey: "search.results.nothing.description"
              })]
            }), c === "failure" && /* @__PURE__ */ m("div", {
              role: "log",
              children: [/* @__PURE__ */ m("p", {
                className: "mb-4",
                children: /* @__PURE__ */ m(qe, {
                  i18nKey: "search.error.general.label"
                })
              }), /* @__PURE__ */ m(qe, {
                i18nKey: "search.error.general.description"
              })]
            }), (c === "success" || h === "success" && c === "pending") && (a.length ? /* @__PURE__ */ m("ul", {
              "aria-label": S("search.results.label"),
              "data-id": "search-page-results",
              className: "contents m-0 p-0 list-none",
              children: a.map((N, P) => /* @__PURE__ */ m("li", {
                "aria-label": S("search.results.item.label", {
                  index: P + 1
                }),
                children: /* @__PURE__ */ m(oc, {
                  url: N.url,
                  description: N.description,
                  title: N.title,
                  labels: [N.versionName, N.variantName].filter(Boolean),
                  contentSource: N.contentSourceName,
                  openInNewTab: Pi
                })
              }, N.url))
            }) : null)]
          })]
        })]
      }), (c === "success" || h === "success" && c === "pending") && u.pages.length > 1 && /* @__PURE__ */ m(de, {
        children: [/* @__PURE__ */ m("hr", {
          className: "search-page__hr"
        }), /* @__PURE__ */ m("div", {
          className: "search-page__pagination",
          children: /* @__PURE__ */ m(Hu, {
            vpId: "search-page-pagination",
            form: on,
            pages: u.pages,
            nextPage: u.next,
            prevPage: u.prev,
            onClick: () => {
              rs(), tb(R.current);
            }
          })
        })]
      })]
    }), p && Array.isArray(f) && f.length ? /* @__PURE__ */ m("dialog", {
      ref: o,
      id: "search-page-filter-mobile-dialog",
      class: "drawer",
      children: [/* @__PURE__ */ m("header", {
        class: "flex justify-end p-4",
        children: /* @__PURE__ */ m("button", {
          type: "button",
          className: "close-button drawer-toggle",
          "aria-label": S("search.filter.close.label"),
          "aria-controls": (L = o.current) == null ? void 0 : L.id,
          "aria-expanded": r,
          "aria-haspopup": "dialog",
          onClick: () => {
            i(!1), o.current.close();
          },
          children: /* @__PURE__ */ m("span", {
            "aria-hidden": "true",
            children: "×"
          })
        })
      }), /* @__PURE__ */ m("div", {
        className: "px-4",
        children: va(f, s, {
          disabled: !r
        })
      })]
    }) : null]
  });
};
vc.propTypes = {
  filterLayout: v.string.isRequired
};
const gc = ({
  store: e,
  filterLayout: t
}) => /* @__PURE__ */ m(Po, {
  store: e,
  children: /* @__PURE__ */ m(vc, {
    filterLayout: t
  })
});
gc.propTypes = {
  store: v.instanceOf(gn),
  filterLayout: v.oneOf([xr.VERTICAL, xr.HORIZONTAL]).isRequired
};
var kn, Fr, mc;
class ib extends HTMLElement {
  constructor() {
    super(...arguments);
    ut(this, Fr);
    ut(this, kn);
  }
  connectedCallback() {
    (async () => {
      await En(this, Fr, mc).call(this);
      const n = this.getAttribute("layout");
      Ea(Fe(gc, {
        store: Xt(this, kn),
        filterLayout: n ?? "horizontal"
      }), this);
    })();
  }
}
kn = new WeakMap(), Fr = new WeakSet(), mc = async function() {
  Qt(this, kn, new gn({
    searchService: new Tl({
      lang: document.documentElement.lang
    }),
    contentSources: yo(),
    context: Sa()
  }));
};
customElements.define("search-page", ib);
const bc = ({
  store: e,
  ...t
}) => /* @__PURE__ */ m(Po, {
  store: e,
  children: /* @__PURE__ */ m(ob, {
    ...t
  })
});
bc.propTypes = {
  store: v.instanceOf(gn).isRequired
};
const _c = ({
  variant: e,
  hasQuickSearch: t = !1,
  hasContentSourceFilter: n = !1
}, r) => {
  const i = Mu(), o = D();
  return /* @__PURE__ */ m(ts, {
    ref: o,
    onSubmit: (a) => {
      a.preventDefault(), i.submit();
    },
    className: "flex w-full justify-center",
    children: /* @__PURE__ */ m(dc, {
      ref: r,
      searchStore: i,
      variant: e,
      noSuggestions: !t,
      noContentSourceFilter: i.contentSources.length <= 1 || !n
    })
  });
};
_c.propTypes = {
  variant: v.string,
  hasQuickSearch: v.bool,
  hasContentSourceFilter: v.bool
};
const ob = ht(_c);
var Bn, Mr, yc;
class sb extends HTMLElement {
  constructor() {
    super(...arguments);
    ut(this, Mr);
    ut(this, Bn);
  }
  connectedCallback() {
    (async () => {
      await En(this, Mr, yc).call(this);
      const n = this.hasAttribute("quicksearch"), r = this.hasAttribute("contentsourcefilter"), i = this.getAttribute("variant");
      Ea(Fe(bc, {
        store: Xt(this, Bn),
        hasQuickSearch: n,
        hasContentSourceFilter: r,
        variant: i
      }), this);
    })();
  }
}
Bn = new WeakMap(), Mr = new WeakSet(), yc = async function() {
  Qt(this, Bn, new gn({
    searchService: new Tl({
      lang: document.documentElement.lang
    }),
    contentSources: yo(),
    context: Sa()
  }));
};
customElements.define("search-bar", sb);
