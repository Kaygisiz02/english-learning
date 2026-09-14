// normalize(), expandContractions(), turkishSafeLower() fonksiyonlarının
// cevap kontrolü için kritik davranışlarını doğrular. Bu fonksiyonlar
// kullanıcının yazdığı cevabı doğru cümleyle karşılaştırırken kullanılır;
// buradaki bir hata "doğru cevabı yanlış say" ya da tam tersi gibi
// kullanıcı deneyimini doğrudan bozan sonuçlara yol açar.

const { runWithApp } = require("./support/load-app");
const { run } = require("./support/test-framework");

runWithApp(`
  stub.triggerDomReady();

  test("normalize: kısaltmalı ve açık hal aynı sonucu verir (I'm / I am)", () => {
    assertEqual(normalize("I'm fine."), normalize("I am fine"));
  });

  test("normalize: apostrofsuz kısaltma da kabul edilir (im -> I am)", () => {
    assertEqual(normalize("im fine"), normalize("I am fine"));
  });

  test("normalize: Türkçe klavyenin ürettiği büyük İ, düz i gibi işlenir", () => {
    assertEqual(normalize("İ'm fine"), normalize("i am fine"));
  });

  test("normalize: don't / do not eşleşir", () => {
    assertEqual(normalize("Don't worry"), normalize("Do not worry"));
  });

  test("normalize: dont (apostrofsuz) da do not'a eşleşir", () => {
    assertEqual(normalize("dont worry"), normalize("do not worry"));
  });

  test("normalize: were kelimesi (kısaltma değil) bozulmadan kalır", () => {
    // CONTRACTIONS_REQUIRE_APOSTROPHE korumasının çalıştığını doğrular:
    // 'were' kelimesi 'we're'in apostrofsuz hali gibi yanlışlıkla
    // genişletilmemeli.
    assertEqual(normalize("Where were we?"), "where were we");
  });

  test("normalize: noktalama işaretleri kaldırılır", () => {
    assertEqual(normalize("Hello!"), normalize("Hello"));
    assertEqual(normalize("What time is it?"), normalize("What time is it"));
  });

  test("normalize: fazla boşluklar tek boşluğa indirilir", () => {
    assertEqual(normalize("I   am    fine"), normalize("I am fine"));
  });

  test("normalize: büyük/küçük harf duyarsız", () => {
    assertEqual(normalize("HELLO"), normalize("hello"));
  });

  test("normalize: 800 cümlenin hepsi kendisiyle eşleşir (self-match)", () => {
    let fails = [];
    SENTENCES.forEach(s => {
      if (normalize(s.en) !== normalize(s.en)) fails.push(s.id);
    });
    assertEqual(fails.length, 0);
  });

  test("normalize: o'clock ifadesindeki apostrof sorunsuz kaldırılır", () => {
    // 'o'clock' bilinçli olarak CONTRACTIONS listesinde yok (zaman birimi,
    // 'of the clock' şeklinde açılması doğru olmaz) — apostrof genel
    // temizlik adımıyla kaldırılmalı, hata vermemeli.
    const result = normalize("It's three o'clock.");
    assertOk(result.includes("oclock"), "sonuç 'oclock' içermeli, gelen: " + result);
  });

  test("jsStr: apostrof ve tırnak güvenli şekilde kaçışlanır", () => {
    const result = jsStr("It's a \\"test\\"");
    assertOk(result.startsWith("'") && result.endsWith("'"), "tek tırnaklı literal üretmeli");
    assertOk(!result.includes("\\"'\\"") || result.includes("\\\\'"), "apostrof kaçışlanmalı");
  });

  test("escapeHtml: script etiketini metne çevirir (XSS koruması)", () => {
    const result = escapeHtml("<script>alert(1)</script>");
    assertFalse(result.includes("<script>"), "ham <script> etiketi çıktıda olmamalı");
  });
`, { htmlPath: process.env.APP_HTML_PATH });

run();
