// İlk kullanım tanıtımının (onboarding) doğru koşullarda gösterilip
// gösterilmediğini doğrular: yeni kullanıcıya gösterilir, eski
// kullanıcıya (localStorage'da veri varsa) gösterilmez, yarıda bırakılırsa
// bir sonraki açılışta tekrar gösterilir.

const { runWithApp } = require("./support/load-app");
const { run } = require("./support/test-framework");

runWithApp(`
  test("Yeni kullanıcı (localStorage boş): shouldShowOnboarding true", () => {
    stub.triggerDomReady();
    assertTrue(shouldShowOnboarding());
  });

  test("Onboarding overlay DOMContentLoaded sonrası görünür duruma gelir", () => {
    assertFalse(document.getElementById("onboarding-overlay").classList.contains("hidden"),
      "overlay gizli olmamalı (görünür olmalı)");
  });

  test("onboardingNext: adımlar sırayla ilerler", () => {
    onboardingStepIdx = 0;
    onboardingNext();
    assertEqual(onboardingStepIdx, 1);
    onboardingNext();
    assertEqual(onboardingStepIdx, 2);
  });

  test("onboardingNext: son adımdan sonra finish tetiklenir", () => {
    onboardingStepIdx = ONBOARDING_STEPS.length - 1;
    onboardingNext();
    assertTrue(progress.onboardingSeen);
    assertTrue(document.getElementById("onboarding-overlay").classList.contains("hidden"));
  });

  test("onboardingFinish (Geç butonu): doğrudan tamamlanmış sayılır", () => {
    progress.onboardingSeen = false;
    onboardingStepIdx = 0;
    onboardingFinish();
    assertTrue(progress.onboardingSeen);
  });

  test("Eski kullanıcı verisi (onboardingSeen alanı YOK): onboarding gösterilmez", () => {
    const oldData = { learned: { "1": { firstLearned: "2020-01-01" } }, mistakes: {}, dailyLog: {}, settings: { dailyNewCount: 8 } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oldData));
    loadProgress();
    assertTrue(progress.onboardingSeen, "onboardingSeen alanı olmayan eski veri true varsaymalı");
    assertFalse(shouldShowOnboarding());
  });

  test("Yarıda bırakılmış onboarding (onboardingSeen: false kaydedilmiş): tekrar gösterilir", () => {
    const midData = { learned: {}, mistakes: {}, dailyLog: {}, settings: { dailyNewCount: 8 }, onboardingSeen: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(midData));
    loadProgress();
    assertFalse(progress.onboardingSeen, "açıkça false kaydedilmişse buna dokunulmamalı");
    assertTrue(shouldShowOnboarding());
  });

  test("ONBOARDING_STEPS: her adımda emoji, title, text alanları dolu", () => {
    ONBOARDING_STEPS.forEach((step, i) => {
      assertOk(step.emoji, "adım " + i + " emoji eksik");
      assertOk(step.title, "adım " + i + " title eksik");
      assertOk(step.text, "adım " + i + " text eksik");
    });
  });
`, { htmlPath: process.env.APP_HTML_PATH });

run();
