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
- `app.js` - Ana uygulama mantigi (UI, tablo, navigasyon, 6dk kurali, BMR)
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
- giris_loglari: islem log kayitlari (tarih, saat, tip, mesaj) - AKTIF
- daily_entries: gunluk veri girisleri (id, profile_id, date, time, detail, cal, carb, fiber, protein, fat, blood_sugar, insulin, gi, image_url, bilesenler JSONB, etiket TEXT) - AKTIF, RLS acik
- profiles: kullanici profili (id, name, gender, birth_date, height_cm, weight_kg) - TABLO MEVCUT, henuz app.js'e baglanmadi
- daily_summaries: gun sonu metabolik ozetler (id, profile_id, date, total_cal, total_carb, total_insulin, ai_summary) - AKTIF, gun kapanisinda yaziliyor

Artik kullanilmayan tablolar:
- besin_degerleri: eskiden yerel besin cache'i olarak kullaniliyordu, artik kullanilmiyor — besin degerleri her giris icin web_search ile hesaplaniyor
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
- config.js yuklenince: API key'ler (gemini/claude) her zaman localStorage'i ezer; profil bilgileri (isim, boy, kilo vb.) sadece localStorage bos ise uygulanir

## MCP Durumu
- Supabase MCP + GitHub MCP ikisi de `C:\Users\cagri\.claude\settings.json`'da tanimli
- Her konusma basinda mcp__supabase__list_projects cagirarak Supabase baglantisini kontrol et
- Calisiyorsa bagli demektir, VS Code yeniden baslatmaya gerek yok
- Supabase bagli degilse REST API fallback kullan:
  - URL: https://cjpeyxnkragcqckegiry.supabase.co
  - Anon key: config.js dosyasinda VARSAYILAN_SUPABASE.key
- GitHub MCP token: settings.json'da GITHUB_PERSONAL_ACCESS_TOKEN olarak tanimli

## GitHub Deployment
- Repo: https://github.com/cagri-karakas/t1d-panel (public)
- GitHub Pages: https://cagri-karakas.github.io/t1d-panel/ (aktif, deploy ~2dk suruyor)
- config.js repoda YOK (.gitignore) — API key'ler ve Supabase bilgileri GitHub'a yuklenmedi
- GitHub Pages'de ilk acilista: Supabase otomatik baglanir (app.js fallback), AI icin Ayarlar'dan Gemini key girilmeli
- Guncelleme: `git add <dosyalar> && git commit -m "..." && git push`
- GUVENLIK NOTU: Tum tablolarda RLS policy USING(true) — anon key bilen herkes erisebilir. Supabase auth ileride eklenecek.

## Mevcut Durum
- Supabase MCP kuruldu ve calisiyor
- giris_loglari tablosu aktif kullaniliyor
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
- gunuTemizle(): localStorage + Supabase daily_entries birlikte temizlenir
- supabaseGunlukKayitlariSil(tarih): supabase.js'e eklendi, tarihe gore toplu silme
- Besin kaynagi ve guven skoru: AI ekle isleminde kaynak ve guven alanlari donduruyor
  * kaynak: "web_arama:domain.com" | "ai_hesaplama"
  * guven: "yuksek" | "orta" | "dusuk"
  * Bildirimde kaynak etiketi gosterilir: "burgerking.com.tr", "AI tahmini"
  * guven="dusuk" ise bildirim turuncu renkte gosterilir (uyari tipi)
- bildirimGoster(): tip parametresi aktif edildi (bilgi/uyari/hata), CSS'e .bildirim.uyari stili eklendi
- Besin kaynak fallback: sonuc.kaynak yoksa 'ai_hesaplama' varsayilan, guven yoksa 'dusuk' — bildirimde her zaman etiket gorunur
- besinler[] array: AI ekle JSON'unda birden fazla besin varsa "besinler" dizisiyle donduruyor, app.js aiIleIsle() her birini ayri satirEkle() ile ekler
- besinler[] per-item kaynak: her besin kendi kaynak+guven alanlarina sahip
  * api.js besinler[] semasina kaynak+guven eklendi, talimat guncellendi
  * Bildirimde benzersiz kaynaklar listeleniyor: "· burgerking.com.tr, AI tahmini"
  * satirEkle() kaynak+guven alanlari ile cagriliyor, satirBirlestir() bilesenler[]'e kaynak ekliyor
  * Modal'da her bilesende kaynak badge'i: yesil=web kaynagi, sari=AI tahmini
  * Tek girisli kayitlarda da modal'da kaynak badge'i gosteriliyor
- satirEkle() tablo siralama: yeni kayit push() degil splice() ile zamana gore dogru konuma ekleniyor
  * Gecmise donuk saat girisinde (ornek: 23:30'da "22:00 cay") tablo kronolojik sirali kalir
  * 6dk kurali insertion noktasindaki zaman-komsu onceki kaydi kontrol eder (artik sadece son eleman degil)
- profilYukle() GitHub Pages destegi: VARSAYILAN_SUPABASE (config.js) yoksa app.js'deki fallback degerler kullanilir
  * Fallback: url=cjpeyxnkragcqckegiry.supabase.co, key=sb_publishable_ZounC462zKHD_aHDc2PSgQ_SYTfBYVB
  * API key yoksa bildirim alani HTML link ile Ayarlar sayfasina yonlendirir (8 sn gosterilir)
- daily_summaries bug duzeltildi: gunuKapat() artik supabaseOzetKaydet() cagiriyor
- api.js fallback Gemini modeli guncellendi: gemini-2.0-flash → gemini-3-flash-preview (GitHub Pages'de config.js olmayinca devreye giriyor)
- iOS safe area destegi eklendi: viewport-fit=cover (index.html), env(safe-area-inset-bottom) (style.css .giris-alani ve .sayfa)
- sw.js cache versiyonu: mmp-v13 (her yeni deploy oncesi arttirilmali)
- sw.js sadece GET isteklerini cache'liyor; POST ve googleapis.com SW disinda
- sw.js JS dosyalari (app.js, api.js) icin network-first stratejisi — deploy sonrasi hard refresh gerekmez
- style.css: [hidden] { display: none !important } kurali eklendi — CSS class display override sorunu cozuldu

## Tarih Yonetimi (2026-03-29)
- bugunTarih(): toISOString() yerine lokal tarih kullanir — UTC+3 timezone bug'i duzeltildi
- kayitTarihi(): 4 saat kurali — son giristen 4 saat gecmediyse yeni kayit ayni gunun tarihine gider
  * durum.sonGirisZamani: timestamp, localStorage'a kaydedilir (mmp_son_giris_zamani)
  * Gece yarisindan sonra 4 saat icindeki girisler onceki gunun verisine eklenir
  * 4 saat gecince yeni gun baslar
  * gunuTemizle() sonGirisZamani'yi da sifirlar
- gunlukVerileriYukle() / gunlukVerileriKaydet() / supabaseKayitEkle(): bugunTarih() yerine kayitTarihi() kullanir

## Tarih Navigasyonu (2026-03-29)
- Baslikta tarih navigasyon: ← TARIH → butonlari (index.html .tarih-nav)
- durum.gorunenTarih: null=bugun, 'YYYY-MM-DD'=gecmis gun
- gunuGoster(tarih): Supabase'den o tarihin daily_entries'ini yukler, read-only render eder
- aktifTarih(): durum.gorunenTarih || bugunTarih()
- bugunMu(): aktifTarih() === bugunTarih()
- tarihNavGuncelle(): label gunceller, temizle/geri al butonlarini gecmis gunde gizler
- Giris alani her zaman gorunur — gecmis gun gorunumunde de yeni veri girilebilir
- Gecmis gunde modal'da Duzenle/Sil butonlari gizlenir (read-only)
- tariheDayEkle(tarihStr, gun): timezone-safe gun ekleme/cikarma yardimcisi

## Tablo Detay & Modal
- DETAY sutunu artik kisa etiket gosteriyor: kayitEtiketiOlustur(kayit) — app.js
  * Sadece KS/Ins: "Kan sekeri olcumu", "Insulin dozu", "Kan sekeri + Insulin"
  * Besin girisleri saate gore: Kahvalti (06-10:30), Sabah ara ogunu, Ogle yemegi, Ikindi ara ogunu, Aksam yemegi, Gece atistirmasi
  * Karma giris: "Aksam yemegi + Ins" gibi bilesik etiket
  * kayit.etiket alani varsa saat hesabini bypass eder (kullanici "kahvalti olacak" dediginde AI etiket:"Kahvaltı" gonderir)
- Satira tiklaninca detay modali aciliyor (satirTiklandi): tam detay metni + 8 deger gridi + Sil + Duzenle butonu
- Modal kapatma: X butonu veya overlay'e tikla
- satirBirlestir() artik bilesenler[] dizisi biriktiriyor
  * Modal bilesenler[] varsa her ogeyi isim + besin ozeti satirinda gosteriyor
  * Eski veriler (bilesenler yoksa) ham detay metnini gosteriyor
- Modal Duzenle modu:
  * "Duzenle" butonu → her bilesen editable input'a donus, yaninda × silme butonu
  * "Kaydet & Hesapla" → spinner gosterir, modal kapanir, "AI hesaplıyor..." bildirimi cıkar
  * Degismeyen bilesenlerin degerlerini mesajda AI'ya bildirir (koru), sadece degisen yeniden hesaplanir
  * AI guncelle response'unda veri.bilesenler[] donerse per-item degerler de guncellenir (api.js schema'da tanimli)
  * AI cevabi sonrasi bilesenler[].detay isimleri manuel guncellenir (safety net)
  * api.js: guncelle schema'ya bilesenler[] eklendi; ogün etiketi duzeltmesinde veri.etiket gonderme talimati eklendi
  * Gecmis gunde modal acilinca Duzenle/Sil butonlari gizlenir

## besinler[] Duzeltmeleri (2026-03-27)
- besin.isim alani onceligi: detay = besin.isim || besin.detay || sonuc.detay
- sonuc.ins / sonuc.ks sadece ilk besine (ilkBesin = bi===0) ataniyor
- NET KARBONHIDRAT karti ve gun kapanisi ozeti artik lif cikarmıyor

## Bilinen Bug Duzeltmeleri (tamamlandi)
- Birlesik besin adi kaydetme bug'i: guncelle isleminde detayda " + " varsa besin DB'ye kaydedilmiyordu
- Ayarlar paneli ekranda kalma bug'i: sayfaGoster() inline style temizliyor
- Besin DB sync merge → replace: Supabase'den silinen yanlis kayitlar localStorage'da kalmiyordu
- Gemini JSON sarma bug'i: sadeceMesaj + yorum icinde JSON → otomatik cozumleniyor
- satirEkle await bug'i: aiIleIsle ve manuelFormGonder'da await eksikti
- Temizle sonrasi F5'te veri geri gelme bug'i: gunuTemizle Supabase'i temizlemiyordu
- Tablo siralama bug'i: satirEkle push() → splice() ile duzeltildi
- Besin DB duplikasyon bug'i: taban isim + ref_miktar semasiyla cozuldu
- SW POST caching bug'i: Gemini POST istegi SW tarafindan cachelenmeye calisiliyordu — sadece GET cache'leniyor
- besinler[] insulin tripling: 3 besin x 12U = 36U — ilkBesin flag ile duzeltildi
- besinler[] baslik tekrarlama: "isim" alani yerine "detay" okunuyordu — duzeltildi
- NET KARBONHIDRAT double-subtraction: Turk etiketleri net karb gosterdigi halde lif tekrar cikariliyordu
- Ogun etiketi degistirme: kayitEtiketiOlustur() artik kayit.etiket override'ini onceliklendirir
- bilesenler[] F5 sonrasi kaybolma: daily_entries'e bilesenler+etiket kolonu eklendi, supabase.js guncellendi
- Modal duzenle butonlari cakismasi: [hidden]{display:none!important} ile duzeltildi
- Modal duzenle sonrasi bilesen isimleri guncellenmiyor: aiIleIsle sonrasi manuel guncelleme eklendi
- Modal duzenle degerleri degisiyor: AI'ya "koru" direktifiyle gonderiliyor; api.js guncelle schema'sinda bilesenler[] tanimli
- Modal kaydet loading yok: spinner + "AI hesaplıyor..." bildirimi eklendi
- bugunTarih() timezone bug'i: gece yarisi UTC+3 fark nedeniyle yanlis gun donuyordu — lokal tarih kullanimi ile duzeltildi
- Gece yarisi kayit tarihi bug'i: 4 saat kurali ile cozuldu (kayitTarihi() fonksiyonu)
- Tarih navigasyonu ikiser gidiyor: toISOString() + double event → tariheDayEkle() + type=button ile duzeltildi
- Gecmis gunde giris yapılamıyor: giris alani her zaman gorunur, sadece modal butonlari gizleniyor

## Kaldığımız Yer (2026-03-29)
- Uygulama GitHub Pages'de canlı ve calisiyor: https://cagri-karakas.github.io/t1d-panel/
- Tarih navigasyonu eklendi: ← → ile gecmis gunlere gidilip veri gorulebilir
- 4 saat kurali aktif: gece yarisindan sonraki girisler dogru gune kaydediliyor
- Modal Duzenle modu: per-item bilesen degerleri guncelleniyor (api.js bilesenler[] schema)
- Gecmis gun gorunumunde giris alani aktif, sadece modal Duzenle/Sil gizli

## Siradaki Isler
- Ogun etiketi sorunu: sabit saat araligina gore belirleniyor, gec uyananlar icin yanlis etiket cikiyor
  * Cozum secenekleri: uyanis saati ayari, gun ici sira bazli etiket, veya AI context bazli karar
- iOS klavye acilinca layout bozulma sorunu (position:fixed + visualViewport sorunu olabilir)
- Profil bilgilerinin Supabase profiles tablosuna baglama (tablo mevcut, app.js entegrasyonu yok)
- Supabase auth (Google login) — RLS gercek kullanici bazli yapilacak (simdilik USING(true), dusuk oncelik)
- Dexcom CGM entegrasyonu (ileride)
