// Minimal DOM stub: gerçek bir tarayıcı DEĞİLDİR. Bu uygulamanın (tek
// dosyalık index.html) kullandığı sınırlı DOM/BOM yüzeyini (getElementById,
// innerHTML get/set, classList, localStorage, Notification, vb.) taklit
// ederek uygulamanın script'ini Node.js içinde "çalıştırıp" mantıksal
// hataları (undefined fonksiyon çağrıları, kırılan state geçişleri, vb.)
// yakalamayı sağlar.
//
// Gerçek bir tarayıcı motoru DEĞİLDİR: CSS uygulanmaz, gerçek layout/paint
// olmaz, event capturing/bubbling yoktur. Amaç görsel doğrulama değil,
// JavaScript mantığının doğruluğunu (state makineleri, hesaplamalar,
// veri bütünlüğü) test etmektir. Görsel/etkileşim doğrulaması için ayrıca
// gerçek bir tarayıcıda manuel test önerilir.
//
// createDomStub() her çağrıldığında SIFIRDAN bir stub kurar — bu, test
// dosyaları arasında (hatta aynı dosya içindeki farklı test'ler arasında)
// state sızıntısını önlemek için önemlidir. Her test dosyası kendi
// createDomStub() çağrısını yapmalı, aynı stub'ı paylaşmamalıdır.

class ClassList {
  constructor(el) { this.el = el; }
  add(...cls) { cls.forEach(c => this.el._classes.add(c)); }
  remove(...cls) { cls.forEach(c => this.el._classes.delete(c)); }
  toggle(cls, force) {
    if (force === undefined) {
      if (this.el._classes.has(cls)) { this.el._classes.delete(cls); return false; }
      else { this.el._classes.add(cls); return true; }
    }
    if (force) this.el._classes.add(cls); else this.el._classes.delete(cls);
    return force;
  }
  contains(cls) { return this.el._classes.has(cls); }
}

class FakeElement {
  constructor(tag) {
    this.tagName = (tag || "div").toUpperCase();
    this._classes = new Set();
    this.classList = new ClassList(this);
    this._innerHTML = "";
    this._attrs = {};
    this.children = [];
    this.style = {};
    this._value = "";
    this._selectionStart = 0;
    this._selectionEnd = 0;
    this.disabled = false;
    this.href = "";
    this.download = "";
    this.accept = "";
    this.type = "";
    this.files = [];
    this.textContent = "";
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) { this._innerHTML = String(v); }
  get value() { return this._value; }
  set value(v) { this._value = v; }
  get textContent() { return this._textContent || ""; }
  set textContent(v) {
    this._textContent = String(v);
    // Gerçek tarayıcı davranışını taklit et: bir elementin textContent'i
    // set edildiğinde, o elementin innerHTML'i HTML-escape edilmiş halini
    // yansıtır (escapeHtml() fonksiyonunun dayandığı "div.textContent = x;
    // return div.innerHTML" kalıbı gerçek tarayıcıda bu şekilde çalışır —
    // stub'ın bunu doğru simüle etmesi, escapeHtml testlerinin anlamlı
    // olması için gereklidir).
    this._innerHTML = String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  appendChild(child) { this.children.push(child); return child; }
  removeChild(child) { this.children = this.children.filter(c => c !== child); }
  addEventListener() {}
  removeEventListener() {}
  click() {}
  focus() {}
  setSelectionRange(a, b) { this._selectionStart = a; this._selectionEnd = b; }
  setAttribute(k, v) { this._attrs[k] = String(v); }
  getAttribute(k) { return (k in this._attrs) ? this._attrs[k] : null; }
  removeAttribute(k) { delete this._attrs[k]; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
}

// index.html'deki tüm id="..." değerlerini otomatik çıkarır, böylece HTML'e
// yeni bir element eklendiğinde bu listeyi elle güncellemek gerekmez.
function extractIdsFromHtml(html) {
  const ids = new Set();
  const re = /\bid="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) ids.add(m[1]);
  // Ayrıca dinamik olarak render edilen (renderLesson/renderPractice/vb.
  // template string'leri içindeki) id'ler statik regex ile yakalanamaz;
  // bilinen dinamik id'leri de elle ekliyoruz.
  [
    "lesson-answer-input", "lesson-mic-btn", "lesson-mic-error", "lesson-check-btn",
    "practice-answer-input", "practice-mic-btn", "practice-mic-error", "practice-check-btn",
    "teach-main-speak-btn", "recall-feedback-speak-btn", "practice-feedback-speak-btn",
    "browse-search-input",
  ].forEach(id => ids.add(id));
  return [...ids];
}

function createDomStub(appHtml) {
  const elementsById = {};
  function ensureEl(id) {
    if (!elementsById[id]) elementsById[id] = new FakeElement("div");
    return elementsById[id];
  }
  extractIdsFromHtml(appHtml || "").forEach(ensureEl);

  const state = {
    domReadyCb: null,
    loadCb: null,
  };

  const documentStub = {
    getElementById: (id) => elementsById[id] || null,
    createElement: (tag) => new FakeElement(tag),
    body: new FakeElement("body"),
    activeElement: null,
  };

  class FakeNotification {
    constructor(title, options) {
      this.title = title;
      this.options = options || {};
      this.onclick = null;
    }
    close() {}
    static requestPermission() {
      return Promise.resolve(FakeNotification.permission);
    }
  }
  FakeNotification.permission = "default";

  function makeLocalStorage() {
    let store = {};
    return {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      _dump: () => ({ ...store }), // test kolaylığı için, gerçek API'de yok
    };
  }
  const localStorageStub = makeLocalStorage();

  const windowStub = {
    matchMedia: () => ({ matches: false }),
    innerWidth: 400,
    scrollTo: () => {},
    focus: () => {},
    addEventListener: (evt, cb) => {
      if (evt === "DOMContentLoaded") state.domReadyCb = cb;
      if (evt === "load") state.loadCb = cb;
    },
    speechSynthesis: { getVoices: () => [], speak: () => {}, cancel: () => {}, onvoiceschanged: null },
    SpeechRecognition: undefined,
    webkitSpeechRecognition: undefined,
    localStorage: localStorageStub,
    Notification: FakeNotification,
  };

  return {
    elementsById,
    state,
    FakeElement,
    FakeNotification,
    localStorageStub,
    // Bu stub'ı global scope'a "kur" — appCode eval edildiğinde document/window
    // gibi isimlere serbestçe erişebilsin diye. install() her çağrıldığında
    // önceki testin globals'ını bu yeni stub'la değiştirir.
    install() {
      global.document = documentStub;
      global.window = windowStub;
      global.localStorage = localStorageStub;
      global.navigator = { serviceWorker: undefined };
      global.alert = (msg) => { global.__lastAlert = msg; };
      global.confirm = () => true;
      global.URL = { createObjectURL: () => "blob:fake", revokeObjectURL: () => {} };
      global.Blob = class { constructor(parts, opts) { this.parts = parts; this.opts = opts; } };
      global.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      global.Notification = FakeNotification;
      global.__lastAlert = null;
      return this;
    },
    // DOMContentLoaded / load event callback'lerini elle tetiklemek için.
    triggerDomReady() {
      if (typeof state.domReadyCb === "function") state.domReadyCb();
      else throw new Error("DOMContentLoaded callback kayıtlı değil — window.addEventListener hiç çağrılmamış olabilir");
    },
    triggerLoad() {
      if (typeof state.loadCb === "function") state.loadCb();
    },
  };
}

module.exports = { createDomStub, FakeElement };
