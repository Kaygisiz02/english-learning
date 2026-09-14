// SENTENCES ve STAGES verisinin bütünlüğünü doğrular: id'lerin eksiksiz ve
// tekrarsız olması, STAGES'in 800'ü boşluksuz/çakışmasız kaplaması, her
// cümlenin gerekli alanlara sahip olması, ve kelime-kelime çeviri
// kapsamının tam olması (hiçbir kelimenin "(çeviri yok)" düşmemesi).

const { runWithApp } = require("./support/load-app");
const { run } = require("./support/test-framework");

runWithApp(`
  stub.triggerDomReady();

  test("SENTENCES tam olarak 800 cümle içerir", () => {
    assertEqual(SENTENCES.length, 800);
  });

  test("Tüm cümle id'leri 1-800 arasında eksiksiz ve tekrarsız", () => {
    const ids = SENTENCES.map(s => s.id);
    const idSet = new Set(ids);
    assertEqual(idSet.size, 800, "benzersiz id sayısı 800 olmalı (tekrar yok)");
    let missing = [];
    for (let i = 1; i <= 800; i++) if (!idSet.has(i)) missing.push(i);
    assertEqual(missing.length, 0, "eksik id: " + missing.join(","));
  });

  test("STAGES toplamda tam 800 cümleyi, boşluksuz ve çakışmasız kaplar", () => {
    let covered = 0;
    let prevTo = 0;
    let problems = [];
    STAGES.forEach((s, i) => {
      covered += (s.to - s.from + 1);
      if (s.from !== prevTo + 1) problems.push("Stage " + i + ": from=" + s.from + " beklenen=" + (prevTo + 1));
      prevTo = s.to;
    });
    assertEqual(covered, 800, "STAGES toplam kapsama 800 olmalı");
    assertEqual(problems.length, 0, "boşluk/çakışma: " + problems.join("; "));
    assertEqual(STAGES[STAGES.length - 1].to, 800, "son stage 800'de bitmeli");
  });

  test("Her cümlede en, tr, pron, words, usage alanları dolu", () => {
    const malformed = SENTENCES.filter(s => !s.en || !s.tr || !s.pron || !Array.isArray(s.words) || !s.usage);
    assertEqual(malformed.length, 0, "eksik alanlı cümle id'leri: " + malformed.slice(0, 10).map(s => s.id).join(","));
  });

  test("getFullWordBreakdown 800 cümlenin tamamında çeviri boşluğu bırakmıyor", () => {
    let noMeaningCount = 0;
    let samples = [];
    SENTENCES.forEach(s => {
      getFullWordBreakdown(s).forEach(([text, meaning]) => {
        if (meaning === null) {
          noMeaningCount++;
          if (samples.length < 5) samples.push(s.id + ":" + text);
        }
      });
    });
    assertEqual(noMeaningCount, 0, "çevirisiz kelime bulundu: " + samples.join(", "));
  });

  test("buildWordTiles 800 cümlenin hepsinde tutarlı tile üretir", () => {
    let fails = [];
    SENTENCES.forEach(s => {
      try {
        const built = buildWordTiles(s.en);
        if (built.tiles.length !== built.correctOrder.length) fails.push(s.id + ":length-mismatch");
      } catch (e) {
        fails.push(s.id + ":" + e.message);
      }
    });
    assertEqual(fails.length, 0, "sorunlu cümleler: " + fails.slice(0, 10).join("; "));
  });

  test("stageOf() her id için geçerli bir stage indeksi döndürür", () => {
    let fails = [];
    for (let id = 1; id <= 800; id++) {
      const idx = stageOf(id);
      if (idx < 0 || idx >= STAGES.length) fails.push(id);
    }
    assertEqual(fails.length, 0, "stageOf başarısız olan id'ler: " + fails.slice(0, 10).join(","));
  });

  test("findSentence() her id için doğru cümleyi döndürür", () => {
    assertEqual(findSentence(1).id, 1);
    assertEqual(findSentence(800).id, 800);
    assertEqual(findSentence(400).id, 400);
  });
`, { htmlPath: process.env.APP_HTML_PATH });

run();
