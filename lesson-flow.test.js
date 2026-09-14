// Ders akışının (initLesson -> teach -> recognize -> build -> recall ->
// done) tüm faz geçişlerini, doğru/yanlış/reveal cevap senaryolarını ve
// öğrenilen cümlelerin progress.learned'a doğru şekilde işlenmesini
// doğrular.

const { runWithApp } = require("./support/load-app");
const { run } = require("./support/test-framework");

runWithApp(`
  stub.triggerDomReady();
  onboardingFinish();

  test("initLesson: yeni kullanıcı için lessonState kurulur, mode=new", () => {
    initLesson();
    assertOk(lessonState, "lessonState dolu olmalı");
    assertEqual(lessonState.mode, "new");
    assertEqual(lessonState.phase, "teach");
    assertEqual(lessonState.idx, 0);
    assertOk(lessonState.ids.length > 0, "en az bir cümle içermeli");
  });

  test("initLesson: ilk ders 1. cümleden başlar", () => {
    initLesson();
    assertEqual(lessonState.ids[0], 1);
  });

  test("Tam ders akışı: teach -> recognize -> build -> recall (doğru cevap)", () => {
    initLesson();
    assertEqual(lessonState.phase, "teach");

    lessonGoToRecognize();
    assertEqual(lessonState.phase, "recognize");
    assertOk(Array.isArray(lessonState.recognizeOptions), "seçenekler üretilmeli");
    assertEqual(lessonState.recognizeOptions.length, 4, "4 seçenek olmalı");

    const correctIdx = lessonState.recognizeOptions.findIndex(o => o.isCorrect);
    assertOk(correctIdx >= 0, "seçeneklerden biri doğru olmalı");
    lessonCheckRecognize(correctIdx);
    assertEqual(lessonState.recognizeSelected, correctIdx);

    lessonGoToBuild();
    assertEqual(lessonState.phase, "build");
    assertOk(Array.isArray(lessonState.buildTiles), "kelime kutucukları üretilmeli");

    lessonState.buildAnswer = lessonState.buildCorrectOrder.slice();
    lessonCheckBuild();
    assertEqual(lessonState.buildFeedback, "correct");

    lessonGoToRecall();
    assertEqual(lessonState.phase, "recall");
    assertEqual(lessonState.answer, "");

    const sentence = findSentence(lessonState.ids[lessonState.idx]);
    lessonState.answer = sentence.en;
    lessonCheckAnswer();
    assertEqual(lessonState.feedback, "correct");
    assertOk(progress.learned[sentence.id], "cümle progress.learned'a eklenmeli");
    assertEqual(progress.learned[sentence.id].timesWrong, 0, "doğru cevapta timesWrong 0 olmalı");
  });

  test("recall fazında yanlış cevap: mistakes listesine eklenir", () => {
    initLesson();
    lessonGoToRecognize();
    const correctIdx = lessonState.recognizeOptions.findIndex(o => o.isCorrect);
    lessonCheckRecognize(correctIdx);
    lessonGoToBuild();
    lessonState.buildAnswer = lessonState.buildCorrectOrder.slice();
    lessonCheckBuild();
    lessonGoToRecall();

    const sentence = findSentence(lessonState.ids[lessonState.idx]);
    lessonState.answer = "kesinlikle yanlış bir cevap xyz";
    lessonCheckAnswer();
    assertEqual(lessonState.feedback, "wrong");
    assertOk(progress.mistakes[sentence.id], "yanlış cevap mistakes listesine düşmeli");
    assertOk(progress.learned[sentence.id], "yanlış da olsa cümle learned'a eklenir (tekrar programına girer)");
  });

  test("recall fazında cevap gösterme (reveal): learned'a wrong olarak eklenir", () => {
    initLesson();
    lessonGoToRecognize();
    const correctIdx = lessonState.recognizeOptions.findIndex(o => o.isCorrect);
    lessonCheckRecognize(correctIdx);
    lessonGoToBuild();
    lessonState.buildAnswer = lessonState.buildCorrectOrder.slice();
    lessonCheckBuild();
    lessonGoToRecall();

    const sentence = findSentence(lessonState.ids[lessonState.idx]);
    lessonReveal();
    assertEqual(lessonState.feedback, "revealed");
    assertOk(progress.learned[sentence.id]);
    assertEqual(progress.learned[sentence.id].timesWrong, 1);
  });

  test("build fazında yanlış sıra: buildFeedback='wrong' olur ama devam edilebilir", () => {
    initLesson();
    lessonGoToRecognize();
    const correctIdx = lessonState.recognizeOptions.findIndex(o => o.isCorrect);
    lessonCheckRecognize(correctIdx);
    lessonGoToBuild();

    if (lessonState.buildCorrectOrder.length > 1) {
      // Sırayı bilerek bozuyoruz (tersten diziyoruz)
      lessonState.buildAnswer = lessonState.buildCorrectOrder.slice().reverse();
      lessonCheckBuild();
      assertEqual(lessonState.buildFeedback, "wrong");
    }
  });

  test("lessonNextCard: son karttan sonra phase='done' olur", () => {
    initLesson();
    const totalCards = lessonState.ids.length;
    // Her kartı hızlıca doğru cevaplayarak geçelim
    for (let i = 0; i < totalCards; i++) {
      lessonGoToRecognize();
      const idx = lessonState.recognizeOptions.findIndex(o => o.isCorrect);
      lessonCheckRecognize(idx);
      lessonGoToBuild();
      lessonState.buildAnswer = lessonState.buildCorrectOrder.slice();
      lessonCheckBuild();
      lessonGoToRecall();
      const sentence = findSentence(lessonState.ids[lessonState.idx]);
      lessonState.answer = sentence.en;
      lessonCheckAnswer();
      lessonNextCard();
    }
    // Not: bir bölüm tam bitmişse startSectionMistakesReview araya girip
    // phase'i "teach"e döndürebilir (mistakes varsa) — bu yüzden burada
    // sadece hata fırlatmadığını doğruluyoruz, kesin phase kontrolü
    // section-mistakes senaryosunu bilerek dışarıda tutuyor.
    assertOk(lessonState.phase === "done" || lessonState.mode === "section-mistakes",
      "ders bitmeli ya da bölüm-tekrar moduna geçmeli, gelen: " + lessonState.phase + "/" + lessonState.mode);
  });

  test("startStageReview: review modunda progress.learned değişmez", () => {
    const learnedCountBefore = Object.keys(progress.learned).length;
    startStageReview(0);
    assertEqual(lessonState.mode, "review");
    assertEqual(lessonState.ids[0], STAGES[0].from);

    lessonGoToRecognize();
    const idx = lessonState.recognizeOptions.findIndex(o => o.isCorrect);
    lessonCheckRecognize(idx);
    lessonGoToBuild();
    lessonState.buildAnswer = lessonState.buildCorrectOrder.slice();
    lessonCheckBuild();
    lessonGoToRecall();
    const sentence = findSentence(lessonState.ids[lessonState.idx]);
    lessonState.answer = sentence.en;
    lessonCheckAnswer();

    const learnedCountAfter = Object.keys(progress.learned).length;
    assertEqual(learnedCountAfter, learnedCountBefore, "review modu progress.learned sayısını değiştirmemeli");
  });

  test("startMistakesReview: boş mistakes listesiyle çağrılırsa sessizce döner", () => {
    progress.mistakes = {};
    const before = JSON.stringify(lessonState);
    startMistakesReview();
    // lessonState değişmemeli (fonksiyon early-return yapmalı)
    assertEqual(JSON.stringify(lessonState), before);
  });
`, { htmlPath: process.env.APP_HTML_PATH });

run();
