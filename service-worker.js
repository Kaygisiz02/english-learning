// Service Worker — "Anne ile İngilizce Öğreniyorum" uygulamasını offline
// çalışır hale getirir ve ana ekrana eklenebilir bir PWA yapar.
//
// Strateji: "cache falling back to network, with background update"
// (stale-while-revalidate benzeri). Uygulama tek bir büyük HTML dosyası
// olduğu için (tüm CSS/JS gömülü), önbellekten anında açılış + arka planda
// güncelleme kontrolü en doğru denge: kullanıcı offline'ken bile açılabilir,
// online'ken de en güncel sürümü arka planda indirip bir sonraki açılışta
// hazır bulur.
//
// CACHE_NAME'i her önemli içerik güncellemesinde artırmak eski önbelleği
// temizler. Sürüm numarası HTML içindeki "Sürüm:" etiketiyle gevşek şekilde
// eşleşir ama bağımsız da artırılabilir.
const CACHE_NAME = "ingilizce800-v2";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Yeni service worker'ın eski sekmeler kapanmadan devreye girmesini sağlar;
  // böylece bir sonraki reload'da hemen yeni sürüm aktif olur.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Sadece GET isteklerini ele al; POST vb. (bu uygulamada zaten yok) ağa bırak.
  if (event.request.method !== "GET") return;

  // Sadece aynı origin'deki istekleri önbellekle. Web Speech API gibi
  // tarayıcı-içi servisler zaten fetch'e düşmez; dışarıdan bir CDN linki
  // yoksa bu kontrol büyük ölçüde sadece kendi dosyalarımızı kapsar.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          // Başarılı ağ yanıtını önbelleğe yazıp döndür (arka planda güncelleme).
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse); // ağ yoksa (offline) önbelleğe düş

      // Önbellekte varsa anında onu döndür (hızlı açılış), yoksa ağı bekle.
      return cachedResponse || networkFetch;
    })
  );
});

// Günlük hatırlatma bildirimi (bkz. index.html içindeki maybeShowDailyReminder),
// bazı tarayıcılarda sayfa içinden doğrudan "new Notification()" ile
// gösterilemediği için "registration.showNotification()" üzerinden burada
// gösterilmiş olabilir. Kullanıcı bu bildirime tıkladığında varsayılan
// davranış hiçbir şey yapmamaktır — burada açıkça uygulamayı odaklıyor ya da
// kapalıysa yeni bir sekmede açıyoruz, aynı "new Notification()" yolundaki
// onclick davranışıyla tutarlı olsun diye.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("./");
    })
  );
});
