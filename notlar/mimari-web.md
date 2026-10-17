# Web sürümü mimarisi

Üç parçadan oluşuyor:

1. **Telefondaki uygulama (PWA):** Düz HTML, CSS ve JavaScript; framework yok. İşler tarayıcı hafızasında (localStorage) duruyor. Service worker sayesinde ana ekrana eklenebiliyor ve internetsiz açılıyor.
2. **Sunucu (Cloudflare Worker):** Uygulama dosyalarını yayınlıyor ve küçük bir API sunuyor. Bildirim aboneliğini ve hatırlatma saatlerini kaydediyor; her dakika çalışan bir zamanlayıcıyla (cron) saati gelen hatırlatmaları gönderiyor.
3. **Veritabanı (Cloudflare D1, SQLite):** `subscriptions` (telefonun bildirim adresi) ve `reminders` (başlık, not, saat, tekrar) tabloları.

Bildirimler Web Push standardıyla Apple'ın bildirim sunucusu üzerinden geliyor. Şifreleme (RFC 8291) ve VAPID imzası ek kütüphane olmadan WebCrypto ile yazıldı (`src/webpush.js`).

## Dosyalar

| Dosya | Görev |
| --- | --- |
| `public/app.js` | Arayüz, form, takvim, bildirim izni |
| `public/tasks.js` | Tarih, tekrar ve hatırlatma hesapları (iOS'a taşınacak mantık) |
| `public/sw.js` | Çevrimdışı önbellek ve bildirim gösterme |
| `src/worker.js` | API ve dakikalık bildirim zamanlayıcısı |
| `src/webpush.js` | Web Push şifreleme ve VAPID |
| `scripts/build-demo.mjs` | Tek dosyalık deneme sayfası üretir |

## Artılar ve eksiler

- Artı: ücretsiz plana sığıyor, sunucu bakımı istemiyor.
- Eksi: liste yalnızca telefonda; Safari verisi silinirse işler gider, senkron yok.
- Eksi: bildirim internete ve sunucuya bağlı; kilit ekranından "Bitti" denemiyor. Mobil uygulamaya geçişin ana nedeni bu.

Yayına alma adımları kök klasördeki `README.md` dosyasında.
