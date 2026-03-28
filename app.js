// ============================================
// METABOLIK MUHENDISLIK PANELI - ANA UYGULAMA
// ============================================

// --- Global Durum ---
const durum = {
    profil: {
        isim: '',
        cinsiyet: '',
        dogumTarihi: '',
        boy: 0,
        kilo: 0,
        apiKey: '',
        geminiKey: '',
        apiSaglayici: 'gemini',
        supabaseUrl: '',
        supabaseKey: ''
    },
    gunlukKayitlar: [],  // Bugune ait satirlar
    gunId: null,         // Acik gunun ID'si
    sonGirisSaati: null,  // 6 dk kurali icin
    sonGirisZamani: null, // 4 saat kurali icin (timestamp)
    aiMesajGecmisi: [],  // AI baglam icin
    seciliFoto: null,     // Eklenmis fotograf
    logMesajlari: [],     // Islem log kayitlari
    geriAlYigini: [],     // Undo stack (max 10)
    modalAcikIndex: -1,   // Detay modalinda acik olan satirIndex
    gorunenTarih: null    // Gosterilen gun (null = bugun)
};

// --- Sayfa Yukleme ---
document.addEventListener('DOMContentLoaded', () => {
    durum.sonGirisZamani = parseInt(localStorage.getItem('mmp_son_giris_zamani')) || null;
    profilYukle();
    gunlukVerileriYukle();
    olaylariDinle();
    modGuncelle();
    tabloGuncelle();
    ozetKartlariniGuncelle();
    tarihNavGuncelle();
    saatiGuncelle();
    swKaydet();
});

// --- Service Worker ---
function swKaydet() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('Service Worker kayitli'))
            .catch(err => console.log('SW kayit hatasi:', err));
    }
}

// --- Profil Yonetimi ---
function profilYukle() {
    const kayitli = localStorage.getItem('mmp_profil');
    if (kayitli) {
        Object.assign(durum.profil, JSON.parse(kayitli));
    }
    // config.js her zaman uygulansın (yeni key'ler için)
    if (typeof VARSAYILAN_PROFIL !== 'undefined' && !kayitli) {
        Object.assign(durum.profil, VARSAYILAN_PROFIL);
    }
    if (typeof VARSAYILAN_API_KEY !== 'undefined' && VARSAYILAN_API_KEY) {
        durum.profil.apiKey = VARSAYILAN_API_KEY;
    }
    if (typeof VARSAYILAN_GEMINI_KEY !== 'undefined' && VARSAYILAN_GEMINI_KEY) {
        durum.profil.geminiKey = VARSAYILAN_GEMINI_KEY;
    }
    if (typeof VARSAYILAN_API_SAGLAYICI !== 'undefined' && VARSAYILAN_API_SAGLAYICI) {
        durum.profil.apiSaglayici = VARSAYILAN_API_SAGLAYICI;
    }
    if (typeof VARSAYILAN_SUPABASE !== 'undefined') {
        durum.profil.supabaseUrl = VARSAYILAN_SUPABASE.url;
        durum.profil.supabaseKey = VARSAYILAN_SUPABASE.key;
    } else if (!durum.profil.supabaseUrl) {
        // config.js yoksa (GitHub Pages vb.) varsayilan Supabase baglan
        durum.profil.supabaseUrl = 'https://cjpeyxnkragcqckegiry.supabase.co';
        durum.profil.supabaseKey = 'sb_publishable_ZounC462zKHD_aHDc2PSgQ_SYTfBYVB';
    }
    localStorage.setItem('mmp_profil', JSON.stringify(durum.profil));
    profilBilgiGuncelle();

    // İlk kurulum uyarisi: API key yoksa ayarlara yonlendir
    if (!durum.profil.geminiKey && !durum.profil.apiKey) {
        setTimeout(() => {
            const bildirim = document.getElementById('son-bildirim');
            bildirim.innerHTML = '⚠️ AI için <a href="#" onclick="sayfaGoster(\'sayfa-ayarlar\');return false;" style="color:#ffd700;text-decoration:underline;">Ayarlar</a>\'dan Gemini API key gir';
            bildirim.className = 'bildirim uyari aktif';
            setTimeout(() => bildirim.classList.remove('aktif'), 8000);
        }, 1000);
    }

    // Supabase baglantisi varsa baslat ve senkronize et
    if (durum.profil.supabaseUrl && durum.profil.supabaseKey) {
        supabaseBaslat(durum.profil.supabaseUrl, durum.profil.supabaseKey);
        // CDN dinamik yuklenebilir, client hazir olunca senkronize et
        const senkronizasyonBekle = setInterval(() => {
            if (supabaseIstemci) {
                clearInterval(senkronizasyonBekle);
                logYukle();
                gunlukVerileriYukleSupabase();
            }
        }, 500);
        // 10 saniye sonra denemeyi birak
        setTimeout(() => clearInterval(senkronizasyonBekle), 10000);
    }
}

function profilKaydet() {
    durum.profil.isim = document.getElementById('ayar-isim').value.trim();
    durum.profil.cinsiyet = document.getElementById('ayar-cinsiyet').value;
    durum.profil.dogumTarihi = document.getElementById('ayar-dogum').value;
    durum.profil.boy = parseFloat(document.getElementById('ayar-boy').value) || 0;
    durum.profil.kilo = parseFloat(document.getElementById('ayar-kilo').value) || 0;
    durum.profil.apiKey = document.getElementById('ayar-api-key').value.trim();
    durum.profil.geminiKey = document.getElementById('ayar-gemini-key').value.trim();
    durum.profil.apiSaglayici = document.getElementById('ayar-api-saglayici').value;
    durum.profil.supabaseUrl = document.getElementById('ayar-supa-url').value.trim();
    durum.profil.supabaseKey = document.getElementById('ayar-supa-key').value.trim();

    localStorage.setItem('mmp_profil', JSON.stringify(durum.profil));
    profilBilgiGuncelle();
    modGuncelle();

    // Supabase baglantisini guncelle
    if (durum.profil.supabaseUrl && durum.profil.supabaseKey) {
        supabaseBaslat(durum.profil.supabaseUrl, durum.profil.supabaseKey);
    }

    sayfaGoster('sayfa-ana');
    bildirimGoster('Ayarlar kaydedildi');
}

function profilBilgiGuncelle() {
    const p = durum.profil;
    const el = document.getElementById('profil-bilgi');
    if (p.isim) {
        const bugun = new Date().toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        const parcalar = [p.isim.toUpperCase()];
        if (p.boy) parcalar.push(p.boy + ' CM');
        if (p.kilo) parcalar.push(p.kilo + ' KG');
        parcalar.push(bugun.toUpperCase());
        el.textContent = parcalar.join(' | ');
    } else {
        el.textContent = 'Profil ayarlanmadi';
    }
}

function ayarFormuDoldur() {
    const p = durum.profil;
    document.getElementById('ayar-isim').value = p.isim;
    document.getElementById('ayar-cinsiyet').value = p.cinsiyet;
    document.getElementById('ayar-dogum').value = p.dogumTarihi;
    document.getElementById('ayar-boy').value = p.boy || '';
    document.getElementById('ayar-kilo').value = p.kilo || '';
    document.getElementById('ayar-api-key').value = p.apiKey;
    document.getElementById('ayar-gemini-key').value = p.geminiKey || '';
    document.getElementById('ayar-api-saglayici').value = p.apiSaglayici || 'gemini';
    document.getElementById('ayar-supa-url').value = p.supabaseUrl;
    document.getElementById('ayar-supa-key').value = p.supabaseKey;
}

function yasHesapla() {
    if (!durum.profil.dogumTarihi) return 0;
    const dogum = new Date(durum.profil.dogumTarihi);
    const bugun = new Date();
    let yas = bugun.getFullYear() - dogum.getFullYear();
    const ayFark = bugun.getMonth() - dogum.getMonth();
    if (ayFark < 0 || (ayFark === 0 && bugun.getDate() < dogum.getDate())) {
        yas--;
    }
    return yas;
}

function bmrHesapla() {
    const p = durum.profil;
    const yas = yasHesapla();
    if (!p.boy || !p.kilo || !yas) return 0;
    // Mifflin-St Jeor
    if (p.cinsiyet === 'erkek') {
        return Math.round(10 * p.kilo + 6.25 * p.boy - 5 * yas + 5);
    } else {
        return Math.round(10 * p.kilo + 6.25 * p.boy - 5 * yas - 161);
    }
}

// --- Sayfa Gecisleri ---
function sayfaGoster(sayfaId) {
    document.querySelectorAll('.sayfa').forEach(s => {
        s.classList.remove('aktif');
        s.style.display = '';
    });
    const hedef = document.getElementById(sayfaId);
    if (hedef) {
        hedef.classList.add('aktif');
    }
    // Giris alanini sadece ana sayfada goster
    const girisAlani = document.querySelector('.giris-alani');
    if (girisAlani) {
        girisAlani.classList.toggle('gizli', sayfaId !== 'sayfa-ana');
    }
}

// --- Mod Gosterge ---
function modGuncelle() {
    const el = document.getElementById('mod-gosterge');
    const aktifKey = durum.profil.apiSaglayici === 'gemini' ? durum.profil.geminiKey : durum.profil.apiKey;
    if (aktifKey) {
        const saglayici = durum.profil.apiSaglayici === 'gemini' ? 'Gemini' : 'Claude';
        el.textContent = 'AI Mod (' + saglayici + ')';
        el.classList.add('ai-aktif');
    } else {
        el.textContent = 'Manuel Mod';
        el.classList.remove('ai-aktif');
    }
}

// --- Saat ---
function saatiGuncelle() {
    // Her dakika profil bilgisini guncelle (tarih icin)
    setInterval(() => {
        profilBilgiGuncelle();
    }, 60000);
}

function simdikiSaat() {
    return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// --- Gunluk Veriler (localStorage) ---
function bugunTarih() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const g = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${g}`;
}

// Son giristen 4 saat gecmediyse o gunun tarihini dondur
function kayitTarihi() {
    if (!durum.sonGirisZamani) return bugunTarih();
    const gecenMs = Date.now() - durum.sonGirisZamani;
    if (gecenMs < 4 * 60 * 60 * 1000) {
        const d = new Date(durum.sonGirisZamani);
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const g = String(d.getDate()).padStart(2, '0');
        return `${d.getFullYear()}-${m}-${g}`;
    }
    return bugunTarih();
}

function aktifTarih() {
    return durum.gorunenTarih || bugunTarih();
}

function bugunMu() {
    return aktifTarih() === bugunTarih();
}

function tarihNavGuncelle() {
    const tarih = aktifTarih();
    const label = document.getElementById('aktif-tarih-label');
    const sonrakiBtn = document.getElementById('sonraki-gun');

    if (bugunMu()) {
        label.textContent = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        label.classList.remove('gecmis-gun');
        sonrakiBtn.disabled = true;
    } else {
        const d = new Date(tarih + 'T00:00:00');
        label.textContent = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        label.classList.add('gecmis-gun');
        sonrakiBtn.disabled = false;
    }

    // Gecmis modda temizle/geri al gizle — giris alani her zaman gorunur
    const temizleBtn = document.getElementById('btn-temizle-ana');
    const geriAlBtn = document.getElementById('geri-al-btn');
    if (temizleBtn) temizleBtn.hidden = !bugunMu();
    if (geriAlBtn) geriAlBtn.hidden = !bugunMu();
}

async function gunuGoster(tarih) {
    durum.gorunenTarih = (tarih === bugunTarih()) ? null : tarih;

    if (bugunMu()) {
        // Bugune don — normal akis
        gunlukVerileriYukle();
        tabloGuncelle();
        ozetKartlariniGuncelle();
        logYukle();
    } else {
        // Gecmis gun — Supabase'den yukle, read-only
        durum.gunlukKayitlar = [];
        tabloGuncelle();
        ozetKartlariniGuncelle();
        const kayitlar = await supabaseKayitlariYukle(tarih);
        durum.gunlukKayitlar = kayitlar.map(k => ({ ...k, supabaseId: k.id }));
        tabloGuncelle();
        ozetKartlariniGuncelle();
    }

    tarihNavGuncelle();
}

function tariheDayEkle(tarihStr, gun) {
    const [y, m, d] = tarihStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d + gun);
    const ay = String(dt.getMonth() + 1).padStart(2, '0');
    const g = String(dt.getDate()).padStart(2, '0');
    return `${dt.getFullYear()}-${ay}-${g}`;
}

async function gunuGosterOnceki() {
    const btn = document.getElementById('onceki-gun');
    btn.disabled = true;
    await gunuGoster(tariheDayEkle(aktifTarih(), -1));
    btn.disabled = false;
}

async function gunuGosterSonraki() {
    const yeniTarih = tariheDayEkle(aktifTarih(), 1);
    if (yeniTarih <= bugunTarih()) {
        const btn = document.getElementById('sonraki-gun');
        btn.disabled = true;
        await gunuGoster(yeniTarih);
        // tarihNavGuncelle() zaten disabled durumunu set edecek
    }
}

function gunlukVerileriYukle() {
    const anahtar = 'mmp_gun_' + kayitTarihi();
    const kayitli = localStorage.getItem(anahtar);
    if (kayitli) {
        durum.gunlukKayitlar = JSON.parse(kayitli);
    } else {
        durum.gunlukKayitlar = [];
    }
    // Metabolik hafizayi yukle
    hafizaYukle();
}

function gunlukVerileriKaydet() {
    const anahtar = 'mmp_gun_' + kayitTarihi();
    localStorage.setItem(anahtar, JSON.stringify(durum.gunlukKayitlar));
}

async function gunlukVerileriYukleSupabase() {
    const kayitlar = await supabaseKayitlariYukle(kayitTarihi());
    if (kayitlar && kayitlar.length > 0) {
        // Supabase'den gelen kayitlara supabaseId ekle
        durum.gunlukKayitlar = kayitlar.map(k => ({ ...k, supabaseId: k.id }));
        gunlukVerileriKaydet();
        tabloGuncelle();
        ozetKartlariniGuncelle();
        console.log('Gunluk veriler Supabase\'den yuklendi:', kayitlar.length, 'kayit');
    }
}

// --- Yerel Besin Veritabani ---
// Duzeltilen besinler buraya kaydedilir, ayni besin tekrar girildiginde dogru degerler kullanilir
function besinVeritabaniYukle() {
    const kayitli = localStorage.getItem('mmp_besin_db');
    return kayitli ? JSON.parse(kayitli) : {};
}

function besinVeritabaniKaydet(db) {
    localStorage.setItem('mmp_besin_db', JSON.stringify(db));
}

function besinVeritabanineEkle(isim, degerler) {
    const db = besinVeritabaniYukle();
    // Miktari isimden ayir, taban isim ayri sakla
    const miktar = miktarCikar(isim.toLowerCase().trim());
    const baseIsim = (miktar.deger ? miktar.base : isim.toLowerCase().trim()).trim();
    if (!baseIsim) return;

    // 100g veya 100ml'ye normalize et (standart referans)
    let kal = degerler.kal || 0;
    let karb = degerler.karb || 0;
    let lif = degerler.lif || 0;
    let prot = degerler.prot || 0;
    let yag = degerler.yag || 0;
    const refBirim = miktar.birim || 'g';

    if (miktar.deger && miktar.deger > 0 && miktar.deger !== 100) {
        const oran = 100 / miktar.deger;
        kal  = Math.round(kal  * oran);
        karb = Math.round(karb * oran * 10) / 10;
        lif  = Math.round(lif  * oran * 10) / 10;
        prot = Math.round(prot * oran * 10) / 10;
        yag  = Math.round(yag  * oran * 10) / 10;
    }

    db[baseIsim] = {
        isim: baseIsim,
        kal, karb, lif, prot, yag,
        gi: degerler.gi || 0,
        refMiktar: 100,     // her zaman 100
        refBirim: refBirim, // g veya ml
        guncellenmeTarihi: new Date().toISOString()
    };
    besinVeritabaniKaydet(db);
    console.log('Besin veritabanina kaydedildi:', baseIsim, db[baseIsim]);
    supabaseBesinKaydet(db[baseIsim]);
    logEkle('sistem', baseIsim + ' besin veritabanina kaydedildi');
}

// Türkçe ölçü birimleri ml/g karşılıkları
const OLCU_TABLOSU = {
    'su bardagi': 200, 'su bardaği': 200,
    'cay bardagi': 120, 'cay bardaği': 120,
    'yemek kasigi': 15, 'yemek kasıgı': 15,
    'tatli kasigi': 7, 'tatli kasıgı': 7,
    'cay kasigi': 3, 'cay kasıgı': 3,
    'fincan': 150, 'kase': 250
};

function miktarCikar(isim) {
    const s = isim.toLowerCase().trim();
    // Sayısal: "245ml", "100 g"
    const sayisal = s.match(/(\d+(?:[,.]\d+)?)\s*(g|gr|gram|ml|mg|kg|l|lt)\b/i);
    if (sayisal) {
        return {
            deger: parseFloat(sayisal[1].replace(',', '.')),
            birim: sayisal[2].toLowerCase().replace('gr','g').replace('gram','g').replace('lt','l'),
            base: s.replace(sayisal[0], '').trim()
        };
    }
    // Türkçe ölçüler: "bir su bardağı", "2 yemek kaşığı"
    for (const [olcu, ml] of Object.entries(OLCU_TABLOSU)) {
        const re = new RegExp(`(bir|\\d+)\\s*${olcu}`, 'i');
        const m = s.match(re);
        if (m) {
            const adet = m[1] === 'bir' ? 1 : parseInt(m[1]);
            return { deger: adet * ml, birim: 'ml', base: s.replace(m[0], '').trim() };
        }
    }
    return { deger: null, birim: null, base: s };
}

function besinBirimKontrolEt(metin) {
    // Kati besin (DB=g) ml ile girilmisse uyari dondurir
    // Sivi besin (DB=ml) gram ile girilmesi izinli, kontrol etme
    const db = besinVeritabaniYukle();
    const sorgu = miktarCikar(metin.toLowerCase().trim());
    if (!sorgu.deger || !sorgu.birim) return null;
    const sivi = ['ml', 'l', 'lt'];
    const kati = ['g', 'kg', 'mg'];
    if (!sivi.includes(sorgu.birim)) return null;  // sorgu ml degil, sorun yok
    const sorguBase = (sorgu.base || metin).toLowerCase().trim();
    for (const [anahtar, deger] of Object.entries(db)) {
        if (!deger.refBirim || !kati.includes(deger.refBirim)) continue;  // DB g degil, geç
        if (anahtar.includes(sorguBase) || sorguBase.includes(anahtar)) {
            return { isim: anahtar, dbBirim: deger.refBirim };
        }
    }
    return null;
}

function birimUyumlu(b1, b2) {
    const sivi = ['ml', 'l', 'lt'];
    const kati = ['g', 'kg', 'mg'];
    if (sivi.includes(b1) && sivi.includes(b2)) return true;
    if (kati.includes(b1) && kati.includes(b2)) return true;
    // Sivi besini gram ile girmek izinli (1ml = 1g): DB=ml, sorgu=g
    if (sivi.includes(b1) && kati.includes(b2)) return true;
    // DB=g, sorgu=ml: izin yok (kati besini ml ile giremezsin)
    return false;
}

function miktarMlYaCevir(deger, birim) {
    if (birim === 'l' || birim === 'lt') return deger * 1000;
    if (birim === 'kg') return deger * 1000;
    if (birim === 'mg') return deger / 1000;
    return deger;
}

function besinVeritabanindaAra(metin) {
    const db = besinVeritabaniYukle();
    const aramaMetni = metin.toLowerCase().trim();
    const eslesen = [];

    const miktarKelime = /^\d+([,.]\d+)?$|^(g|gr|gram|ml|mg|kg|l|lt|adet|kasik|tane|dilim|kase|kupa|fincan|bardak|porsiyon|paket|kutu|sise)$/i;

    // Sorgudaki miktari cikar — taban isimle eslestir, sonra orantila
    const sorguMiktar = miktarCikar(aramaMetni);
    const sorguBase = sorguMiktar.deger ? sorguMiktar.base : aramaMetni;

    function orantila(deger, oran) {
        return {
            ...deger, isim: metin,
            kal: Math.round(deger.kal * oran),
            karb: Math.round((deger.karb || 0) * oran * 10) / 10,
            lif: Math.round((deger.lif || 0) * oran * 10) / 10,
            prot: Math.round((deger.prot || 0) * oran * 10) / 10,
            yag: Math.round((deger.yag || 0) * oran * 10) / 10
        };
    }

    // 1) Taban isim eslesmesi (yeni sema: refMiktar ayri kolonda)
    for (const [anahtar, deger] of Object.entries(db)) {
        let eslesMi = false;

        if (anahtar.includes(sorguBase)) {
            // DB key ⊇ sorguBase — DB'de ekstra marka kelimesi olmamali
            const sorguKelimeleri = sorguBase.split(/\s+/);
            const dbEkstra = anahtar.split(/\s+/)
                .filter(k => !sorguKelimeleri.some(sk => k.startsWith(sk.substring(0, 3)) || sk.startsWith(k.substring(0, 3))))
                .filter(k => k.length > 1 && !miktarKelime.test(k));
            eslesMi = dbEkstra.length === 0;
        } else if (sorguBase.includes(anahtar)) {
            // sorguBase ⊇ DB key — sorguda ekstra marka kelimesi olmamali
            const dbKelimeleri = anahtar.split(/\s+/);
            const sorguEkstra = sorguBase.split(/\s+/)
                .filter(k => !dbKelimeleri.some(dk => k.startsWith(dk.substring(0, 3)) || dk.startsWith(k.substring(0, 3))))
                .filter(k => k.length > 1 && !miktarKelime.test(k));
            eslesMi = sorguEkstra.length === 0;
        }

        if (!eslesMi) continue;

        // Orantilama: yeni sema (refMiktar) veya eski sema (isimde miktar gomulu)
        if (deger.refMiktar && sorguMiktar.deger && birimUyumlu(deger.refBirim, sorguMiktar.birim)) {
            const oran = miktarMlYaCevir(sorguMiktar.deger, sorguMiktar.birim) /
                         miktarMlYaCevir(deger.refMiktar, deger.refBirim);
            eslesen.push(orantila(deger, oran));
        } else if (!deger.refMiktar) {
            // Eski sema: isimde miktar gomulu olabilir
            const dbMiktar = miktarCikar(anahtar);
            if (dbMiktar.deger && sorguMiktar.deger && birimUyumlu(dbMiktar.birim, sorguMiktar.birim)) {
                const oran = miktarMlYaCevir(sorguMiktar.deger, sorguMiktar.birim) /
                             miktarMlYaCevir(dbMiktar.deger, dbMiktar.birim);
                eslesen.push(orantila(deger, oran));
            } else {
                eslesen.push(deger);
            }
        }
        // Yeni sema + birim uyumsuz (DB=g, sorgu=ml): eslesen'a ekleme, AI hesaplayacak
    }

    // 2) Fuzzy: kelime bazli eslesme (yazim hatalari icin)
    if (eslesen.length === 0) {
        const aramaKelimeleri = sorguBase.split(/\s+/).filter(k => k.length > 2);
        for (const [anahtar, deger] of Object.entries(db)) {
            const dbKelimeleri = anahtar.split(/\s+/);
            let eslesme = 0;
            for (const ak of aramaKelimeleri) {
                for (const dk of dbKelimeleri) {
                    if (dk.length >= 3 && ak.length >= 3 && dk.substring(0, 3) === ak.substring(0, 3)) {
                        eslesme++;
                        break;
                    }
                }
            }
            if (eslesme >= 2 && eslesme >= aramaKelimeleri.length * 0.4) {
                eslesen.push(deger);
            }
        }
    }

    return eslesen;
}

// --- Tablo Islemleri ---
async function satirEkle(kayit) {
    const yeniSaat = kayit.saat || simdikiSaat();

    // Sirali insertion pozisyonunu bul (zamana gore)
    let insertIdx = durum.gunlukKayitlar.length;
    for (let i = durum.gunlukKayitlar.length - 1; i >= 0; i--) {
        if (saatFarkiDakika(durum.gunlukKayitlar[i].saat, yeniSaat) >= 0) {
            insertIdx = i + 1;
            break;
        }
        insertIdx = i;
    }

    // 6 dakika kurali: zaman-komsу onceki kaydi kontrol et
    const oncekiKayit = insertIdx > 0 ? durum.gunlukKayitlar[insertIdx - 1] : null;
    if (oncekiKayit) {
        const fark = saatFarkiDakika(oncekiKayit.saat, yeniSaat);
        if (fark >= 0 && fark <= 6) {
            satirBirlestir(oncekiKayit, kayit);
            gunlukVerileriKaydet();
            if (oncekiKayit.supabaseId) {
                supabaseKayitGuncelle(oncekiKayit.supabaseId, oncekiKayit);
            }
            tabloGuncelle();
            ozetKartlariniGuncelle();
            return;
        }
    }

    // Sirali konuma ekle
    durum.gunlukKayitlar.splice(insertIdx, 0, kayit);
    gunlukVerileriKaydet();
    tabloGuncelle();
    ozetKartlariniGuncelle();
    // 4 saat kuralı: son giris zamani guncelle
    durum.sonGirisZamani = Date.now();
    localStorage.setItem('mmp_son_giris_zamani', durum.sonGirisZamani);
    // Supabase'e kaydet, donus id'yi sakla
    const data = await supabaseKayitEkle(kayit, kayitTarihi());
    if (data && data[0]) {
        kayit.supabaseId = data[0].id;
        gunlukVerileriKaydet();
    }
    // Undo stack'e kaydet
    if (durum.geriAlYigini.length >= 10) durum.geriAlYigini.shift();
    durum.geriAlYigini.push({ tip: 'ekle', supabaseId: kayit.supabaseId });
    geriAlButonGuncelle();
}

function saatFarkiDakika(saat1, saat2) {
    // "HH:MM" formatinda iki saat arasindaki farki dakika olarak hesapla
    if (!saat1 || !saat2) return 999;
    const [s1, d1] = saat1.split(':').map(Number);
    const [s2, d2] = saat2.split(':').map(Number);
    return (s2 * 60 + d2) - (s1 * 60 + d1);
}

function satirBirlestir(mevcut, yeni) {
    // Bilesenler listesi: her kaynagi ayri sakla
    if (!mevcut.bilesenler) {
        mevcut.bilesenler = [{ detay: mevcut.detay, kal: mevcut.kal, karb: mevcut.karb, lif: mevcut.lif, prot: mevcut.prot, yag: mevcut.yag, ins: mevcut.ins, gi: mevcut.gi, ks: mevcut.ks, kaynak: mevcut.kaynak }];
    }
    mevcut.bilesenler.push({ detay: yeni.detay, kal: yeni.kal, karb: yeni.karb, lif: yeni.lif, prot: yeni.prot, yag: yeni.yag, ins: yeni.ins, gi: yeni.gi, ks: yeni.ks, kaynak: yeni.kaynak });

    // Detay birlestir
    if (yeni.detay) {
        mevcut.detay = mevcut.detay
            ? mevcut.detay + ' + ' + yeni.detay
            : yeni.detay;
    }

    // GI: agirlikli ortalama (karbonhidrat bazli)
    if (yeni.gi && yeni.karb) {
        const mevcutKarb = mevcut.karb || 0;
        const mevcutGi = mevcut.gi || 0;
        const yeniKarb = yeni.karb || 0;
        const yeniGi = yeni.gi || 0;
        const toplamKarb = mevcutKarb + yeniKarb;
        if (toplamKarb > 0) {
            mevcut.gi = Math.round((mevcutGi * mevcutKarb + yeniGi * yeniKarb) / toplamKarb);
        }
    } else if (yeni.gi && !mevcut.gi) {
        mevcut.gi = yeni.gi;
    }

    // Sayisal degerleri topla
    ['kal', 'karb', 'lif', 'prot', 'yag'].forEach(alan => {
        if (yeni[alan]) {
            mevcut[alan] = (mevcut[alan] || 0) + yeni[alan];
        }
    });

    // Insulin topla
    if (yeni.ins) {
        mevcut.ins = (mevcut.ins || 0) + yeni.ins;
    }

    // KS: son girilen gecerli
    if (yeni.ks) mevcut.ks = yeni.ks;

    // Gorsel
    if (yeni.gorselUrl) mevcut.gorselUrl = yeni.gorselUrl;
}

function satirGuncelle(index, yeniVeri) {
    if (index >= 0 && index < durum.gunlukKayitlar.length) {
        // Undo stack'e kaydet (Object.assign'dan ONCE)
        if (durum.geriAlYigini.length >= 10) durum.geriAlYigini.shift();
        durum.geriAlYigini.push({
            tip: 'guncelle',
            supabaseId: durum.gunlukKayitlar[index].supabaseId,
            eskiVeri: { ...durum.gunlukKayitlar[index] }
        });
        geriAlButonGuncelle();
        Object.assign(durum.gunlukKayitlar[index], yeniVeri);
        gunlukVerileriKaydet();
        tabloGuncelle();
        ozetKartlariniGuncelle();
        // Supabase'e yansit
        const kayit = durum.gunlukKayitlar[index];
        if (kayit.supabaseId) {
            supabaseKayitGuncelle(kayit.supabaseId, kayit);
        }
    }
}

function satirSil(index) {
    if (index >= 0 && index < durum.gunlukKayitlar.length) {
        // Undo stack'e kaydet (splice'dan ONCE)
        if (durum.geriAlYigini.length >= 10) durum.geriAlYigini.shift();
        durum.geriAlYigini.push({
            tip: 'sil',
            eskiKayit: { ...durum.gunlukKayitlar[index] },
            eskiIndex: index
        });
        geriAlButonGuncelle();
        const kayit = durum.gunlukKayitlar[index];
        durum.gunlukKayitlar.splice(index, 1);
        gunlukVerileriKaydet();
        tabloGuncelle();
        ozetKartlariniGuncelle();
        // Supabase'den sil
        if (kayit.supabaseId) {
            supabaseKayitSil(kayit.supabaseId);
        }
    }
}

function tabloGuncelle() {
    const govde = document.getElementById('tablo-govde');
    govde.innerHTML = '';

    durum.gunlukKayitlar.forEach((k, i) => {
        const tr = document.createElement('tr');
        tr.dataset.index = i;

        tr.innerHTML = `
            <td>${k.saat || '-'}</td>
            <td class="detay-hucre">${kayitEtiketiOlustur(k)}</td>
            <td class="sayi">${degerFormat(k.kal)}</td>
            <td class="sayi">${degerFormat(k.karb)}</td>
            <td class="sayi">${degerFormat(k.lif)}</td>
            <td class="sayi">${degerFormat(k.prot)}</td>
            <td class="sayi">${degerFormat(k.yag)}</td>
            <td class="sayi ${ksRenk(k.ks)}">${degerFormat(k.ks)}</td>
            <td class="sayi ${k.ins ? 'ins-deger' : ''}">${degerFormat(k.ins)}</td>
            <td class="sayi">${degerFormat(k.gi)}</td>
        `;

        // Satira tiklandiginda duzenleme (ileride)
        tr.addEventListener('click', () => satirTiklandi(i));
        govde.appendChild(tr);
    });

    // Toplam satirini guncelle
    toplamGuncelle();
}

function degerFormat(deger) {
    if (deger === null || deger === undefined || deger === 0) return '-';
    return Number.isInteger(deger) ? deger : deger.toFixed(1);
}

function kayitEtiketiOlustur(kayit) {
    const kal = kayit.kal || 0;
    const ks = kayit.ks || 0;
    const ins = kayit.ins || 0;

    if (kal === 0) {
        if (ks > 0 && ins > 0) return 'Kan şekeri + İnsülin';
        if (ks > 0) return 'Kan şekeri ölçümü';
        if (ins > 0) return 'İnsülin dozu';
        return kayit.detay || '-';
    }

    // Manuel etiket override varsa kullan (kullanici duzeltmesi)
    let ogunAdi;
    if (kayit.etiket) {
        ogunAdi = kayit.etiket;
    } else {
        const saat = kayit.saat || '00:00';
        const parcalar = saat.split(':');
        const dakika = parseInt(parcalar[0]) * 60 + parseInt(parcalar[1] || 0);

        if (dakika >= 360 && dakika < 630) ogunAdi = 'Kahvaltı';
        else if (dakika >= 630 && dakika < 720) ogunAdi = 'Sabah ara öğünü';
        else if (dakika >= 720 && dakika < 900) ogunAdi = 'Öğle yemeği';
        else if (dakika >= 900 && dakika < 1050) ogunAdi = 'İkindi ara öğünü';
        else if (dakika >= 1050 && dakika < 1260) ogunAdi = 'Akşam yemeği';
        else ogunAdi = 'Gece atıştırması';
    }

    if (ks > 0 || ins > 0) {
        const ekler = [];
        if (ks > 0) ekler.push('KS');
        if (ins > 0) ekler.push('İns');
        return ogunAdi + ' + ' + ekler.join('+');
    }

    return ogunAdi;
}

function ksRenk(ks) {
    if (!ks) return '';
    if (ks < 70) return 'ks-dusuk';
    if (ks <= 140) return 'ks-normal';
    if (ks <= 200) return 'ks-yuksek';
    return 'ks-cok-yuksek';
}

function toplamGuncelle() {
    const toplamlar = { kal: 0, karb: 0, lif: 0, prot: 0, yag: 0, ins: 0 };

    durum.gunlukKayitlar.forEach(k => {
        toplamlar.kal += k.kal || 0;
        toplamlar.karb += k.karb || 0;
        toplamlar.lif += k.lif || 0;
        toplamlar.prot += k.prot || 0;
        toplamlar.yag += k.yag || 0;
        toplamlar.ins += k.ins || 0;
    });

    document.getElementById('t-kal').textContent = degerFormat(toplamlar.kal);
    document.getElementById('t-karb').textContent = degerFormat(toplamlar.karb);
    document.getElementById('t-lif').textContent = degerFormat(toplamlar.lif);
    document.getElementById('t-prot').textContent = degerFormat(toplamlar.prot);
    document.getElementById('t-yag').textContent = degerFormat(toplamlar.yag);
    document.getElementById('t-ins').textContent = toplamlar.ins ? toplamlar.ins + ' U' : '-';
}

// --- Ozet Kartlari ---
function ozetKartlariniGuncelle() {
    const toplamlar = { kal: 0, karb: 0, lif: 0, ins: 0 };

    durum.gunlukKayitlar.forEach(k => {
        toplamlar.kal += k.kal || 0;
        toplamlar.karb += k.karb || 0;
        toplamlar.lif += k.lif || 0;
        toplamlar.ins += k.ins || 0;
    });

    const netKarb = toplamlar.karb;
    const bmr = bmrHesapla();
    const netEnerji = bmr > 0 ? toplamlar.kal - bmr : toplamlar.kal;

    document.getElementById('toplam-kal').textContent = Math.round(toplamlar.kal) + ' kcal';
    document.getElementById('toplam-karb').textContent = degerFormat(netKarb) + ' g';
    document.getElementById('toplam-ins').textContent = toplamlar.ins ? toplamlar.ins + ' U' : '0 U';
    document.getElementById('net-enerji').textContent = Math.round(netEnerji) + ' kcal';
}

// --- Veri Girisi ---
async function veriGonder() {
    const girisEl = document.getElementById('veri-giris');
    const metin = girisEl.value.trim();
    if (!metin && !durum.seciliFoto) return;

    const gonderBtn = document.getElementById('gonder-btn');
    gonderBtn.disabled = true;
    gonderBtn.innerHTML = '<span class="yukleniyor"></span>';

    if (metin) logEkle('kullanici', metin + (durum.seciliFoto ? ' (görsel eklendi)' : ''));

    try {
        const aktifKey = durum.profil.apiSaglayici === 'gemini' ? durum.profil.geminiKey : durum.profil.apiKey;
        if (aktifKey) {
            // AI modu
            await aiIleIsle(metin, durum.seciliFoto);
        } else {
            // Manuel mod - formu ac
            manuelFormAc(metin);
        }
    } catch (hata) {
        console.error('Veri gonderme hatasi:', hata);
        bildirimGoster('Hata: ' + hata.message, 'hata');
        logEkle('hata', hata.message);
    }

    gonderBtn.disabled = false;
    gonderBtn.textContent = 'Gonder';
    girisEl.value = '';
    fotoTemizle();
}

async function aiIleIsle(metin, foto) {
    const gecmisOzetler = await supabaseOzetleriYukle(7);
    const sonuc = await claudeIleIsle(metin, foto, {
        profil: durum.profil,
        gunlukKayitlar: durum.gunlukKayitlar,
        mesajGecmisi: durum.aiMesajGecmisi,
        gecmisOzetler
    });

    console.log('📋 AI sonuc:', JSON.stringify(sonuc, null, 2));

    // Gemini bazen asil JSON'i yorum alanina string olarak koyar - bunu duzelt
    if (sonuc.islem === 'sadeceMesaj' && typeof sonuc.yorum === 'string' && sonuc.yorum.trim().startsWith('{')) {
        try {
            const icSonuc = JSON.parse(sonuc.yorum.trim());
            if (icSonuc.islem && icSonuc.islem !== 'sadeceMesaj') {
                Object.assign(sonuc, icSonuc);
                console.log('📋 AI sonuc duzeltildi (ic JSON cozumlendi):', sonuc.islem);
            }
        } catch (e) { /* JSON degil, devam et */ }
    }

    if (sonuc.islem === 'ekle') {
        const besinListesi = (sonuc.besinler && sonuc.besinler.length > 0)
            ? sonuc.besinler
            : [sonuc];

        for (let bi = 0; bi < besinListesi.length; bi++) {
            const besin = besinListesi[bi];
            const ilkBesin = bi === 0;
            await satirEkle({
                saat: besin.saat || sonuc.saat || simdikiSaat(),
                detay: besin.isim || besin.detay || sonuc.detay,
                kal: besin.kal || null,
                karb: besin.karb || null,
                lif: besin.lif || null,
                prot: besin.prot || null,
                yag: besin.yag || null,
                ks: besin.ks || (ilkBesin ? sonuc.ks : null) || null,
                ins: besin.ins || (ilkBesin ? sonuc.ins : null) || null,
                gi: besin.gi || null,
                gorselUrl: sonuc.gorselUrl || null,
                kaynak: besin.kaynak || sonuc.kaynak || 'ai_hesaplama',
                guven: besin.guven || sonuc.guven || 'dusuk'
            });
        }
        const kaynaklar = besinListesi.map(b => b.kaynak || sonuc.kaynak || 'ai_hesaplama');
        const benzersizKaynaklar = [...new Set(kaynaklar)];
        const kaynakEtiket = ' · ' + benzersizKaynaklar.map(k =>
            k.startsWith('web_arama:') ? k.split(':')[1] : 'AI tahmini'
        ).join(', ');
        const bildirimTip = besinListesi.some(b => (b.guven || sonuc.guven || 'dusuk') === 'dusuk') ? 'uyari' : 'bilgi';
        bildirimGoster((sonuc.bildirim || 'Veri eklendi') + kaynakEtiket, bildirimTip);
        logEkle('sistem', 'Tabloya eklendi: ' + (sonuc.detay || '') + (sonuc.kal ? ' (' + Math.round(sonuc.kal) + ' kcal)' : '') + kaynakEtiket);
    } else if (sonuc.islem === 'guncelle') {
        const gIdx = sonuc.satirIndex;
        if (typeof gIdx !== 'number' || gIdx < 0 || gIdx >= durum.gunlukKayitlar.length) {
            bildirimGoster('Geçersiz satır numarası. Tablo yenilendi.', 'hata');
            tabloGuncelle();
            return;
        }
        satirGuncelle(gIdx, sonuc.veri);
        bildirimGoster(sonuc.bildirim || 'Satir guncellendi');
        logEkle('sistem', sonuc.bildirim || 'Satir guncellendi');
    } else if (sonuc.islem === 'sil') {
        const sIdx = sonuc.satirIndex;
        console.log('Silme istegi - satirIndex:', sIdx, 'Toplam satir:', durum.gunlukKayitlar.length);
        if (typeof sIdx !== 'number' || sIdx < 0 || sIdx >= durum.gunlukKayitlar.length) {
            bildirimGoster('Geçersiz satır numarası. Tablo yenilendi.', 'hata');
            tabloGuncelle();
            return;
        }
        satirSil(sIdx);
        bildirimGoster(sonuc.bildirim || 'Satir silindi');
        logEkle('sistem', sonuc.bildirim || 'Satir silindi');
    } else if (sonuc.islem === 'profilGuncelle') {
        if (sonuc.kilo) {
            durum.profil.kilo = sonuc.kilo;
            localStorage.setItem('mmp_profil', JSON.stringify(durum.profil));
            profilBilgiGuncelle();
            ozetKartlariniGuncelle();
        }
        bildirimGoster(sonuc.bildirim || 'Profil guncellendi');
        logEkle('sistem', sonuc.bildirim || 'Profil guncellendi');
    } else if (sonuc.islem === 'gunuKapat') {
        gunuKapat();
    } else if (sonuc.islem === 'geriAl') {
        await geriAl();
    }

    // AI yorumunu goster
    if (sonuc.yorum) {
        aiYorumGoster(sonuc.yorum, sonuc.yorumBaslik);
    }

    // Mesaj gecmisini guncelle
    if (sonuc.mesajGecmisi) {
        durum.aiMesajGecmisi = sonuc.mesajGecmisi;
    }
}

function manuelFormAc(metin) {
    const modal = document.getElementById('manuel-form-modal');
    modal.hidden = false;

    // Saati otomatik doldur
    const saatEl = document.getElementById('m-saat');
    saatEl.value = simdikiSaat();

    // Detay alanini doldur
    if (metin) {
        document.getElementById('m-detay').value = metin;
    }
}

async function manuelFormGonder(e) {
    e.preventDefault();

    const kayit = {
        saat: document.getElementById('m-saat').value || simdikiSaat(),
        detay: document.getElementById('m-detay').value || '-',
        kal: parseFloat(document.getElementById('m-kal').value) || null,
        karb: parseFloat(document.getElementById('m-karb').value) || null,
        lif: parseFloat(document.getElementById('m-lif').value) || null,
        prot: parseFloat(document.getElementById('m-prot').value) || null,
        yag: parseFloat(document.getElementById('m-yag').value) || null,
        ks: parseFloat(document.getElementById('m-ks').value) || null,
        ins: parseFloat(document.getElementById('m-ins').value) || null,
        gi: parseFloat(document.getElementById('m-gi').value) || null
    };

    await satirEkle(kayit);
    bildirimGoster('Veri eklendi');
    logEkle('sistem', 'Manuel veri eklendi: ' + (kayit.detay || '-'));

    // Formu temizle ve kapat
    document.getElementById('manuel-form').reset();
    document.getElementById('manuel-form-modal').hidden = true;
    document.getElementById('veri-giris').value = '';
}

// --- AI Yorum Gosterme ---
function aiYorumGoster(yorum, baslik) {
    const alan = document.getElementById('ai-yorum');
    alan.innerHTML = '';

    if (baslik) {
        const baslikEl = document.createElement('div');
        baslikEl.className = 'ai-yorum-baslik';
        baslikEl.textContent = baslik;
        alan.appendChild(baslikEl);
    }

    const icerikEl = document.createElement('div');
    icerikEl.className = 'ai-yorum-icerik';
    icerikEl.textContent = yorum;
    alan.appendChild(icerikEl);
}

// --- Bildirim ---
function bildirimGoster(mesaj, tip = 'bilgi') {
    const el = document.getElementById('son-bildirim');
    el.textContent = mesaj;
    el.classList.remove('uyari', 'hata');
    if (tip === 'uyari') el.classList.add('uyari');
    if (tip === 'hata') el.classList.add('hata');
    el.classList.add('gorunur');

    setTimeout(() => {
        el.classList.remove('gorunur', 'uyari', 'hata');
    }, 4000);
}

// --- Islem Log Sistemi ---
function logEkle(tip, mesaj) {
    const entry = { saat: simdikiSaat(), tip, mesaj };
    durum.logMesajlari.push(entry);
    logAlaniGuncelle();
    // Supabase'e kaydet (fire-and-forget)
    supabaseLogEkle(tip, mesaj);
}

function logAlaniGuncelle() {
    const liste = document.getElementById('log-listesi');
    if (!liste) return;
    liste.innerHTML = '';

    if (durum.logMesajlari.length === 0) {
        liste.innerHTML = '<p class="bos-mesaj">Henuz islem yok.</p>';
        return;
    }

    durum.logMesajlari.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'log-mesaj ' + entry.tip;
        const saatSpan = '<span class="log-saat">' + entry.saat + '</span>';
        const tipLabel = entry.tip === 'kullanici' ? 'Siz' : entry.tip === 'hata' ? 'Hata' : 'Sistem';
        div.innerHTML = saatSpan + '<strong>' + tipLabel + ':</strong> ' + entry.mesaj;
        liste.appendChild(div);
    });

    // Otomatik asagi kay
    liste.scrollTop = liste.scrollHeight;
}

async function logYukle() {
    const loglar = await supabaseLoglarYukle(bugunTarih());
    if (loglar && loglar.length > 0) {
        durum.logMesajlari = loglar;
        logAlaniGuncelle();
    }
}

// --- Besin Veritabani Senkronizasyonu ---
async function besinVeritabaniSenkronize() {
    const supabaseBesinler = await supabaseBesinleriYukle();
    if (Object.keys(supabaseBesinler).length > 0) {
        // Supabase tam kaynak - localStorage'i tamamen yenile (eski/yanlis kayitlari temizler)
        besinVeritabaniKaydet(supabaseBesinler);
        console.log('Besin DB senkronize edildi:', Object.keys(supabaseBesinler).length, 'besin Supabase\'den yuklendi');
    }
}

// --- Fotograf Islemleri ---
function fotoSecildi(e) {
    const dosya = e.target.files[0];
    if (!dosya) return;

    durum.seciliFoto = dosya;

    const okuyucu = new FileReader();
    okuyucu.onload = (ev) => {
        document.getElementById('foto-img').src = ev.target.result;
        document.getElementById('foto-onizleme').hidden = false;
    };
    okuyucu.readAsDataURL(dosya);
}

function fotoTemizle() {
    durum.seciliFoto = null;
    document.getElementById('foto-input').value = '';
    document.getElementById('foto-onizleme').hidden = true;
    document.getElementById('foto-img').src = '';
}

// --- Geri Al (Undo) ---
function geriAlButonGuncelle() {
    const btn = document.getElementById('geri-al-btn');
    if (btn) btn.disabled = durum.geriAlYigini.length === 0;
}

function geriAlButon() {
    geriAl();
}

async function geriAl() {
    if (durum.geriAlYigini.length === 0) {
        bildirimGoster('Geri alınacak işlem yok.', 'bilgi');
        return;
    }
    const islem = durum.geriAlYigini.pop();
    geriAlButonGuncelle();

    if (islem.tip === 'ekle') {
        // Eklemeyi geri al: kaydı bul ve sil
        const idx = durum.gunlukKayitlar.findIndex(k => k.supabaseId === islem.supabaseId);
        if (idx >= 0) {
            const kayit = durum.gunlukKayitlar[idx];
            durum.gunlukKayitlar.splice(idx, 1);
            if (kayit.supabaseId) supabaseKayitSil(kayit.supabaseId);
        }
    } else if (islem.tip === 'guncelle') {
        // Güncellemeyi geri al: eski değerlere dön
        const idx = durum.gunlukKayitlar.findIndex(k => k.supabaseId === islem.supabaseId);
        if (idx >= 0) {
            Object.assign(durum.gunlukKayitlar[idx], islem.eskiVeri);
            if (islem.supabaseId) supabaseKayitGuncelle(islem.supabaseId, islem.eskiVeri);
        }
    } else if (islem.tip === 'sil') {
        // Silmeyi geri al: kaydı eski konumuna geri ekle
        const kayit = { ...islem.eskiKayit, supabaseId: null };
        durum.gunlukKayitlar.splice(islem.eskiIndex, 0, kayit);
        const data = await supabaseKayitEkle(kayit, bugunTarih());
        if (data && data[0]) {
            kayit.supabaseId = data[0].id;
        }
    }

    gunlukVerileriKaydet();
    tabloGuncelle();
    ozetKartlariniGuncelle();
    bildirimGoster('Son işlem geri alındı.', 'bilgi');
    logEkle('sistem', 'Geri al uygulandı: ' + islem.tip);
}

// --- Satir Tiklama ---
function satirTiklandi(index) {
    const kayit = durum.gunlukKayitlar[index];
    if (!kayit) return;

    durum.modalAcikIndex = index;

    // Edit modunu sifirla
    document.getElementById('dm-detay').hidden = false;
    document.getElementById('dm-edit-alani').hidden = true;
    document.getElementById('dm-eylemler').hidden = !bugunMu(); // Gecmis gunde duzenle/sil gizli
    document.getElementById('dm-edit-eylemler').hidden = true;

    document.getElementById('dm-saat').textContent = kayit.saat || '';
    document.getElementById('dm-baslik').textContent = kayitEtiketiOlustur(kayit);
    const detayEl = document.getElementById('dm-detay');
    if (kayit.bilesenler && kayit.bilesenler.length > 1) {
        detayEl.innerHTML = '';
        kayit.bilesenler.forEach(b => {
            const div = document.createElement('div');
            div.className = 'dm-bilesen';
            const adEl = document.createElement('div');
            adEl.className = 'dm-bilesen-ad';
            const kaynakBadge = b.kaynak && b.kaynak !== 'ai_hesaplama'
                ? `<span class="dm-kaynak-badge">· ${b.kaynak.split(':')[1] || b.kaynak}</span>`
                : `<span class="dm-kaynak-badge ai">· AI tahmini</span>`;
            adEl.innerHTML = `${b.detay || '-'} ${kaynakBadge}`;
            div.appendChild(adEl);
            const ozet = [];
            if (b.kal) ozet.push(degerFormat(b.kal) + ' kcal');
            if (b.karb) ozet.push(degerFormat(b.karb) + 'g karb');
            if (b.prot) ozet.push(degerFormat(b.prot) + 'g prot');
            if (b.yag) ozet.push(degerFormat(b.yag) + 'g yağ');
            if (b.ks) ozet.push('KS: ' + b.ks);
            if (b.ins) ozet.push(degerFormat(b.ins) + 'Ü ins');
            if (ozet.length) {
                const ozetEl = document.createElement('div');
                ozetEl.className = 'dm-bilesen-ozet';
                ozetEl.textContent = ozet.join(' · ');
                div.appendChild(ozetEl);
            }
            detayEl.appendChild(div);
        });
    } else {
        const kaynakBadge = kayit.kaynak && kayit.kaynak !== 'ai_hesaplama'
            ? `<span class="dm-kaynak-badge">· ${kayit.kaynak.split(':')[1] || kayit.kaynak}</span>`
            : `<span class="dm-kaynak-badge ai">· AI tahmini</span>`;
        detayEl.innerHTML = `${kayit.detay || '-'} ${kaynakBadge}`;
    }

    const degerler = [
        { etiket: 'KAL', deger: kayit.kal, birim: 'kcal' },
        { etiket: 'KARB', deger: kayit.karb, birim: 'g' },
        { etiket: 'LİF', deger: kayit.lif, birim: 'g' },
        { etiket: 'PROT', deger: kayit.prot, birim: 'g' },
        { etiket: 'YAĞ', deger: kayit.yag, birim: 'g' },
        { etiket: 'KS', deger: kayit.ks, birim: 'mg/dL', renk: ksRenk(kayit.ks) },
        { etiket: 'İNS', deger: kayit.ins, birim: 'U', renk: kayit.ins ? 'ins-deger' : '' },
        { etiket: 'GI', deger: kayit.gi, birim: '' },
    ];

    document.getElementById('dm-degerler').innerHTML = degerler.map(d => {
        const val = d.deger ? degerFormat(d.deger) + (d.birim ? ' ' + d.birim : '') : '-';
        const renk = d.renk ? ` ${d.renk}` : '';
        return `<div class="dm-deger-item">
            <span class="dm-etiket">${d.etiket}</span>
            <span class="dm-sayi${renk}">${val}</span>
        </div>`;
    }).join('');

    document.getElementById('dm-sil-btn').onclick = () => {
        if (confirm('Bu kayıt silinsin mi?')) {
            satirSil(index);
            document.getElementById('detay-modal').hidden = true;
        }
    };

    document.getElementById('detay-modal').hidden = false;
}

// --- Modal Duzenleme ---
function modalDuzenleBaslat() {
    const kayit = durum.gunlukKayitlar[durum.modalAcikIndex];
    if (!kayit) return;

    const editAlani = document.getElementById('dm-edit-alani');
    editAlani.innerHTML = '';

    const items = (kayit.bilesenler && kayit.bilesenler.length > 1)
        ? kayit.bilesenler.map(b => b.detay || '')
        : [kayit.detay || ''];

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dm-edit-item';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'dm-edit-input';
        input.value = item;
        input.placeholder = 'Besin adı ve miktarı...';

        const silBtn = document.createElement('button');
        silBtn.className = 'dm-edit-sil';
        silBtn.innerHTML = '&times;';
        silBtn.title = 'Kaldır';
        silBtn.onclick = () => div.remove();

        div.appendChild(input);
        div.appendChild(silBtn);
        editAlani.appendChild(div);
    });

    document.getElementById('dm-detay').hidden = true;
    editAlani.hidden = false;
    document.getElementById('dm-eylemler').hidden = true;
    document.getElementById('dm-edit-eylemler').hidden = false;

    // İlk input'a focus
    const ilkInput = editAlani.querySelector('.dm-edit-input');
    if (ilkInput) ilkInput.focus();
}

function modalIptal() {
    document.getElementById('dm-detay').hidden = false;
    document.getElementById('dm-edit-alani').hidden = true;
    document.getElementById('dm-eylemler').hidden = false;
    document.getElementById('dm-edit-eylemler').hidden = true;
}

async function modalKaydetVeHesapla() {
    const capturedIndex = durum.modalAcikIndex;
    const kayit = durum.gunlukKayitlar[capturedIndex];
    if (!kayit) return;

    const inputs = document.querySelectorAll('#dm-edit-alani .dm-edit-input');
    const capturedNames = Array.from(inputs).map(inp => inp.value.trim()).filter(v => v);

    if (capturedNames.length === 0) {
        bildirimGoster('En az bir bileşen gerekli', 'hata');
        return;
    }

    const kaydetBtn = document.getElementById('dm-kaydet-btn');
    kaydetBtn.disabled = true;
    kaydetBtn.innerHTML = '<span class="yukleniyor"></span>';

    document.getElementById('detay-modal').hidden = true;
    bildirimGoster('AI hesaplıyor...');

    // Degisen/degismeyen bilesenleri ayirt et — degismeyenlerin degerlerini koru
    const eskiBilesenler = (kayit.bilesenler && kayit.bilesenler.length > 1)
        ? kayit.bilesenler
        : [{ detay: kayit.detay, kal: kayit.kal, karb: kayit.karb, lif: kayit.lif, prot: kayit.prot, yag: kayit.yag, gi: kayit.gi }];

    const bilesenSatirlari = capturedNames.map((yeniIsim, i) => {
        const eski = eskiBilesenler[i];
        if (eski && yeniIsim === eski.detay) {
            // Degismedi — mevcut degerleri koru
            return `${i+1}. "${yeniIsim}" — ${eski.kal || '-'}kcal, ${eski.karb || '-'}g karb, ${eski.lif || '-'}g lif, ${eski.prot || '-'}g prot, ${eski.yag || '-'}g yağ [DEĞİŞMEDİ, mevcut değerleri koru]`;
        } else {
            // Degisti — yeniden hesapla
            return `${i+1}. ${eski ? `"${eski.detay}" → ` : ''}"${yeniIsim}" [DEĞİŞTİ, yeniden hesapla]`;
        }
    });

    const mesaj = `${capturedIndex}. satırı güncelle (saat ${kayit.saat}). Bileşenler:\n${bilesenSatirlari.join('\n')}\n\nDEĞİŞMEYEN bileşenlerin besin değerlerini birebir koru. Sadece değişen bileşeni yeniden hesapla. Toplam değerleri güncelle.`;

    await aiIleIsle(mesaj);

    // AI sadece sayisal degerleri guncelliyor; bilesenlerin isimlerini de guncelle
    const k = durum.gunlukKayitlar[capturedIndex];
    if (k) {
        if (k.bilesenler && k.bilesenler.length > 0) {
            capturedNames.forEach((isim, i) => {
                if (k.bilesenler[i]) k.bilesenler[i].detay = isim;
            });
        }
        k.detay = capturedNames.join(' + ');
        gunlukVerileriKaydet();
        if (k.supabaseId) supabaseKayitGuncelle(k.supabaseId, k);
        tabloGuncelle();
    }

    kaydetBtn.textContent = 'Kaydet & Hesapla';
    kaydetBtn.disabled = false;
}

// --- Gun Kapatma ---
function gunuKapat() {
    const toplamlar = { kal: 0, karb: 0, lif: 0, prot: 0, yag: 0, ins: 0 };
    durum.gunlukKayitlar.forEach(k => {
        toplamlar.kal += k.kal || 0;
        toplamlar.karb += k.karb || 0;
        toplamlar.lif += k.lif || 0;
        toplamlar.prot += k.prot || 0;
        toplamlar.yag += k.yag || 0;
        toplamlar.ins += k.ins || 0;
    });

    const bmr = bmrHesapla();
    const netEnerji = toplamlar.kal - bmr;
    const kiloEtkisi = netEnerji / 7700; // 1 kg yag ~7700 kcal

    const ozet = {
        tarih: bugunTarih(),
        kayitSayisi: durum.gunlukKayitlar.length,
        toplamlar: toplamlar,
        bmr: bmr,
        netEnerji: netEnerji,
        kiloEtkisi: kiloEtkisi,
        kapatmaSaati: simdikiSaat()
    };

    // Hafizaya kaydet
    const hafiza = JSON.parse(localStorage.getItem('mmp_hafiza') || '[]');
    hafiza.unshift(ozet);
    localStorage.setItem('mmp_hafiza', JSON.stringify(hafiza));

    // Supabase'e kaydet
    supabaseOzetKaydet(ozet);

    bildirimGoster('Gun kapatildi: ' + ozet.tarih);
    logEkle('sistem', 'Gun kapatildi: ' + ozet.tarih + ' | ' + Math.round(toplamlar.kal) + ' kcal | Net: ' + Math.round(netEnerji) + ' kcal');
    hafizaYukle();
}

// --- Metabolik Hafiza ---
function hafizaYukle() {
    const hafiza = JSON.parse(localStorage.getItem('mmp_hafiza') || '[]');
    const liste = document.getElementById('hafiza-listesi');
    liste.innerHTML = '';

    if (hafiza.length === 0) {
        liste.innerHTML = '<p class="bos-mesaj">Henuz kapanmis gun yok.</p>';
        return;
    }

    hafiza.slice(0, 7).forEach(gun => {
        const kart = document.createElement('div');
        kart.className = 'hafiza-karti';

        const netKarb = gun.toplamlar.karb.toFixed(1);
        const kiloYon = gun.kiloEtkisi >= 0 ? '+' : '';

        kart.innerHTML = `
            <div class="hafiza-tarih">${gun.tarih} | Kapanis: ${gun.kapatmaSaati}</div>
            <div class="hafiza-ozet">
                ${Math.round(gun.toplamlar.kal)} kcal | ${netKarb}g karb | ${gun.toplamlar.ins}U ins |
                BMR: ${gun.bmr} | Net: ${Math.round(gun.netEnerji)} kcal |
                Kilo etkisi: ${kiloYon}${(gun.kiloEtkisi * 1000).toFixed(0)}g
            </div>
        `;
        liste.appendChild(kart);
    });
}

// --- Export / Import ---
function veriExport() {
    const veri = {
        profil: durum.profil,
        hafiza: JSON.parse(localStorage.getItem('mmp_hafiza') || '[]'),
        bugunKayitlar: durum.gunlukKayitlar,
        tarih: new Date().toISOString()
    };

    // API key'i export'a dahil etme
    veri.profil = { ...veri.profil, apiKey: '' };

    const blob = new Blob([JSON.stringify(veri, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mmp_yedek_' + bugunTarih() + '.json';
    a.click();
    URL.revokeObjectURL(url);

    bildirimGoster('Veri disari aktarildi');
    logEkle('sistem', 'Veri disari aktarildi');
}

function veriImport() {
    document.getElementById('import-input').click();
}

function veriImportIsle(e) {
    const dosya = e.target.files[0];
    if (!dosya) return;

    const okuyucu = new FileReader();
    okuyucu.onload = (ev) => {
        try {
            const veri = JSON.parse(ev.target.result);

            if (veri.profil) {
                // API key'i koruyalim
                const mevcutApiKey = durum.profil.apiKey;
                Object.assign(durum.profil, veri.profil);
                durum.profil.apiKey = mevcutApiKey;
                localStorage.setItem('mmp_profil', JSON.stringify(durum.profil));
                profilBilgiGuncelle();
            }

            if (veri.hafiza) {
                localStorage.setItem('mmp_hafiza', JSON.stringify(veri.hafiza));
                hafizaYukle();
            }


            if (veri.bugunKayitlar) {
                durum.gunlukKayitlar = veri.bugunKayitlar;
                gunlukVerileriKaydet();
                tabloGuncelle();
                ozetKartlariniGuncelle();
            }

            bildirimGoster('Veri iceri aktarildi');
            logEkle('sistem', 'Veri iceri aktarildi');
        } catch (hata) {
            bildirimGoster('Gecersiz JSON dosyasi', 'hata');
            logEkle('hata', 'Gecersiz JSON dosyasi');
        }
    };
    okuyucu.readAsText(dosya);

    // Input'u sifirla
    e.target.value = '';
}

// --- Olay Dinleyiciler ---
function olaylariDinle() {
    // Gonder butonu
    document.getElementById('gonder-btn').addEventListener('click', veriGonder);

    // Enter ile gonder (Shift+Enter yeni satir)
    document.getElementById('veri-giris').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            veriGonder();
        }
    });

    // Ayarlar sayfasi
    document.getElementById('ayarlar-ac').addEventListener('click', () => {
        ayarFormuDoldur();
        sayfaGoster('sayfa-ayarlar');
    });

    document.getElementById('ayarlar-kapat').addEventListener('click', () => {
        sayfaGoster('sayfa-ana');
    });

    document.getElementById('ayar-kaydet-btn').addEventListener('click', profilKaydet);

    // Fotograf
    document.getElementById('foto-input').addEventListener('change', fotoSecildi);
    document.getElementById('foto-sil').addEventListener('click', fotoTemizle);

    // Ctrl+V ile gorsel yapistirma
    document.getElementById('veri-giris').addEventListener('paste', (e) => {
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const dosya = item.getAsFile();
                if (!dosya) return;
                durum.seciliFoto = dosya;
                const okuyucu = new FileReader();
                okuyucu.onload = (ev) => {
                    document.getElementById('foto-img').src = ev.target.result;
                    document.getElementById('foto-onizleme').hidden = false;
                };
                okuyucu.readAsDataURL(dosya);
                return;
            }
        }
    });

    // Manuel form
    document.getElementById('manuel-form').addEventListener('submit', manuelFormGonder);
    document.getElementById('manuel-kapat').addEventListener('click', () => {
        document.getElementById('manuel-form-modal').hidden = true;
    });

    // Export / Import
    document.getElementById('btn-export').addEventListener('click', veriExport);
    document.getElementById('btn-import').addEventListener('click', veriImport);
    document.getElementById('import-input').addEventListener('change', veriImportIsle);
    document.getElementById('btn-temizle-ana').addEventListener('click', gunuTemizle);

    // Detay modali
    document.getElementById('detay-modal-kapat').addEventListener('click', () => {
        document.getElementById('detay-modal').hidden = true;
    });
    document.getElementById('detay-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) document.getElementById('detay-modal').hidden = true;
    });
    document.getElementById('dm-duzenle-btn').addEventListener('click', modalDuzenleBaslat);
    document.getElementById('dm-iptal-btn').addEventListener('click', modalIptal);
    document.getElementById('dm-kaydet-btn').addEventListener('click', modalKaydetVeHesapla);

    // Tarih navigasyon
    document.getElementById('onceki-gun').addEventListener('click', gunuGosterOnceki);
    document.getElementById('sonraki-gun').addEventListener('click', gunuGosterSonraki);
}

async function gunuTemizle() {
    if (!confirm('Bugünün tüm kayıtları ve loglar silinecek. Emin misin?')) return;
    durum.gunlukKayitlar = [];
    durum.logMesajlari = [];
    durum.aiMesajGecmisi = [];
    const temizlenecekTarih = kayitTarihi();
    durum.sonGirisZamani = null;
    localStorage.removeItem('mmp_son_giris_zamani');
    localStorage.removeItem('mmp_gun_' + temizlenecekTarih);
    await supabaseGunlukKayitlariSil(temizlenecekTarih);
    tabloGuncelle();
    ozetKartlariniGuncelle();
    logAlaniGuncelle();
    bildirimGoster('Tablo ve loglar temizlendi');
}
