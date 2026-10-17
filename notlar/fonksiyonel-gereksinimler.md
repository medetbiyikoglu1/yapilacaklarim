# Fonksiyonel gereksinimler özeti

Tam doküman (diyagramlarla): https://claude.ai/code/artifact/9df79e41-77bf-4aaf-b233-02a886b62ad7

Uygulama iOS ve Android için yapılacak. Teknoloji React Native + Expo, veri telefonda SQLite'ta; ayrıntı [mobil mimari](mimari-mobil.md) notunda.

## Ekranlar

Bugün (açılış), Takvim, Tümü alt sekmeleri; alttan açılan İş formu; Ayarlar. Bugün ekranında tek satırlık hızlı ekleme var. Bildirim izni ilk açılışta değil, ilk saatli iş kaydedilince istenir.

## İş kuralları

- Bir işe en fazla 3 hatırlatma; saatsiz işte hatırlatma 09:00'da (Ayarlar'dan değişir).
- Israrcı hatırlatma iş bazında, varsayılan kapalı; varsayılan aralık 5 dk (5/10/30/60 dk seçilebilir), en fazla 5 kez.
- Tekrar: günlük, haftalık (seçili günler), aylık, yıllık. Ayda olmayan gün ayın son gününe kayar. Geciken tekrarlar birikmez.
- "1 saat ertele" yalnızca bildirimi kaydırır; "Yarına at" işin tarihini yarına alır. Erteleme ısrar sayacını sıfırlar.
- Yalnızca önümüzdeki 48 saatin bildirimleri (en fazla 64) telefona planlanır; açılışta, arka plan yenilemede ve iş değişikliğinde yeniden kurulur.

- Biten işler 3 ay saklanır; Takvim'de geçmiş bir güne basınca o gün bitenler görünür.
- Widget yalnızca Bugün listesini gösterir.

## Türkçe doğal dil

Göreli gün, haftanın günü, göreli süre, takvim tarihi, saat, gün dilimi (sabah 09, öğlen 12, akşam 19, gece 22), tekrar ve ! / !! / !!! önceliği tanınır. Örnek: "her ayın 15'i kira", "cuma akşam annemi ara !!".

## Veri modeli

İş (başlık, not, tarih, saat, öncelik, tekrar, ısrar, tamamlanma), Hatırlatma (göreli ya da kesin, erteleme, ısrar sayacı) ve Ayarlar. Planlı bildirimler saklanmaz, her seferinde yeniden hesaplanır.

## Kararlaşan sorular

1. Platform ve teknoloji: iOS ve Android birlikte, React Native + Expo ile.
2. Web sürümündeki işler aktarılmayacak.
3. Israrcı hatırlatma aralığı varsayılan 5 dk, kullanıcı değiştirebilir.
4. Biten işler 3 ay saklanır, Takvim'de gösterilir.
5. Widget'ta yalnızca Bugün listesi.
