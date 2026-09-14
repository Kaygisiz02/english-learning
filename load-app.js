// index.html içindeki <script>...</script> bloğunu okuyup çalıştıran
// yardımcı modül.
//
// NEDEN BÖYLE? Bu uygulama modül sistemi kullanmıyor (import/export yok,
// hepsi tek bir <script> içinde top-level fonksiyon/değişken bildirimi).
// Node.js'te bu kodu "gerçek" bir modül gibi require edip fonksiyonlarına
// tek tek erişmenin güvenilir yolu YOKTUR çünkü:
//   - Bir obje içine "dışa aktarma" (__exports.x = x) yapılsa bile, sonradan
//     x = {...} ile yeniden atanan değişkenler (lessonState, progress gibi)
//     bu kopyaya yansımaz — kopya, aktarıldığı andaki değerde donar kalır.
//   - Bu yüzden appCode'un TAMAMI ile test kodu, DERLEME ZAMANINDA
//     (metin birleştirme yoluyla) tek bir fonksiyon gövdesinde
//     birleştirilip öyle çalıştırılır. Bu, index.html'in kendi <script>
//     etiketi içine testin satır satır yapıştırılmasıyla birebir aynı
//     scope davranışını verir.
//
// KULLANIM (bkz. tests/*.test.js dosyaları):
//   const { runWithApp } = require('./support/load-app');
//   runWithApp(`
//     stub.triggerDomReady();
//     onboardingFinish();
//     test('renderHome çalışır', () => { renderHome(); });
//   `);
//
// Enjekte edilen kod bloğu içinde şu isimler hazır bulunur:
//   - appCode'un tüm top-level fonksiyon/değişkenleri (SENTENCES, STAGES,
//     lessonState, progress, renderHome, setView, normalize, vb.)
//   - stub: DOM stub kontrol objesi (triggerDomReady, elementsById, vb.)
//   - test, assertEqual, assertTrue, assertFalse, assertOk, assertDeepEqual,
//     assertThrows (tests/support/test-framework.js'ten)

const fs = require("fs");
const path = require("path");
const { createDomStub } = require("./dom-stub");
const testFramework = require("./test-framework");

const DEFAULT_HTML_PATH = path.join(__dirname, "..", "..", "index.html");

function readAppCode(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
  if (!scriptMatch) {
    throw new Error(`${htmlPath} içinde <script> bloğu bulunamadı`);
  }
  return { html, appCode: scriptMatch[1] };
}

/**
 * appCode'u verilen testSource string'iyle aynı scope'ta birleştirip
 * çalıştırır. testSource içinde appCode'un tüm top-level isimlerine
 * doğrudan erişilebilir; ayrıca `stub`, `test`, `assert*` isimleri de
 * hazır olarak enjekte edilir.
 *
 * @param {string} testSource - appCode'un ardına eklenecek ham JS kodu (string)
 * @param {object} [options]
 * @param {string} [options.htmlPath]
 * @returns {object} stub - kullanılan DOM stub (elementsById, triggerDomReady, vb.)
 */
function runWithApp(testSource, options) {
  options = options || {};
  const htmlPath = options.htmlPath || DEFAULT_HTML_PATH;
  const { html, appCode } = readAppCode(htmlPath);

  const stub = createDomStub(html).install();

  // testSource, appCode'un HEMEN ARDINDAN aynı fonksiyon gövdesi içine
  // eklenir. `stub` ve test-framework fonksiyonları parametre olarak
  // geçirilir (closure ile değil — new Function closure yakalamaz).
  const combined = appCode +
    "\n;(function(stub, test, assertEqual, assertDeepEqual, assertTrue, assertFalse, assertOk, assertThrows){\n" +
    testSource +
    "\n})(__stub__, __test__, __assertEqual__, __assertDeepEqual__, __assertTrue__, __assertFalse__, __assertOk__, __assertThrows__);\n";

  const runner = new Function(
    "__stub__", "__test__", "__assertEqual__", "__assertDeepEqual__", "__assertTrue__", "__assertFalse__", "__assertOk__", "__assertThrows__",
    combined
  );
  runner(
    stub, testFramework.test, testFramework.assertEqual, testFramework.assertDeepEqual,
    testFramework.assertTrue, testFramework.assertFalse, testFramework.assertOk, testFramework.assertThrows
  );

  return stub;
}

module.exports = { runWithApp, readAppCode, DEFAULT_HTML_PATH };
