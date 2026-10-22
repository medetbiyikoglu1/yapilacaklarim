# Yapılacaklarım

> **Mobil uygulama (iOS ve Android) `mobil/` klasöründe.** Kurulum için [mobil/README.md](mobil/README.md). Aşağıdaki web sürümü (PWA) ilk prototiptir.

iPhone'da ana ekrana eklenen, işlerini takvime planlayıp saati gelince bildirim gönderen yapılacaklar uygulaması.

## Özellikler

- **Bugün ekranı:** gecikenler, bugünün işleri, önümüzdeki 7 gün ve bugün bitenler. "Yarına at" ile tek dokunuşla erteleme.
- **Takvim:** ay ve hafta görünümü. Bir güne dokunup o güne iş planlanır.
- **Hatırlatma bildirimi:** tam saatinde, 10/30 dk, 1 saat ya da 1 gün önce. Saat girilmezse o gün 09:00'da hatırlatır.
- **Tekrarlayan işler:** her gün, her hafta, her ay. Tamamlanınca bir sonraki tekrara geçer.
- **Öncelik:** yüksek öncelikli işler turuncu çizgiyle görünür.
- İşler telefonda (tarayıcı hafızasında) tutulur. Sunucu yalnızca hatırlatma saatlerini saklar.

## Nasıl çalışır

iPhone, uygulama kapalıyken saati gelen bildirimi kendi kendine gönderemez. Bu yüzden:

1. Uygulama, işin hatırlatma saatini Cloudflare Worker'a gönderir (`/api/reminders`).
2. Worker her dakika çalışan bir zamanlayıcıyla vadesi gelen hatırlatmaları bulur ve Web Push ile telefona yollar.
3. Telefondaki service worker (`public/sw.js`) bildirimi gösterir.

| Dosya | Görev |
| --- | --- |
| `public/` | Uygulamanın kendisi (HTML, CSS, JS, service worker, ikonlar) |
| `public/tasks.js` | Tarih, tekrar ve hatırlatma hesapları |
| `src/worker.js` | API ve dakikalık bildirim zamanlayıcısı |
| `src/webpush.js` | Web Push şifreleme ve VAPID imzası (bağımlılıksız) |
| `schema.sql` | D1 veritabanı tabloları |

## Yayına alma (bir kerelik)

Ücretsiz bir [Cloudflare](https://dash.cloudflare.com/sign-up) hesabı gerekir.

```bash
npm install
npx wrangler login

# 1. Veritabanını oluştur, çıkan database_id'yi wrangler.toml'a yapıştır
npx wrangler d1 create yapilacaklarim
npm run db:init

# 2. Bildirim anahtarlarını üret ve sunucuya gir
npm run vapid
npx wrangler secret put VAPID_PUBLIC_KEY     # çıktıdaki ilk değer
npx wrangler secret put VAPID_PRIVATE_JWK    # çıktıdaki JSON

# 3. wrangler.toml'daki VAPID_SUBJECT'e kendi e-postanı yaz, sonra yayına al
npm run deploy
```

Komut sonunda `https://yapilacaklarim.<hesap-adın>.workers.dev` gibi bir adres verir.

## iPhone'a kurulum

1. Adresi **Safari**'de aç (iOS 16.4 veya üstü gerekir).
2. Paylaş düğmesine bas, **Ana Ekrana Ekle**'yi seç.
3. Uygulamayı ana ekrandan aç ve **Bildirimleri aç**'a dokun. Birkaç saniye içinde deneme bildirimi gelir.

## Geliştirme

```bash
npm run vapid   # çıktıyı .dev.vars dosyasına VAPID_PUBLIC_KEY=... ve VAPID_PRIVATE_JWK='...' olarak yaz
npx wrangler d1 execute yapilacaklarim --local --file=schema.sql
npm run dev     # http://localhost:8787
npm test
```
