# Yapılacaklarım mobil uygulaması

iOS ve Android için tek kod tabanı: React Native + Expo (TypeScript). İşler telefonda SQLite'ta durur, sunucu yoktur; hatırlatmaları telefon kendisi planlar.

## İlk sürümde neler var

- **Bugün:** gecikenler, bugünün işleri, bugün bitenler, tek satırlık hızlı ekleme, "Yarın" ile erteleme ve günün ilerleme halkası.
- **Takvim:** ay görünümü; bir güne basınca o günün işleri ve o gün bitenler görünür.
- **Tümü:** bitmemiş bütün işler tarihe göre gruplu.
- **İş formu:** tarih, saat, tekrar (her gün, seçili hafta günleri, her ay, her yıl), en fazla 3 hatırlatma, ısrarcı hatırlatma ve öncelik.
- **Bildirimler:** kilit ekranında **Bitti** ve **1 saat ertele** düğmeleri. Israrcı hatırlatma açık işte, bitti denene kadar seçilen aralıkla (varsayılan 5 dk) en fazla 5 kez daha uyarır.
- **Ayarlar:** saatsiz işlerin hatırlatma saati, varsayılan ısrar aralığı ve tekrar sayısı, bildirim izinleri.
- Biten işler 3 ay saklanır, sonra silinir. Karanlık mod telefonla birlikte değişir.

## Expo Go ile hızlı deneme

Proje Expo SDK 57 kullanıyor; App Store'daki Expo Go bu sürümü açıyor. iPhone'a Expo Go'yu kur, Mac ile aynı Wi-Fi'da olduğundan emin ol, sonra:

```bash
cd mobil
npm install
npx expo start
```

Çıkan QR kodu iPhone kamerasıyla okut. Bildirimler Expo Go'da da gelir ama başlıkta uygulama adı yerine "Expo Go" görünür.

## Kendi iPhone'una kurmak (Mac gerekir)

1. Mac'e [Xcode](https://apps.apple.com/app/xcode/id497799835) ve [Node.js](https://nodejs.org) (22 veya üstü) kur.
2. iPhone'u kabloyla Mac'e bağla; iPhone'da **Ayarlar › Gizlilik ve Güvenlik › Geliştirici Modu**'nu aç.
3. Terminalde:

   ```bash
   cd mobil
   npm install
   npx expo run:ios --device
   ```

4. Xcode ilk seferde Apple hesabınla imzalama ister: **Signing & Capabilities** sekmesinde *Team* olarak kendi Apple hesabını seç. Ücretsiz hesapla kurulan uygulama 7 günde bir aynı komutla yeniden kurulmalı.

Android telefon için aynı adımlarda `npx expo run:android --device` kullanılır (Android Studio gerekir).

## Geliştirme

```bash
npm start            # geliştirme sunucusu
npm test             # tarih, tekrar ve bildirim planlama testleri
npm run typecheck
npm run lint
npx expo start --web # tarayıcıda hızlı önizleme (bildirim yok, veri tarayıcıda)
```

## Kod düzeni

| Yer | Görev |
| --- | --- |
| `src/app/` | Ekranlar (Expo Router): `(tabs)/index` Bugün, `(tabs)/takvim`, `(tabs)/tumu`, `is` iş formu, `ayarlar` |
| `src/lib/tasks.ts` | Tekrar hesapları, tamamlama, erteleme |
| `src/lib/plan.ts` | Telefona kurulacak bildirimlerin listesi (en yakın 60 tanesi, 14 gün ileriye kadar) |
| `src/lib/notifications.ts` | Bildirim izni, planı telefona kurma, Bitti/Ertele düğmeleri |
| `src/lib/storage.ts` | SQLite (tarayıcı önizlemesi için `storage.web.ts`) |
| `src/lib/store.tsx` | Uygulama durumu; her değişiklikte bildirimleri yeniden kurar |

## Bilinen sınırlar

- iOS bir uygulamaya en fazla 64 bekleyen bildirim izin verir. Plan en yakın 60 bildirimi kurar ve uygulama her açıldığında yenilenir; uygulama uzun süre hiç açılmazsa uzak tarihli hatırlatmalar kurulmamış olabilir.
- Bitti/Ertele düğmeleri uygulamayı açar; iOS kapatılmış bir uygulamada arka planda basılan düğmeyi iletmeyebildiği için bu tercih edildi.
- Android 14 ve üstünde tam saatinde uyarı için kullanıcının "Alarmlar ve hatırlatıcılar" iznini vermesi gerekir; Ayarlar ekranında düğmesi var, verilmezse hatırlatmalar birkaç dakika gecikebilir.
