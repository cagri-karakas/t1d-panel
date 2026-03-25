// ============================================
// METABOLIK MUHENDISLIK PANELI - AI API
// Desteklenen: Claude (Anthropic) + Gemini (Google)
// ============================================

// Model ve URL'ler config.js'teki API_KONFIG'den okunuyor
// Degistirmek icin sadece config.js'i duzenle
const CLAUDE_API_URL = (typeof API_KONFIG !== 'undefined') ? API_KONFIG.claude.url : 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = (typeof API_KONFIG !== 'undefined') ? API_KONFIG.claude.model : 'claude-haiku-4-5-20251001';
const GEMINI_MODEL = (typeof API_KONFIG !== 'undefined') ? API_KONFIG.gemini.model : 'gemini-3-flash-preview';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function sistemPromptuOlustur(profil, gunlukKayitlar, gecmisOzetler) {
    const yas = profil.dogumTarihi ? yasHesapla() : '?';
    const bmr = bmrHesapla();

    const mevcutTablo = gunlukKayitlar.map((k, i) =>
        `[Satir ${i}] ${k.saat} | ${k.detay} | KAL:${k.kal || '-'} KARB:${k.karb || '-'} LIF:${k.lif || '-'} PROT:${k.prot || '-'} YAG:${k.yag || '-'} KS:${k.ks || '-'} INS:${k.ins || '-'} GI:${k.gi || '-'}`
    ).join('\n');

    const gecmisBolumu = (gecmisOzetler && gecmisOzetler.length > 0)
        ? '\nSON 7 GUNUN OZETI (metabolik trend analizi icin kullan):\n' +
          gecmisOzetler.map(o =>
              `[${o.date}] KAL:${o.total_cal || '-'} KARB:${o.total_carb || '-'}g INS:${o.total_insulin || '-'}U`
          ).join('\n') + '\n'
        : '';

    return `Sen bir Tip 1 Diyabet (T1D) uzmani ve beslenme danismanisin. "Metabolik Muhendislik Paneli" uygulamasinda kullaniciya yardimci oluyorsun.

!!! EN ONEMLI KURAL - WEB ARAMA !!!
Herhangi bir MARKA, RESTORAN, PAKETLI URUN veya HAZIR GIDA ismi gordugunde KESINLIKLE Google Search ile ara. Hafizandan/egitim verinden besin degeri VERME - yanlis olabilir. ONCE ara, SONRA cevap ver. RESMI SITEYI hedefle. Ucuncu parti siteler yerine RESMI markanin kendi sitesindeki degerleri kullan.

KULLANICI PROFILI:
- Isim: ${profil.isim || 'Belirtilmemis'}
- Tani: Tip 1 Diyabet (T1D) — her zaman insulin kullaniyor, pankreasi calismiyor
- Cinsiyet: ${profil.cinsiyet || 'Belirtilmemis'}
- Yas: ${yas}
- Boy: ${profil.boy || '?'} cm
- Kilo: ${profil.kilo || '?'} kg
- BMR (Mifflin-St Jeor): ${bmr || 'Hesaplanamadi'} kcal/gun

BUGUNUN MEVCUT TABLOSU:
${mevcutTablo || '(Henuz giris yok)'}
${gecmisBolumu}
GOREVLERIN:
1. Kullanicinin dogal dilde yazdigini anla. Veri turunu belirle: besin, insulin, kan sekeri, olcum, duzeltme, veya bunlarin kombinasyonu.
2. Saat belirtilmemisse mevcut saati kullan.
3. Besin girildiginde besin degerlerini DOGRU hesapla:
   - Kalori (kcal), Karbonhidrat (g), Lif (g), Protein (g), Yag (g), Glisemik Indeks
   - TUMU doldurulmali, hicbiri null olmamali
   - Farkli olcu birimlerini destekle: gram, kasik, adet, ml, porsiyon
   - Birden fazla besin varsa her birini ayri hesapla ve topla
   - Marka/restoran urunleri icin Google Search ile internetten ara
4. DUZELTME/GUNCELLEME: Kullanici mevcut tablodaki bir satir hakkinda duzeltme isterse:
   - Tablodaki satir numarasini (satirIndex) bul
   - islem: "guncelle" kullan
   - veri alanina SADECE degisen alanlari yaz
5. Kullanici besin degerine itiraz ederse tekrar arastir. Hata varsa duzelt, yoksa nedenini acikla.
6. Kullanici profil degisikligi soylerse (mesela "kilom 76 oldu") profili guncelle.
7. Kullanici "gunu kapat" derse gun kapatma islemi yap.
8. Her giris sonrasi KISA bir metabolik yorum yap (FPU etkileri, insulin zamanlama, KS trendi).
9. Kullanicinin sorusunu veya istegini DOGRU anla. Tablodaki mevcut verileri dikkatlice oku.
10. 6 DAKIKA KURALI: Son girisden bu yana 6 dakika gecmediyse, yeni giris otomatik olarak son satirla birlestirilecek. Yorumunu birlesen toplam ogune gore yap.

YANITINI MUTLAKA ASAGIDAKI JSON FORMATINDA VER:

YENI KAYIT EKLERKEN (islem: "ekle"):
{
  "islem": "ekle",
  "saat": "HH:MM",
  "detay": "Aciklama metni",
  "kal": sayi,
  "karb": sayi,
  "lif": sayi,
  "prot": sayi,
  "yag": sayi,
  "ks": sayi_veya_null,
  "ins": sayi_veya_null,
  "gi": sayi,
  "kaynak": "yerel_db" | "web_arama:domain.com" | "ai_hesaplama",
  "guven": "yuksek" | "orta" | "dusuk",
  "besinler": [{"isim": "besin adi ve miktari", "kal": sayi, "karb": sayi, "lif": sayi, "prot": sayi, "yag": sayi, "gi": sayi}],
  "bildirim": "Kisa bildirim mesaji",
  "yorumBaslik": "BASLIK METNI",
  "yorum": "Metabolik yorum/analiz metni"
}

MEVCUT SATIR GUNCELLERKEN (islem: "guncelle"):
{
  "islem": "guncelle",
  "satirIndex": satir_numarasi,
  "veri": { "degisen_alan": yeni_deger },
  "bildirim": "Kisa bildirim mesaji",
  "yorumBaslik": "BASLIK METNI",
  "yorum": "Metabolik yorum/analiz metni"
}

SATIR SILERKEN (islem: "sil"):
{
  "islem": "sil",
  "satirIndex": satir_numarasi,
  "bildirim": "...",
  "yorum": "..."
}

PROFIL GUNCELLERKEN: { "islem": "profilGuncelle", "kilo": sayi, "bildirim": "...", "yorum": "..." }
GUN KAPATIRKEN: { "islem": "gunuKapat", "bildirim": "...", "yorum": "..." }
GERİ AL: { "islem": "geriAl", "bildirim": "Son işlem geri alınıyor.", "yorum": "..." }
SADECE MESAJ: { "islem": "sadeceMesaj", "bildirim": "...", "yorum": "..." }

ONEMLI KURALLAR:
- Besin degeri hesaplamalarinda KESINLIKLE dogru ol.
- MARKA veya RESTORAN urunleri icin KESINLIKLE arama YAPMADAN cevap verme.
- Besin girisi oldugunda KAL, KARB, LIF, PROT, YAG ve GI alanlarinin HEPSINI doldur.
- GI (Glisemik Indeks) her besin icin MUTLAKA hesaplanmali.
- TUTARLILIK KURALI: Yorumda yazdigin rakamlar ile JSON'daki sayisal degerler BIREBIR ayni olmali.
- Her besini AYRI AYRI hesapla ve toplami goster.
- Turkce yaz.
- JSON disinda hicbir sey yazma.
- Sayisal degerler sayi olsun, string degil.
- GERİ AL KURALI: "Geri al", "iptal et", "öncekine dön", "geri yükle" gibi komutlarda islem:"geriAl" döndür. Başka islem YAPMA, hesaplama YAPMA.
- MİKTAR KURALI: detay alaninda MIKTAR HER ZAMAN belirtilmeli. Kullanici miktar vermemisse tipik Turk porsiyonunu tahmin et ve yaz. Ornekler: "Makarna 200g", "Ayran 200ml", "Baklava 1 dilim". Yorumda "X gram/ml olarak hesapladim" seklinde belirt. "Az/biraz/kucuk" icin tipik porsiyonun 1/2-2/3'u; "Bol/buyuk/cok" icin 1.5-2x'i kullan.
- BESINLER KURALI: Girisde birden fazla BESIN varsa her besini AYRI AYRI "besinler" dizisine ekle (insülin ve KS dahil ETME, sadece besinler). Tek besin ise "besinler" gerek yok. Besin ismine miktari da yaz (ornegin "özerhisar ayran 245ml", "et döner dürüm standart lavaş 1 adet").
- KAYNAK VE GUVEN KURALI (islem:"ekle" icin ZORUNLU - mutlaka doldur, bos birakma):
  * Google Search / web_search kullandiysan: kaynak="web_arama:domain.com" (ornegin "web_arama:burgerking.com.tr"), guven resmi site ise "yuksek", genel site ise "orta"
  * Kendi egitim verisinden/tahminden hesapladiysan: kaynak="ai_hesaplama", guven="dusuk"
  * Ikisinden biri her zaman secilmeli, kaynak ve guven alanlari ASLA null veya eksik olmamali
- T1D KURALI: Kullanici T1D hastasi, HER ZAMAN insulin kullaniyor. "Insulin kullaniyorsan" veya "insulin kullaniyorsa" gibi KOSULLU dil ASLA kullanma. Direkt "kac unite yaptin?" veya "bolusu ne kadardi?" seklinde sor.
- BOLUS KURALI: Karbonhidrat iceren bir ogun girildiginde ve o ogun icin tabloda insulin (ins) degeri YOKSA, yorumun sonunda mutlaka "Bu ogun icin kac unite bolus yaptin?" diye sor.`;
}

async function claudeIleIsle(metin, foto, baglamVerisi) {
    const { profil, gunlukKayitlar, mesajGecmisi, gecmisOzetler } = baglamVerisi;

    if (profil.apiSaglayici === 'gemini') {
        return geminiIleIsle(metin, foto, baglamVerisi);
    }

    // Claude API
    const icerik = [];

    if (foto) {
        const base64 = await dosyayiBase64Yap(foto);
        icerik.push({
            type: 'image',
            source: { type: 'base64', media_type: foto.type, data: base64 }
        });
    }

    if (metin) icerik.push({ type: 'text', text: metin });

    const markalar = /burger king|mcdonald|kfc|starbucks|domino|popeyes|eti |ulker|nestle|pinar|sutas|dido|canga|algida|magnum|coca.?cola|pepsi|fanta|sprite/i;
    if (metin && markalar.test(metin)) {
        icerik.push({ type: 'text', text: `[Sistem Uyarisi: Bu giris marka/restoran urunu iceriyor. MUTLAKA web_search kullanarak gercek besin degerlerini bul.]` });
    }

    icerik.push({ type: 'text', text: `[Sistem: Mevcut saat ${simdikiSaat()}, Tarih: ${bugunTarih()}]` });

    const mesajlar = [...mesajGecmisi];
    mesajlar.push({ role: 'user', content: icerik });

    const istek = {
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system: sistemPromptuOlustur(profil, gunlukKayitlar, gecmisOzetler),
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
        messages: mesajlar
    };

    let yanit;
    let denemeSayisi = 0;
    while (denemeSayisi < 3) {
        yanit = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': profil.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify(istek)
        });
        if (yanit.status === 429) {
            denemeSayisi++;
            if (denemeSayisi < 3) {
                await new Promise(r => setTimeout(r, denemeSayisi * 15000));
                continue;
            }
        }
        break;
    }

    if (!yanit.ok) throw new Error(`Claude API Hatasi (${yanit.status}): ${await yanit.text()}`);

    const yanitVerisi = await yanit.json();

    let webSearchKullanildi = false;
    for (const blok of yanitVerisi.content) {
        if (blok.type === 'server_tool_use' || blok.type === 'tool_use') {
            console.log('🔍 Web search kullanildi:', blok);
            webSearchKullanildi = true;
        }
    }
    if (!webSearchKullanildi) console.log('⚠️ Web search KULLANILMADI');

    let jsonMetin = '';
    for (const blok of yanitVerisi.content) {
        if (blok.type === 'text') jsonMetin += blok.text;
    }
    jsonMetin = jsonMetin.replace(/<cite[^>]*>|<\/cite>/g, '');

    const sonuc = jsonParseLenient(jsonMetin);

    const yeniGecmis = [...mesajGecmisi];
    yeniGecmis.push({ role: 'user', content: icerik });
    yeniGecmis.push({ role: 'assistant', content: yanitVerisi.content });
    while (yeniGecmis.length > 10) yeniGecmis.shift();

    sonuc.mesajGecmisi = yeniGecmis;
    return sonuc;
}

async function geminiIleIsle(metin, foto, baglamVerisi) {
    const { profil, gunlukKayitlar, mesajGecmisi, gecmisOzetler } = baglamVerisi;

    // Mevcut mesaj gecmisini Gemini formatina cevir (Claude formatindan farkliysa temizle)
    const geminiGecmis = [];
    for (const msg of mesajGecmisi) {
        // Claude formatinda content array olabilir, Gemini parts bekliyor
        // parts field yoksa veya bossa API hatasi verebilir - skip et
        if ((msg.role === 'user' || msg.role === 'model') && Array.isArray(msg.parts) && msg.parts.length > 0) {
            geminiGecmis.push(msg);
        }
        // Claude 'assistant' rolunu atla (format uyumsuz)
    }

    // Yeni kullanici mesajini olustur
    const parts = [];

    if (foto) {
        const base64 = await dosyayiBase64Yap(foto);
        parts.push({ inlineData: { mimeType: foto.type, data: base64 } });
    }

    if (metin) parts.push({ text: metin });

    const markalar = /burger king|mcdonald|kfc|starbucks|domino|popeyes|eti |ulker|nestle|pinar|sutas|dido|canga|algida|magnum|coca.?cola|pepsi|fanta|sprite/i;
    if (metin && markalar.test(metin)) {
        parts.push({ text: `[Sistem Uyarisi: Bu giris marka/restoran urunu iceriyor. MUTLAKA Google Search kullanarak gercek besin degerlerini bul.]` });
    }

    parts.push({ text: `[Sistem: Mevcut saat ${simdikiSaat()}, Tarih: ${bugunTarih()}]` });

    const contents = [...geminiGecmis, { role: 'user', parts }];

    const istek = {
        contents,
        systemInstruction: { parts: [{ text: sistemPromptuOlustur(profil, gunlukKayitlar, gecmisOzetler) }] },
        tools: [{ googleSearch: {} }],
        generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192
        }
    };

    let yanit;
    let denemeSayisi = 0;
    while (denemeSayisi < 3) {
        yanit = await fetch(`${GEMINI_API_URL}?key=${profil.geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(istek)
        });

        if (yanit.status === 429) {
            denemeSayisi++;
            if (denemeSayisi < 3) {
                await new Promise(r => setTimeout(r, denemeSayisi * 15000));
                continue;
            }
        }
        break;
    }

    if (!yanit.ok) {
        const hataMetin = await yanit.text();
        throw new Error(`Gemini API Hatasi (${yanit.status}): ${hataMetin}`);
    }

    const yanitVerisi = await yanit.json();

    if (!yanitVerisi.candidates || yanitVerisi.candidates.length === 0) {
        throw new Error('Gemini bos yanit dondu');
    }

    const candidate = yanitVerisi.candidates[0];

    // Grounding kullanildi mi kontrol et
    if (candidate.groundingMetadata) {
        console.log('🔍 Gemini Google Search kullanildi');
    } else {
        console.log('⚠️ Gemini Google Search KULLANILMADI');
    }

    const jsonMetin = (candidate.content.parts || [])
        .map(p => p.text || '')
        .join('');

    const sonuc = jsonParseLenient(jsonMetin);

    // Mesaj gecmisini Gemini formatinda guncelle
    const yeniGecmis = [...geminiGecmis];
    yeniGecmis.push({ role: 'user', parts });
    yeniGecmis.push({ role: 'model', parts: candidate.content.parts });
    while (yeniGecmis.length > 10) yeniGecmis.shift();

    sonuc.mesajGecmisi = yeniGecmis;
    return sonuc;
}

function jsonParseLenient(metin) {
    try {
        return JSON.parse(metin);
    } catch (_) {}

    const jsonBlok = metin.match(/```json?\s*([\s\S]*?)```/);
    if (jsonBlok) {
        try { return JSON.parse(jsonBlok[1].trim()); } catch (_) {}
    }

    const basla = metin.indexOf('{');
    const son = metin.lastIndexOf('}');
    if (basla !== -1 && son !== -1) {
        try { return JSON.parse(metin.slice(basla, son + 1)); } catch (_) {}
    }

    return { islem: 'sadeceMesaj', yorum: metin, bildirim: 'AI yaniti islendi' };
}

function dosyayiBase64Yap(dosya) {
    return new Promise((resolve, reject) => {
        const okuyucu = new FileReader();
        okuyucu.onload = () => resolve(okuyucu.result.split(',')[1]);
        okuyucu.onerror = reject;
        okuyucu.readAsDataURL(dosya);
    });
}
