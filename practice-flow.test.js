// initPractice/practiceCheckAnswer/practiceUndoCorrect/practiceReveal
// akışlarını ve scheduleNext() (SM-2 spaced repetition algoritması)
// fonksiyonunun zamanlama mantığını doğrular.

const { runWithApp } = require("./support/load-app");
const { run } = require("./support/test-framework");

runWithApp(`
  stub.triggerDomReady();
  onboardingFinish();

  test("scheduleNext: boş rec + doğru cevap -> interval=1, repetitions=1", () => {
    const result = scheduleNext({}, true);
    assertEqual(result.interval, 1);
    assertEqual(result.repetitions, 1);
    assertOk(result.ease > 2.5, "ease artmalı (varsayılan 2.5'ten yüksek)");
  });

  test("scheduleNext: boş rec + yanlış cevap -> interval=0, repetitions=0", () => {
    const result = scheduleNext({}, false);
    assertEqual(result.interval, 0);
    assertEqual(result.repetitions, 0);
    assertOk(result.ease < 2.5, "ease azalmalı");
  });

  test("scheduleNext: ease alt sınırın (1.3) altına düşmez", () => {
    const result = scheduleNext({ ease: 1.3, interval: 5, repetitions: 2 }, false);
    assertEqual(result.ease, 1.3, "ease 1.3'ten aşağı inmemeli");
  });

  test("scheduleNext: art arda doğru cevaplar interval'i katlanarak artırır", () => {
    let rec = {};
    rec = scheduleNext(rec, true); // repetitions=1, interval=1
    rec = scheduleNext(rec, true); // repetitions=2, interval=6
    assertEqual(rec.repetitions, 2);
    assertEqual(rec.interval, 6);
    const thirdInterval = scheduleNext(rec, true).interval;
    assertOk(thirdInterval > 6, "3. doğru cevapta interval 6'dan büyük olmalı (ease ile çarpım)");
  });

  test("initPractice: tekrar bekleyen cümle yoksa queue boş", () => {
    progress.learned = {};
    initPractice();
    assertEqual(practiceState.total, 0);
    assertEqual(practiceState.queue.length, 0);
  });

  test("initPractice: geçmiş tarihli nextReview'lı cümleler queue'ya girer", () => {
    progress.learned = {
      "1": { firstLearned: "2020-01-01", ease: 2.5, interval: 1, repetitions: 1, nextReview: "2020-01-02" },
      "2": { firstLearned: "2020-01-01", ease: 2.5, interval: 1, repetitions: 1, nextReview: "2099-01-01" }, // gelecekte, kuyruğa girmemeli
    };
    initPractice();
    assertEqual(practiceState.total, 1, "sadece geçmiş tarihli 1 cümle kuyrukta olmalı");
    assertEqual(practiceState.queue[0], 1);
  });

  test("practiceCheckAnswer: doğru cevapta ease artar, nextReview ileri tarihe kayar", () => {
    progress.learned = { "1": { firstLearned: "2020-01-01", ease: 2.5, interval: 1, repetitions: 1, nextReview: "2020-01-02" } };
    initPractice();
    const sentence = findSentence(1);
    practiceState.answer = sentence.en;
    practiceCheckAnswer();
    assertEqual(practiceState.feedback, "correct");
    assertOk(progress.learned["1"].nextReview > "2020-01-02", "tekrar tarihi ileri kaymalı");
  });

  test("practiceCheckAnswer: yanlış cevapta mistakes'e eklenir", () => {
    progress.learned = { "5": { firstLearned: "2020-01-01", ease: 2.5, interval: 1, repetitions: 1, nextReview: "2020-01-02" } };
    progress.mistakes = {};
    initPractice();
    practiceState.answer = "yanlış cevap";
    practiceCheckAnswer();
    assertEqual(practiceState.feedback, "wrong");
    assertOk(progress.mistakes["5"], "yanlış cevap mistakes'e eklenmeli");
  });

  test("practiceUndoCorrect: doğru işaretlenen cevap geri alınabilir", () => {
    progress.learned = { "10": { firstLearned: "2020-01-01", ease: 2.5, interval: 1, repetitions: 1, nextReview: "2020-01-02" } };
    progress.mistakes = {};
    initPractice();
    const sentence = findSentence(10);
    practiceState.answer = sentence.en;
    practiceCheckAnswer();
    assertEqual(practiceState.feedback, "correct");
    assertOk(practiceState.canUndo, "canUndo true olmalı");

    practiceUndoCorrect();
    assertEqual(practiceState.feedback, "undone");
    assertOk(progress.mistakes["10"], "geri alınan cevap mistakes'e eklenmeli");
    assertEqual(progress.learned["10"].correctStreak, 0, "correctStreak sıfırlanmalı");
  });

  test("practiceReveal: rec timesWrong'u artırır ve mistakes'e ekler", () => {
    progress.learned = { "20": { firstLearned: "2020-01-01", ease: 2.5, interval: 1, repetitions: 1, nextReview: "2020-01-02", timesWrong: 0 } };
    progress.mistakes = {};
    initPractice();
    practiceReveal();
    assertEqual(progress.learned["20"].timesWrong, 1);
    assertOk(progress.mistakes["20"]);
  });

  test("practiceNextItem: queue'dan bir öğe çıkarır ve state'i sıfırlar", () => {
    progress.learned = {
      "30": { firstLearned: "2020-01-01", ease: 2.5, interval: 1, repetitions: 1, nextReview: "2020-01-02" },
      "31": { firstLearned: "2020-01-01", ease: 2.5, interval: 1, repetitions: 1, nextReview: "2020-01-02" },
    };
    initPractice();
    const queueLengthBefore = practiceState.queue.length;
    practiceState.answer = "herhangi bir şey";
    practiceState.feedback = "wrong"; // manuel simülasyon
    practiceNextItem();
    assertEqual(practiceState.queue.length, queueLengthBefore - 1);
    assertEqual(practiceState.answer, "");
    assertEqual(practiceState.feedback, null);
  });
`, { htmlPath: process.env.APP_HTML_PATH });

run();
