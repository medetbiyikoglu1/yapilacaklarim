# Mobil uygulama mimarisi

Karar tarihi: 18 Ekim 2026. Ayrıntılı gereksinimler: https://claude.ai/code/artifact/9df79e41-77bf-4aaf-b233-02a886b62ad7

| Katman | Seçim |
| --- | --- |
| Platform | iOS ve Android, tek kod |
| Dil ve arayüz | React Native + Expo, TypeScript |
| Veri | Telefonda SQLite (expo-sqlite) |
| Bildirim | Telefonun yerel bildirimleri; kilit ekranından Bitti/Ertele için Notifee gibi bir kütüphane gerekebilir |
| Senkron | İlk sürümde yok; ikinci sürümde aday Supabase |
| Sunucu | Yok |
| Kod yeri | `mobil/` klasörü (ilk sürüm: PR #1) |
| Derleme ve dağıtım | EAS Build; iOS için TestFlight ve App Store, Android için Google Play |

## Teknik notlar

- iOS en fazla yaklaşık 64 bekleyen bildirim tutar: önümüzdeki 14 gün planlanır ama en yakın 60 bildirimle sınırlıdır, ısrarcı tekrarlar parti parti kurulur.
- Android 14 ve sonrasında saatinde bildirim için "alarm ve hatırlatıcılar" izni (SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM) gerekir.
- Widget'lar her platformda yerel kodla yazılır (iOS'ta WidgetKit, Android'de uygulama widget'ı) ve yalnızca Bugün listesini gösterir.

## Maliyet

Apple Geliştirici Programı yılda 99 $, Google Play geliştirici hesabı tek seferlik 25 $.
