#!/usr/bin/env node
// Tüm *.test.js dosyalarını tests/ klasöründe bulup sırayla çalıştırır ve
// genel bir özet raporlar. Her dosya kendi test-framework.run() çağrısını
// yaptığı için kendi başarı/başarısızlık sayılarını zaten yazdırır; bu
// script üstüne bir de TOPLAM özet ekler ve herhangi bir dosya başarısız
// olursa (ya da çalıştırılamazsa) process'i hata koduyla (1) bitirir —
// böylece CI ortamlarında "testler geçti mi geçmedi mi" tek bir komutla
// (örn. `node tests/run-all.js`) anlaşılabilir.
//
// KULLANIM:
//   node tests/run-all.js
//   APP_HTML_PATH=/baska/yol/index.html node tests/run-all.js   (farklı bir HTML dosyasına karşı test etmek için)

const fs = require("fs");
const path = require("path");

const testsDir = __dirname;
const testFiles = fs.readdirSync(testsDir)
  .filter(f => f.endsWith(".test.js"))
  .sort();

if (testFiles.length === 0) {
  console.error("tests/ klasöründe *.test.js dosyası bulunamadı.");
  process.exit(1);
}

console.log(`${testFiles.length} test dosyası bulundu: ${testFiles.join(", ")}`);
console.log("=".repeat(60));

let anyFailed = false;

for (const file of testFiles) {
  console.log(`\n### ${file} ###`);
  // Her dosyayı ayrı bir child process'te çalıştırıyoruz (require ile değil).
  // Neden: her test dosyası kendi runWithApp() çağrısıyla appCode'u sıfırdan
  // eval ediyor ve kendi test-framework.run()'ını çağırıyor; test-framework
  // modülü aynı process içinde paylaşılırsa registeredTests dizisi dosyalar
  // arasında sızabilir (bir dosyanın run() çağrısı, henüz require edilmemiş
  // bir sonraki dosyanın testlerini de "temizlemiş" gibi davranabilir).
  // Ayrı process kullanmak bu sızıntıyı kesin olarak önler ve her dosyanın
  // exit code'unu (process.exitCode) bağımsız şekilde okumamızı sağlar.
  const { spawnSync } = require("child_process");
  const result = spawnSync(process.execPath, [path.join(testsDir, file)], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    anyFailed = true;
  }
}

console.log("\n" + "=".repeat(60));
console.log(anyFailed ? "SONUÇ: Bazı test dosyalarında başarısızlık var." : "SONUÇ: Tüm test dosyaları başarıyla geçti.");

process.exit(anyFailed ? 1 : 0);
