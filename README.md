# Testler

Bu klasör, `../index.html` içindeki uygulama mantığını (ders akışı, spaced
repetition zamanlaması, onboarding, bildirimler, veri bütünlüğü, temel
erişilebilirlik durumları) doğrulayan bir test paketi içerir.

## Nasıl çalıştırılır

Hiçbir kurulum (npm install) gerekmez — sadece Node.js (v14+) yeterlidir.

```bash
cd tests
node run-all.js
```

Tek bir test dosyasını çalıştırmak için:

```bash
node tests/lesson-flow.test.js
```

Farklı bir `index.html` dosyasına karşı test etmek için (örn. henüz teslim
edilmemiş bir taslağı test ederken):

```bash
APP_HTML_PATH=/baska/yol/index.html node tests/run-all.js
```

Çıkış kodu: tüm testler geçerse `0`, herhangi bir başarısızlık varsa `1`
— CI/otomasyon script'lerinde `node tests/run-all.js && deploy.sh` gibi
zincirlemek için kullanılabilir.

## Neden npm paketi (Jest/Vitest) değil?

Uygulamanın kendisi (`index.html`) hiçbir build aracı veya bağımlılık
kullanmıyor — tek dosyalık, doğrudan tarayıcıda çalışan bir HTML/CSS/JS
dosyası. Test altyapısı da aynı prensibi koruyor: sıfır bağımlılık, sadece
Node.js'in standart kütüphanesi. Bu, ağ erişimi kısıtlı ortamlarda bile
(npm install çalışmasa da) testlerin çalışabilmesini sağlar.

## Mimari

```
tests/
  run-all.js              Tüm *.test.js dosyalarını sırayla çalıştırır
  support/
    test-framework.js     Sıfır bağımlılıklı mini test çerçevesi (test, assertEqual, vb.)
    dom-stub.js            Minimal DOM/BOM taklidi (document, window, localStorage, Notification)
    load-app.js             index.html'in <script> içeriğini okuyup çalıştıran yardımcı
  data-integrity.test.js  SENTENCES/STAGES veri bütünlüğü (800 cümle, id'ler, kapsama)
  text-processing.test.js normalize/escapeHtml/jsStr fonksiyonları
  lesson-flow.test.js     Ders akışı: teach→recognize→build→recall
  practice-flow.test.js   Spaced repetition (SM-2) ve tekrar pratiği
  onboarding.test.js      İlk kullanım tanıtımının gösterilme koşulları
  notifications.test.js   Bildirim izni ve günlük hatırlatma mantığı
  home-and-a11y.test.js   Ana sayfa render'ı ve erişilebilirlik senkronu
```

### `runWithApp()` neden `require()` değil?

`index.html` içindeki `<script>` bloğu bir JS modülü değil — hepsi
top-level `function`/`let`/`const` bildirimleri olarak tek bir global
scope'ta yaşıyor (`lessonState`, `progress`, `renderHome`, vb.). Bu kodu
Node.js'e normal bir modül gibi `require()` ettirip fonksiyonlarını "dışa
aktarmaya" çalışmak (örn. bir obje içine kopyalamak) ÇALIŞMAZ, çünkü
`lessonState` gibi değişkenler zaman içinde yeniden atandığında
(`lessonState = {...}`) alınan kopya güncel kalmaz.

Bunun yerine `support/load-app.js` içindeki `runWithApp(testSource)`,
`index.html`'in JS kaynağını okuyup, verilen test kodunu **aynı fonksiyon
gövdesi içinde, derleme zamanında (metin birleştirme yoluyla)** ekler ve
çalıştırır. Bu, testin sanki `index.html`'in kendi `<script>` etiketinin
içine satır satır yapıştırılmış gibi davranmasını sağlar — `lessonState`,
`progress` gibi değişkenlere gerçek zamanlı (canlı) erişim mümkün olur.

### DOM stub'ının sınırları

`support/dom-stub.js` gerçek bir tarayıcı motoru DEĞİLDİR. CSS
uygulanmaz, gerçek layout/paint olmaz, event capturing/bubbling
tam desteklenmez. Amaç görsel doğrulama değil, JavaScript mantığının
(state geçişleri, hesaplamalar, veri bütünlüğü, DOM'a yazılan HTML
string'lerinin doğru içeriği) test edilmesidir.

Bu yüzden test suite'i şunları YAKALAYAMAZ:
- CSS/layout hataları (bir elementin görsel olarak taşması, renklerin
  yanlış görünmesi)
- Gerçek klavye/mouse etkileşim davranışları (focus sırası, tıklama
  event'lerinin gerçek yayılımı)
- Tarayıcıya özgü API farklılıkları (Safari'de Web Speech API'nin
  Chrome'dan farklı davranması gibi)

Bu tür sorunlar için gerçek bir tarayıcıda manuel test (ya da ileride bir
Playwright/Puppeteer kurulumu) hâlâ gereklidir.

## Yeni test eklerken

1. İlgili kategoriye uyan bir `*.test.js` dosyası seç (ya da yeni bir
   kategori için yeni dosya aç — `run-all.js` otomatik bulur).
2. `runWithApp(\`...\`)` içine, appCode'un tanımladığı herhangi bir
   fonksiyon/değişkene doğrudan erişebilen ham JS kodu yaz.
3. `test("açıklama", () => { assertEqual(...); })` ile testleri tanımla.
4. Dosyanın en altına `run();` çağrısını unutma.
5. `node tests/dosya-adi.test.js` ile tek başına, ya da
   `node tests/run-all.js` ile tüm suite ile doğrula.

**Önemli:** `runWithApp()` içine yazılan kod string olarak `new Function`
ile çalıştırıldığı için, dosyanın en üstündeki Node.js scope'undaki
değişkenlere/fonksiyonlara erişemez (bkz. yukarıdaki mimari notu). Yardımcı
fonksiyonlar gerekiyorsa onları da `runWithApp` template string'inin
İÇİNE tanımlayın.
