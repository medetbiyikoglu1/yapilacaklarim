# Mobil uygulama iş analizi özeti

Tam doküman: https://claude.ai/code/artifact/207f3d6d-5d27-4c52-9c62-068879a7dc93

**Konum:** Unutkan bir kullanıcıya işi yapılana kadar hatırlatan, ücretsiz ve sade bir telefon uygulaması (iOS ve Android). Teknoloji: React Native + Expo, veri telefonda SQLite'ta.

## MVP kapsamı

- Bugün, Takvim (ay ve hafta), Tümü ekranları
- Telefondan planlanan saatli hatırlatma (internetsiz çalışır)
- Bildirimden "Bitti", "1 saat ertele", "Yarın"
- Israrcı hatırlatma (varsayılan 5 dk arayla, en fazla 5 kez), her işte ayrı seçilir
- Tekrarlayan işler (günlük, haftalık, aylık)
- Bir işe en fazla 3 hatırlatma
- Türkçe doğal dille ekleme ("yarın 18:00 fatura öde")
- Ana ekran ve kilit ekranı widget'ı

**Sonraki sürüm:** cihazlar arası senkron, Siri ve Kısayollar, Apple Watch, konuma göre hatırlatma.
**Kapsam dışı:** ekip ve paylaşılan listeler, ücretli abonelik, yapay zeka asistanı.

## Kritik teknik not

iOS bir uygulama için en yakın 64 planlı bildirimi tutar. Israrcı ve tekrarlayan hatırlatmalar bu sınırı aşabileceği için yalnızca önümüzdeki 48 saatin bildirimleri planlanır ve uygulama açılışında, arka plan yenilemede ve iş değişikliğinde liste yenilenir.

## Başarı ölçütleri (ilk 4 hafta)

| Ölçüt | Hedef |
| --- | --- |
| Hatırlatmadan sonraki 1 saatte tamamlanan ya da ertelenen iş | %80 ve üzeri |
| Haftalık geciken iş sayısı | Her hafta öncekinden az |
| Bir işi ekleme süresi | 5 saniyenin altı |
| Saatinde gelmeyen bildirim | 0 |
