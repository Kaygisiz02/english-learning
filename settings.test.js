// Yeni Ayarlar sayfasının (renderSettings) tüm alt bölümleri (günlük
// hedef, bildirimler, yedekleme, hata günlüğü) doğru şekilde tek bir
// yerde topladığını, ve bu bölümlerin artık eski konumlarında (ana
// sayfa, topbar, İlerleme Karnesi) GÖSTERİLMEDİĞİNİ doğrular.

const { runWithApp } = require("./support/load-app");
const { run } = require("./support/test-framework");

runWithApp(`
  stub.triggerDomReady();
  onboardingFinish();

  test("setView('settings'): view-settings görünür, diğerleri gizli olur", () => {
    setView("settings");
    assertFalse(document.getElementById("view-settings").classList.contains("hidden"));
    assertTrue(document.getElementById("view-home").classList.contains("hidden"));
  });

  test("renderSettings: 'Ayarlar' başlığını içerir", () => {
    renderSettings();
    const html = document.getElementById("view-settings").innerHTML;
    assertOk(html.includes("Ayarlar"));
  });

  test("renderSettings: günlük hedef seçicisini içerir", () => {
    renderSettings();
    const html = document.getElementById("view-settings").innerHTML;
    assertOk(html.includes("daily-count-row"));
    assertOk(html.includes("Günlük yeni cümle sayısı"));
  });

  test("renderSettings: bildirim satırını içerir", () => {
    renderSettings();
    const html = document.getElementById("view-settings").innerHTML;
    assertOk(html.includes("notif-row") || html.includes("Bildirimleri Aç") || html.includes("hatırlatmalar açık"));
  });

  test("renderSettings: yedekleme butonlarını içerir", () => {
    renderSettings();
    const html = document.getElementById("view-settings").innerHTML;
    assertOk(html.includes("İlerlemeyi Yedekle"));
    assertOk(html.includes("Yedekten Geri Yükle"));
  });

  test("renderSettings: hata günlüğü bölümünü içerir", () => {
    renderSettings();
    const html = document.getElementById("view-settings").innerHTML;
    assertOk(html.includes("Hata Günlüğü"));
  });

  test("setDailyNewCount(15): Ayarlar sayfasında yüksek sayı uyarısı gösterilir", () => {
    setView("settings");
    setDailyNewCount(15);
    const html = document.getElementById("view-settings").innerHTML;
    assertOk(html.includes("daily-count-warning"));
  });

  test("setDailyNewCount(8): uyarı gösterilmez", () => {
    setDailyNewCount(8);
    const html = document.getElementById("view-settings").innerHTML;
    assertFalse(html.includes("daily-count-warning"));
  });

  test("setDailyNewCount: artık renderHome değil renderSettings'i günceller (ana sayfa HTML'i değişmez)", () => {
    setView("home");
    const homeHtmlBefore = document.getElementById("view-home").innerHTML;
    setDailyNewCount(20);
    const homeHtmlAfter = document.getElementById("view-home").innerHTML;
    assertEqual(homeHtmlBefore, homeHtmlAfter, "setDailyNewCount ana sayfa HTML'ini değiştirmemeli");
  });

  test("renderHome: artık günlük sayı seçicisi İÇERMİYOR (Ayarlar'a taşındı)", () => {
    renderHome();
    const html = document.getElementById("view-home").innerHTML;
    assertFalse(html.includes("daily-count-select"), "günlük sayı seçicisi ana sayfada olmamalı");
  });

  test("renderHome: artık bildirim satırı İÇERMİYOR (Ayarlar'a taşındı)", () => {
    renderHome();
    const html = document.getElementById("view-home").innerHTML;
    assertFalse(html.includes("notif-row"), "bildirim satırı ana sayfada olmamalı");
  });

  test("renderStats: artık hata günlüğü bölümü İÇERMİYOR (Ayarlar'a taşındı)", () => {
    renderStats();
    const html = document.getElementById("view-stats").innerHTML;
    assertFalse(html.includes("Hata Günlüğü"), "hata günlüğü İlerleme Karnesi'nde olmamalı");
  });

  test("Topbar: Yedekle/Geri Yükle butonları artık yok, tek bir Ayarlar butonu var", () => {
    assertEqual(document.getElementById("view-settings") !== null, true);
    // Not: Bu DOM stub'ında topbar HTML'i statik olarak index.html'in
    // <body> kısmında yer alır, render fonksiyonlarıyla üretilmez —
    // bu yüzden burada dolaylı olarak setView('settings')'in çalıştığını
    // (fonksiyonun var olduğunu) doğrulamak yeterlidir; ham HTML metnini
    // kontrol etmek için stub.html üzerinden bakılabilir.
    assertOk(stub.html.includes("⚙️ Ayarlar"), "topbar'da Ayarlar butonu olmalı");
    assertFalse(stub.html.includes(">Yedekle<"), "eski Yedekle butonu topbar'da kalmamalı");
    assertFalse(stub.html.includes(">Geri Yükle<"), "eski Geri Yükle butonu topbar'da kalmamalı");
  });
`, { htmlPath: process.env.APP_HTML_PATH });

run();
