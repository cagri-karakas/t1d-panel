# Metabolik Muhendislik Paneli

## Proje Aciklamasi
Tip 1 Diyabet (T1D) hastasi icin kisisel metabolik takip uygulamasi.
Dogal dil ile veri girisi, Claude API ile besin degeri hesaplama ve metabolik analiz.

## Teknoloji
- HTML + CSS + JavaScript (vanilla, framework yok)
- PWA (Progressive Web App)
- Supabase (veritabani + storage)
- Gemini API (dogal dil isleme, Google Search grounding, gorsel tanima) — varsayilan
- Claude API (opsiyonel, ayarlardan secilir)

## Dosya Yapisi
- `index.html` - Ana sayfa (tek sayfa uygulama)
- `style.css` - Koyu temali, mobil oncelikli tasarim
- `app.js` - Ana uygulama mantigi (UI, tablo, navigasyon, 10dk kurali, BMR)
- `api.js` - AI API entegrasyonu (Gemini + Claude, dogal dil isleme, Google Search grounding, rate limit retry)
- `supabase.js` - Veritabani islemleri (CRUD, storage)
- `config.js` - Kisisel yapilandirma (gizli, .gitignore'da)
- `manifest.json` - PWA ayarlari
- `sw.js` - Service Worker (offline destek)

## Onemli Kurallar
- Dil: Turkce (UI ve degisken isimleri Turkce olabilir)
- Tema: Koyu arka plan, gorseldeki tasarima sadik kal
- Mobil oncelikli responsive tasarim
- Dual mod: AI destekli (API key var) + Manuel mod (API key yok)
- 6 dakika kurali: ayni 6 dk icindeki girisler tek satirda birlesir
- Gun kapanisi kullanici komutuyla olur, otomatik gece 12 kapanmasi YOK
- Besin degeri hesaplamasi cok onemli: gram, kasik, adet, ml desteklenmeli
- AI personasi: T1D uzmani + beslenme danismani

## Veritabani (Supabase)
Aktif tablolar:
- besin_degerleri: tum besin veritabani (~85 besin + kullanici duzeltmeleri, isim UNIQUE=taban isim, kal, karb, lif, prot, yag, gi, ref_miktar, ref_birim) - AKTIF, baslangicta localStorage'a senkronize edilir
- giris_loglari: islem log kayitlari (tarih, saat, tip, mesaj) - AKTIF
- daily_entries: gunluk veri girisleri (id, profile_id, date, time, detail, cal, carb, fiber, protein, fat, blood_sugar, insulin, gi, image_url) - AKTIF, RLS acik
- profiles: kullanici profili (id, name, gender, birth_date, height_cm, weight_kg) - TABLO MEVCUT, henuz app.js'e baglanmadi
- daily_summaries: gun sonu metabolik ozetler (id, profile_id, date, total_cal, total_carb, total_insulin, ai_summary) - AKTIF, gun kapanisinda yaziliyor

Henuz kullanilmayan eski tablolar:
- kan_sekeri, insulin, ogunler, gunluk_ozet — eski yapilar, uygulama kullanmiyor

## Veri Girisi Kurallari
- Tek giris noktasi: kullanici dogal dilde yazar, AI tur belirler (besin, KS, insulin, karma)
- Karma giris desteklenir: "200g makarna, KS 143, 12U Humalog" → besin + KS + insulin ayri ayri islenir
- Saat belirtilmezse o anki saat kullanilir
- Besin hesaplamasinda gram, kasik, adet, ml desteklenir
- Besin arama: localStorage (Supabase'den senkronize) + web_search (fallback)
- Marka urunler icin web_search ile internetten arastirilir (Turkiye oncelikli)
- Etiket fotografi paylasip "bundan 100 gram" denilebilir
- GI (Glisemik Indeks) her besin icin hesaplanmali
- 6 dk kurali: ayni 6 dk icindeki girisler tek satirda birlesir, GI karb bazli agirlikli ortalama ile hesaplanir
- Kullanici duzeltme isterse AI yeniden arastirip guncellemeli (satirGuncelle)
- Ctrl+V ile gorsel yapistirma desteklenir

## AI Davranisi
- Persona: T1D uzmani + beslenme danismani
- Her giris sonrasi kisa, anlamli yorum yapar
- Kullanici itirazi olursa kendi hesabinda israr etmeden tekrar arastirir
- Gun kapanisinda BMR + aktivite hesaplayarak kilo alma/verme analizi yapar
- BMR hesabi: cinsiyet + yas + boy + kilo (Mifflin-St Jeor formulu)
- Mesaj gecmisi max 10 mesaj (onceden 6'ydi)
- Her AI cagrisinda son 7 gunun ozeti (daily_summaries) sistem promptuna eklenir → AI gecmis trend analizi yapabilir
- AI desteklenen islemler: ekle, guncelle, sil, profilGuncelle, gunuKapat, sadeceMesaj

## Profil Bilgileri (config.js - gizli, .gitignore'da)
- Isim, cinsiyet, dogum tarihi, boy, kilo
- API_KONFIG objesi: tum AI ayarlari tek yerde (saglayici, key, model, url)
  * API_KONFIG.saglayici: 'gemini' veya 'claude' — buradan degistir
  * API_KONFIG.gemini.model: aktif Gemini modeli (su an: gemini-3-flash-preview)
  * API_KONFIG.claude.model: aktif Claude modeli (su an: claude-haiku-4-5-20251001)
  * Model/key/saglayici degistirmek icin SADECE config.js'i duzenle, baska dosyaya dokunma
- VARSAYILAN_API_KEY, VARSAYILAN_GEMINI_KEY, VARSAYILAN_API_SAGLAYICI — API_KONFIG'den turetilen geriye donuk sabitler
- Supabase URL + anon key (VARSAYILAN_SUPABASE)
- Bu bilgiler uygulama acildiginda otomatik yuklenir, config.js degerleri her zaman localStorage'i ezer

## Supabase MCP Durumu
- MCP settings.json'da tanimli: `C:\Users\cagri\.claude\settings.json`
- Her konusma basinda mcp__supabase__list_projects cagirarak bagli olup olmadigini kontrol et
- Calisiyorsa bagli demektir, VS Code yeniden baslatmaya gerek yok
- Bagli degilse REST API fallback kullan:
  - URL: https://cjpeyxnkragcqckegiry.supabase.co
  - Anon key: config.js dosyasinda VARSAYILAN_SUPABASE.key

## Mevcut Durum
- Supabase MCP kuruldu ve calisiyor
- besin_degerleri (~90 besin) ve giris_loglari tablolari aktif kullaniliyor
- Besin veritabani tamamen Supabase'de, baslangicta localStorage'a senkronize ediliyor (besin-db.js kaldirildi)
- Besin DB sync artik REPLACE (merge degil) — Supabase tam kaynak, eski/yanlis localStorage kayitlari temizlenir
- Chat tarzi log alani eklendi (giris alani ustunde, Supabase'e kaydediliyor)
- Besin hesaplama, 6dk kurali, GI agirlikli ortalama, Ctrl+V gorsel yapistirma calisiyor
- Temizle butonu (cop kutusu ikonu) ana sayfada baslik saginda, ayarlar dislisi yaninda
- Gemini API aktif: model gemini-3-flash-preview (config.js API_KONFIG'den okunuyor), Google Search grounding destekli
- gemini-3-flash-preview aslinda Gemini 2.5 thinking modelidir (thoughtSignature dondurur) — maxOutputTokens 8192 olmali (2048 yetmiyor, JSON kesilebilir)
- Gorsel girisinde log'a "(gorsel eklendi)" yaziliyor
- Gemini bazen asil JSON'i yorum alanina sardigi durum yakalanip otomatik duzeltiliyor (app.js aiIleIsle)
- daily_entries Supabase'e entegre edildi: kayit ekle/guncelle/sil Supabase'e yansiyor, sayfa yenilemede Supabase'den yukleniyor
- gunlukVerileriYukleSupabase(): Supabase hazir olunca bugunun kayitlarini ceker, localStorage'i gunceller
- satirEkle(): async, Supabase'e kaydeder, donus id'yi kayit objesine supabaseId olarak saklar
- satirGuncelle() / satirSil(): supabaseId varsa Supabase'e yansitir (fire-and-forget)
- gunuTemizle(): localStorage + Supabase daily_entries birlikte temizlenir (F5'te geri gelme sorunu cozuldu)
- supabaseGunlukKayitlariSil(tarih): supabase.js'e eklendi, tarihe gore toplu silme
- Besin kaynagi ve guven skoru: AI ekle isleminde kaynak ve guven alanlari donduruyor
  * kaynak: "yerel_db" | "web_arama:domain.com" | "ai_hesaplama"
  * guven: "yuksek" | "orta" | "dusuk"
  * Bildirimde kaynak etiketi gosterilir: "Onaylanmis kayit", "burgerking.com.tr", "AI tahmini"
  * guven="dusuk" ise bildirim turuncu renkte gosterilir (uyari tipi)
- bildirimGoster(): tip parametresi aktif edildi (bilgi/uyari/hata), CSS'e .bildirim.uyari stili eklendi
- Besin kaynak fallback: sonuc.kaynak yoksa 'ai_hesaplama' varsayilan, guven yoksa 'dusuk' — bildirimde her zaman etiket gorunur
- Besin DB kayit akilli filtre: ekle isleminde kombine giris / insülin / KS varsa DB'ye yazma (tekBesin kontrolu)
- besinler[] array: AI ekle JSON'unda birden fazla besin varsa "besinler" dizisiyle ayri ayri donduruyor, her biri DB'ye kaydediliyor
- Besin DB sema guncellendi: isim = taban isim (miktarsiz), ref_miktar + ref_birim ayri kolonlar
  * besinVeritabanineEkle(): miktarCikar() ile miktari isimden ayirip taban isim + refMiktar/refBirim kaydet
  * besinVeritabanindaAra(): taban isimle esles, refMiktar varsa sorgu miktarina gore orantila
  * "viski 80 ml" → DB'de "viski" (ref:40ml, 97kcal) bulunur, 80/40=2x oranla 194kcal hesaplanir
  * Marka korumasi: "özerhisar ayran" sorgusu "ayran" DB kaydini kullanmaz (ekstra kelime koruması)
  * Eski sema geriye donuk uyumlulugu: refMiktar=null eski kayitlarda isimde gomulu miktar ile oranlanir
  * miktarCikar() fonksiyonu: sayisal (245ml, 100g) ve Turkce olcu (bir su bardagi=200ml, yemek kasigi=15ml) anlama
  * OLCU_TABLOSU: su bardagi=200, cay bardagi=120, yemek kasigi=15, tatli kasigi=7, cay kasigi=3, fincan=150, kase=250 (ml/g)
  * birimUyumlu() + miktarMlYaCevir(): iki birimin uyumlu olup olmadigini kontrol eder, ml/g'ye cevirerek oran hesaplar
- satirEkle() tablo siralama: yeni kayit push() degil splice() ile zamana gore dogru konuma ekleniyor
  * Gecmise donuk saat girisinde (ornek: 23:30'da "22:00 cay") tablo kronolojik sirali kalir
  * 6dk kurali insertion noktasindaki zaman-komsu onceki kaydi kontrol eder (artik sadece son eleman degil)

## Bilinen Bug Duzeltmeleri (tamamlandi)
- Birlesik besin adi kaydetme bug'i duzeltildi: guncelle isleminde detayda " + " varsa besin DB'ye kaydedilmiyor
- Ayarlar paneli ekranda kalma bug'i duzeltildi: sayfaGoster() inline style temizliyor
- Besin DB sync merge → replace yapildi: Supabase'den silinen yanlis kayitlar localStorage'da kalmiyordu, duzeltildi
- Gemini JSON sarma bug'i: sadeceMesaj + yorum icinde JSON → otomatik cozumleniyor
- satirEkle await bug'i: aiIleIsle ve manuelFormGonder'da await eksikti, supabaseId set edilmeden devam ediyordu, duzeltildi
- Temizle sonrasi F5'te veri geri gelme bug'i: gunuTemizle Supabase'i temizlemiyordu, duzeltildi
- Tablo siralama bug'i: satirEkle push() → splice() ile duzeltildi, gecmis saatli girisler dogru konuma giriyor
- Besin DB duplikasyon bug'i: "40 ml viski" + "viski 40 ml" + "viski tek" ayri satirlar olusturuyordu — taban isim + ref_miktar semasiyla cozuldu

## Siradaki Isler
- Profil bilgilerinin Supabase profiles tablosuna baglama (tablo mevcut, app.js entegrasyonu yok)
- Dexcom CGM entegrasyonu (ileride)
