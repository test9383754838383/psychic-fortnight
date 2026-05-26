var H = (a) => {
  throw TypeError(a);
};
var L = (a, o, t) => o.has(a) || H("Cannot " + t);
var s = (a, o, t) => (L(a, o, "read from private field"), t ? t.call(a) : o.get(a)), h = (a, o, t) => o.has(a) ? H("Cannot add the same private member more than once") : o instanceof WeakSet ? o.add(a) : o.set(a, t), c = (a, o, t, e) => (L(a, o, "write to private field"), e ? e.call(a, t) : o.set(a, t), t), m = (a, o, t) => (L(a, o, "access private method"), t);
import { n as R } from "./theme-Bgfzqi6k.js";
var A, w, E, g, f, b, N, v, $;
const n = class n extends EventTarget {
  /** @param {{ sourceUrl?: string, pathPrefix?: string }} config */
  constructor({
    sourceUrl: t,
    pathPrefix: e = ""
  }) {
    super();
    h(this, v);
    if (s(n, A))
      return s(n, A);
    c(n, w, t), c(n, E, e.replace(/\/+$/, "")), c(n, A, this);
  }
  async load() {
    if (!(s(n, g) === "pending" || s(n, g) === "resolved")) {
      c(n, g, "pending");
      try {
        if (!s(n, w)) {
          c(n, f, /* @__PURE__ */ new Map()), c(n, b, /* @__PURE__ */ new Map()), c(n, N, []), c(n, g, "resolved"), this.dispatchEvent(new CustomEvent("change"));
          return;
        }
        const t = await fetch(s(n, w));
        if (t.status !== 200)
          throw new Error(`Failed to fetch page tree: ${t.status}`);
        const e = await t.json(), {
          nodes: i,
          pathIndex: r,
          rootIds: d
        } = m(this, v, $).call(this, e);
        c(n, f, i), c(n, b, r), c(n, N, d), c(n, g, "resolved"), this.dispatchEvent(new CustomEvent("change"));
      } catch (t) {
        c(n, g, "rejected"), console.error(t);
      }
    }
  }
  /** @returns {PageTreeStatus} */
  get status() {
    return s(n, g);
  }
  /** @returns {number} */
  get size() {
    var t;
    return ((t = s(n, f)) == null ? void 0 : t.size) ?? 0;
  }
  /**
   * @param {string} id
   * @returns {PageTreeNode | undefined}
   */
  getNode(t) {
    var e;
    return (e = s(n, f)) == null ? void 0 : e.get(t);
  }
  /** @returns {PageTreeNode[]} */
  get rootNodes() {
    var t;
    return ((t = s(n, N)) == null ? void 0 : t.map((e) => this.getNode(e))) ?? [];
  }
  /**
   * @param {string} id
   * @returns {PageTreeNode[]}
   */
  getChildren(t) {
    const e = this.getNode(t);
    return e ? e.children.map((i) => this.getNode(i)) : [];
  }
  /**
   * @param {string | undefined} id
   * @returns {string[]}
   */
  getAncestorIds(t) {
    var r, d;
    if (!t) return [];
    const e = [];
    let i = (r = this.getNode(t)) == null ? void 0 : r.parent;
    for (; i; )
      e.push(i), i = (d = this.getNode(i)) == null ? void 0 : d.parent;
    return e;
  }
  /**
   * @param {string | undefined} id
   * @returns {PageTreeNode[]}
   */
  getAncestors(t) {
    return this.getAncestorIds(t).map((e) => this.getNode(e));
  }
  /** @returns {string | undefined} */
  get activeNodeId() {
    var t;
    return (t = s(n, b)) == null ? void 0 : t.get(location.pathname);
  }
  /** @returns {PageTreeNode | undefined} */
  get activeNode() {
    return this.getNode(this.activeNodeId);
  }
  /**
   * @param {string} path
   * @returns {PageTreeNode | null}
   */
  getNodeByPath(t) {
    var i;
    const e = (i = s(n, b)) == null ? void 0 : i.get(t);
    return e ? this.getNode(e) : null;
  }
};
A = new WeakMap(), w = new WeakMap(), E = new WeakMap(), g = new WeakMap(), f = new WeakMap(), b = new WeakMap(), N = new WeakMap(), v = new WeakSet(), /**
 * @param {RawPageTreeNode[]} nodes
 * @returns {{ nodes: Map<string, PageTreeNode>, pathIndex: Map<string, string>, rootIds: string[] }}
 */
$ = function(t) {
  const e = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), r = [], d = [];
  for (const u of t)
    r.push(u.id), d.push([u, void 0]);
  for (; d.length > 0; ) {
    const [{
      id: u,
      title: P,
      path: Y,
      children: I = []
    }, F] = d.pop(), q = s(n, E) + Y, B = new Array(I.length);
    for (let x = 0; x < I.length; x++)
      B[x] = I[x].id, d.push([I[x], u]);
    e.set(u, {
      id: u,
      title: P,
      path: q,
      parent: F,
      children: B
    }), i.set(q, u);
  }
  return {
    nodes: e,
    pathIndex: i,
    rootIds: r
  };
}, /** @type {PageTreeService | null} */
h(n, A, null), /** @type {string | undefined} */
h(n, w), /** @type {string} */
h(n, E, ""), /** @type {PageTreeStatus} */
h(n, g, "idle"), /** @type {Map<string, PageTreeNode> | null} */
h(n, f, null), /** @type {Map<string, string> | null} */
h(n, b, null), /** @type {string[] | null} */
h(n, N, null);
let k = n;
const S = document.getElementById("pageTreeSource"), V = new k({
  sourceUrl: S instanceof HTMLLinkElement ? S.href : void 0,
  pathPrefix: R().pathname
}), G = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" data-component="icon" class="icon icon-pending">
	<style>
		circle {
			animation-iteration-count: infinite;
			animation-duration: 860ms;
			animation-name: bouncy;

			&:nth-of-type(1) {
				animation-delay: -200ms;
			}

			&:nth-of-type(2) {
				animation-delay: -100ms;
			}
		}

		@keyframes bouncy {
			0% {
				animation-timing-function: ease-in;
				transform: translateY(0);
			}

			50% {
				animation-timing-function: ease-out;
				transform: translateY(35%);
			}
		}
	</style>
	<circle cx="3.5" cy="5" r="1.5" />
	<circle cx="8" cy="5" r="1.5" />
	<circle cx="12.5" cy="5" r="1.5" />
</svg>
`;
var p, y, C, l, M, j, U, z, D;
class J extends HTMLElement {
  constructor() {
    super();
    h(this, l);
    h(this, p);
    h(this, y, new AbortController());
    /** @param {PointerEvent} event */
    h(this, C, (t) => {
      var d;
      const e = (
        /** @type {Element} */
        t.target.closest("button.tree-action")
      );
      if (!e || e.hasAttribute("data-queued"))
        return;
      if (e.matches('[aria-busy="true"]')) {
        e.setAttribute("data-queued", ""), e.innerHTML = /** @type {string} */
        G;
        return;
      }
      if (e.hasAttribute("aria-controls")) {
        m(this, l, j).call(this, e);
        return;
      }
      const i = (d = e.nextElementSibling) == null ? void 0 : d.getAttribute("href"), r = i ? s(this, p).getNodeByPath(i) : null;
      r && m(this, l, U).call(this, e, r);
    });
    c(this, p, V), s(this, p).load();
  }
  connectedCallback() {
    this.addEventListener("click", s(this, C), {
      signal: s(this, y).signal
    }), s(this, p).status === "pending" ? s(this, p).addEventListener("change", () => m(this, l, M).call(this), {
      once: !0,
      signal: s(this, y).signal
    }) : s(this, p).status === "resolved" && m(this, l, M).call(this);
  }
  disconnectedCallback() {
    s(this, y).abort(), c(this, y, new AbortController());
  }
}
p = new WeakMap(), y = new WeakMap(), C = new WeakMap(), l = new WeakSet(), M = function() {
  var t;
  for (const e of this.querySelectorAll('button[aria-busy="true"]')) {
    const i = (t = e.nextElementSibling) == null ? void 0 : t.getAttribute("href"), r = i ? s(this, p).getNodeByPath(i) : null;
    if (!r)
      continue;
    const d = e.hasAttribute("data-queued");
    e.removeAttribute("aria-busy"), e.removeAttribute("aria-disabled"), e.removeAttribute("data-queued"), e.replaceChildren(), d && m(this, l, U).call(this, e, r);
  }
}, /** @param {HTMLButtonElement} button */
j = function(t) {
  const e = t.getAttribute("aria-controls"), i = this.querySelector(`#${CSS.escape(e)}`);
  if (i !== null) {
    const r = i.toggleAttribute("hidden");
    t.setAttribute("aria-expanded", String(!r));
  }
}, /**
 * @param {HTMLButtonElement} button
 * @param {PageTreeNode} node
 */
U = function(t, e) {
  const i = m(this, l, z).call(this, e);
  t.closest(".tree-item").append(i), t.setAttribute("aria-controls", i.id), t.setAttribute("aria-expanded", "true");
}, /**
 * @param {PageTreeNode} node
 * @returns {HTMLUListElement}
 */
z = function(t) {
  const e = document.createElement("ul");
  e.id = crypto.randomUUID();
  for (const i of s(this, p).getChildren(t.id))
    e.append(m(this, l, D).call(this, i));
  return e;
}, /**
 * @param {PageTreeNode} node
 * @returns {HTMLLIElement}
 */
D = function(t) {
  const e = document.createElement("li");
  e.className = "tree-item";
  const i = document.createElement("div");
  i.className = "tree-item-header";
  const r = document.createElement("a");
  if (r.href = t.path, r.textContent = t.title, t.id === s(this, p).activeNodeId && r.setAttribute("aria-current", "page"), s(this, p).getChildren(t.id).length) {
    r.id = crypto.randomUUID();
    const u = document.createElement("button");
    u.className = "tree-action", u.type = "button", u.setAttribute("aria-expanded", "false"), u.setAttribute("aria-labelledby", r.id), i.append(u);
  }
  return i.append(r), e.append(i), e;
};
customElements.define("theme-page-tree", J);
