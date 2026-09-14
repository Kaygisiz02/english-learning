// Sıfır bağımlılıklı, tek dosyalık minik test çerçevesi.
//
// Bu proje hiçbir build aracı/npm paketi kullanmadığı (tek bir index.html
// dosyası) için test altyapısı da aynı prensibe uyuyor: Jest/Vitest gibi
// bir paket kurmak yerine, Node.js'in kendi standart kütüphanesiyle
// (require, assert modülü) çalışan minimal bir koşucu.
//
// Kullanım:
//   const { test, run, assertEqual, assertTrue, assertFalse } = require('./support/test-framework');
//   test('bir şey doğru çalışmalı', () => {
//     assertEqual(1 + 1, 2, 'toplama doğru olmalı');
//   });
//   run(); // dosyanın sonunda çağrılır, sonuçları yazdırır ve başarısızlık varsa exit code 1 döner

const registeredTests = [];
let currentSuiteName = "(genel)";

// Aynı dosya içinde birden fazla mantıksal grup olduğunda çıktıyı
// okunaklı tutmak için. describe zorunlu değildir, sadece gruplama içindir.
function describe(suiteName, fn) {
  const prev = currentSuiteName;
  currentSuiteName = suiteName;
  fn();
  currentSuiteName = prev;
}

function test(name, fn) {
  registeredTests.push({ suite: currentSuiteName, name, fn });
}

class AssertionError extends Error {}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new AssertionError(
      (message ? message + " — " : "") +
      `beklenen ${JSON.stringify(expected)}, gelen ${JSON.stringify(actual)}`
    );
  }
}

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new AssertionError(
      (message ? message + " — " : "") + `beklenen ${b}, gelen ${a}`
    );
  }
}

function assertTrue(value, message) {
  if (value !== true) {
    throw new AssertionError((message ? message + " — " : "") + `true bekleniyordu, gelen ${JSON.stringify(value)}`);
  }
}

function assertFalse(value, message) {
  if (value !== false) {
    throw new AssertionError((message ? message + " — " : "") + `false bekleniyordu, gelen ${JSON.stringify(value)}`);
  }
}

function assertOk(value, message) {
  if (!value) {
    throw new AssertionError((message ? message + " — " : "") + `truthy bir değer bekleniyordu, gelen ${JSON.stringify(value)}`);
  }
}

function assertThrows(fn, message) {
  let threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) {
    throw new AssertionError((message ? message + " — " : "") + "fonksiyonun hata fırlatması bekleniyordu ama fırlatmadı");
  }
}

function run() {
  let passed = 0;
  let failed = 0;
  const failures = [];
  let lastSuite = null;

  for (const t of registeredTests) {
    if (t.suite !== lastSuite) {
      console.log(`\n${t.suite}`);
      lastSuite = t.suite;
    }
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      failures.push({ suite: t.suite, name: t.name, error: e });
      console.log(`  ✗ ${t.name}`);
      console.log(`    ${e.message}`);
    }
  }

  console.log(`\n${"-".repeat(50)}`);
  console.log(`Toplam: ${registeredTests.length}  Başarılı: ${passed}  Başarısız: ${failed}`);

  if (failed > 0) {
    console.log(`\nBaşarısız testler:`);
    failures.forEach(f => console.log(`  - [${f.suite}] ${f.name}: ${f.error.message}`));
    process.exitCode = 1;
  }

  // Bir sonraki dosyanın kendi run() çağrısı temiz bir sayaçla başlasın.
  registeredTests.length = 0;

  return { passed, failed };
}

module.exports = {
  describe, test, run,
  assertEqual, assertDeepEqual, assertTrue, assertFalse, assertOk, assertThrows,
};
