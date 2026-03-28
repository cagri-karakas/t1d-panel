// ============================================
// METABOLIK MUHENDISLIK PANELI - SUPABASE
// ============================================

let supabaseIstemci = null;

function supabaseBaslat(url, key) {
    if (!url || !key) return;

    // Supabase JS CDN'den yuklenecek
    if (typeof window.supabase !== 'undefined') {
        supabaseIstemci = window.supabase.createClient(url, key);
        console.log('Supabase baglantisi kuruldu');
    } else {
        // CDN henuz yuklenmediyse dinamik yukle
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => {
            supabaseIstemci = window.supabase.createClient(url, key);
            console.log('Supabase baglantisi kuruldu (dinamik)');
        };
        document.head.appendChild(script);
    }
}

// --- Profil ---
async function supabaseProfilKaydet(profil) {
    if (!supabaseIstemci) return null;
    const { data, error } = await supabaseIstemci
        .from('profiles')
        .upsert({
            id: 1, // Tek kullanici
            name: profil.isim,
            height_cm: profil.boy,
            weight_kg: profil.kilo,
            gender: profil.cinsiyet,
            birth_date: profil.dogumTarihi
        })
        .select();

    if (error) console.error('Profil kaydetme hatasi:', error);
    return data;
}

async function supabaseProfilYukle() {
    if (!supabaseIstemci) return null;
    const { data, error } = await supabaseIstemci
        .from('profiles')
        .select('*')
        .eq('id', 1)
        .single();

    if (error) {
        console.error('Profil yukleme hatasi:', error);
        return null;
    }
    return data;
}

// --- Gunluk Kayitlar ---
async function supabaseKayitEkle(kayit, tarih) {
    if (!supabaseIstemci) return null;
    const { data, error } = await supabaseIstemci
        .from('daily_entries')
        .insert({
            profile_id: 1,
            date: tarih,
            time: kayit.saat,
            detail: kayit.detay,
            cal: kayit.kal,
            carb: kayit.karb,
            fiber: kayit.lif,
            protein: kayit.prot,
            fat: kayit.yag,
            blood_sugar: kayit.ks,
            insulin: kayit.ins,
            gi: kayit.gi,
            image_url: kayit.gorselUrl,
            bilesenler: kayit.bilesenler ? JSON.stringify(kayit.bilesenler) : null,
            etiket: kayit.etiket || null
        })
        .select();

    if (error) console.error('Kayit ekleme hatasi:', error);
    return data;
}

async function supabaseKayitlariYukle(tarih) {
    if (!supabaseIstemci) return [];
    const { data, error } = await supabaseIstemci
        .from('daily_entries')
        .select('*')
        .eq('profile_id', 1)
        .eq('date', tarih)
        .order('time', { ascending: true });

    if (error) {
        console.error('Kayit yukleme hatasi:', error);
        return [];
    }

    // Supabase formatindan uygulama formatina cevir
    return data.map(k => ({
        id: k.id,
        saat: k.time,
        detay: k.detail,
        kal: k.cal,
        karb: k.carb,
        lif: k.fiber,
        prot: k.protein,
        yag: k.fat,
        ks: k.blood_sugar,
        ins: k.insulin,
        gi: k.gi,
        gorselUrl: k.image_url,
        bilesenler: k.bilesenler ? (typeof k.bilesenler === 'string' ? JSON.parse(k.bilesenler) : k.bilesenler) : null,
        etiket: k.etiket || null
    }));
}

async function supabaseKayitGuncelle(id, kayit) {
    if (!supabaseIstemci) return null;
    const { data, error } = await supabaseIstemci
        .from('daily_entries')
        .update({
            time: kayit.saat,
            detail: kayit.detay,
            cal: kayit.kal,
            carb: kayit.karb,
            fiber: kayit.lif,
            protein: kayit.prot,
            fat: kayit.yag,
            blood_sugar: kayit.ks,
            insulin: kayit.ins,
            gi: kayit.gi,
            image_url: kayit.gorselUrl,
            bilesenler: kayit.bilesenler ? JSON.stringify(kayit.bilesenler) : null,
            etiket: kayit.etiket || null
        })
        .eq('id', id)
        .select();

    if (error) console.error('Kayit guncelleme hatasi:', error);
    return data;
}

async function supabaseKayitSil(id) {
    if (!supabaseIstemci) return null;
    const { error } = await supabaseIstemci
        .from('daily_entries')
        .delete()
        .eq('id', id);

    if (error) console.error('Kayit silme hatasi:', error);
}

async function supabaseGunlukKayitlariSil(tarih) {
    if (!supabaseIstemci) return;
    const { error } = await supabaseIstemci
        .from('daily_entries')
        .delete()
        .eq('profile_id', 1)
        .eq('date', tarih);

    if (error) console.error('Gunluk kayitlar silme hatasi:', error);
}

// --- Gun Ozeti (Metabolik Hafiza) ---
async function supabaseOzetKaydet(ozet) {
    if (!supabaseIstemci) return null;
    const { data, error } = await supabaseIstemci
        .from('daily_summaries')
        .insert({
            profile_id: 1,
            date: ozet.tarih,
            total_cal: ozet.toplamlar.kal,
            total_carb: ozet.toplamlar.karb,
            total_fiber: ozet.toplamlar.lif,
            total_protein: ozet.toplamlar.prot,
            total_fat: ozet.toplamlar.yag,
            total_insulin: ozet.toplamlar.ins,
            ai_summary: JSON.stringify(ozet),
            closed_at: new Date().toISOString()
        })
        .select();

    if (error) console.error('Ozet kaydetme hatasi:', error);
    return data;
}

async function supabaseOzetleriYukle(limit = 7) {
    if (!supabaseIstemci) return [];
    const { data, error } = await supabaseIstemci
        .from('daily_summaries')
        .select('*')
        .eq('profile_id', 1)
        .order('date', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Ozet yukleme hatasi:', error);
        return [];
    }
    return data;
}

// --- Gorsel Yukleme (Supabase Storage) ---
async function supabaseGorselYukle(dosya) {
    if (!supabaseIstemci) return null;

    const dosyaAdi = `${Date.now()}_${dosya.name}`;
    const { data, error } = await supabaseIstemci
        .storage
        .from('images')
        .upload(dosyaAdi, dosya);

    if (error) {
        console.error('Gorsel yukleme hatasi:', error);
        return null;
    }

    // Public URL al
    const { data: urlData } = supabaseIstemci
        .storage
        .from('images')
        .getPublicUrl(dosyaAdi);

    return urlData.publicUrl;
}

// --- Besin Degerleri Veritabani ---
async function supabaseBesinKaydet(besin) {
    if (!supabaseIstemci) return null;
    const { data, error } = await supabaseIstemci
        .from('besin_degerleri')
        .upsert({
            isim: besin.isim.toLowerCase().trim(),
            kal: besin.kal,
            karb: besin.karb,
            lif: besin.lif,
            prot: besin.prot,
            yag: besin.yag,
            gi: besin.gi,
            ref_miktar: besin.refMiktar || null,
            ref_birim: besin.refBirim || null,
            guncellenme_tarihi: new Date().toISOString()
        }, { onConflict: 'isim' })
        .select();

    if (error) console.error('Besin kaydetme hatasi:', error);
    return data;
}

async function supabaseBesinleriYukle() {
    if (!supabaseIstemci) return {};
    const { data, error } = await supabaseIstemci
        .from('besin_degerleri')
        .select('*');

    if (error) {
        console.error('Besin yukleme hatasi:', error);
        return {};
    }

    // localStorage formatiyla uyumlu objeye cevir
    const sonuc = {};
    (data || []).forEach(b => {
        sonuc[b.isim] = {
            isim: b.isim,
            kal: b.kal,
            karb: b.karb,
            lif: b.lif,
            prot: b.prot,
            yag: b.yag,
            gi: b.gi,
            refMiktar: b.ref_miktar || null,
            refBirim: b.ref_birim || null,
            guncellenmeTarihi: b.guncellenme_tarihi
        };
    });
    return sonuc;
}

// --- Giris Loglari ---
async function supabaseLogEkle(tip, mesaj) {
    if (!supabaseIstemci) return null;
    try {
        const simdi = new Date();
        const saat = simdi.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const tarih = simdi.toISOString().split('T')[0];
        await supabaseIstemci
            .from('giris_loglari')
            .insert({ tarih, saat, tip, mesaj });
    } catch (e) {
        console.error('Log ekleme hatasi:', e);
    }
}

async function supabaseLoglarYukle(tarih) {
    if (!supabaseIstemci) return [];
    const { data, error } = await supabaseIstemci
        .from('giris_loglari')
        .select('saat, tip, mesaj')
        .eq('tarih', tarih)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Log yukleme hatasi:', error);
        return [];
    }
    return data || [];
}
