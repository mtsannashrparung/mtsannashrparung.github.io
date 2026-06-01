// ==========================================
// INISIALISASI SUPABASE
// ==========================================
// [PENTING - KONFIGURASI RLS SUPABASE]
// Pastikan Anda telah menambahkan Policy RLS (Row Level Security) di tabel 'ppdb'
// 1. Buka Supabase Dashboard -> Table Editor -> ppdb -> RLS
// 2. Buat policy baru:
//    - Policy name: Allow public read by nisn
//    - Operation: SELECT
//    - Target roles: anon
//    - Using expression: true
// Ini membolehkan portal publik untuk membaca data berdasarkan NISN tanpa perlu otentikasi.

// Pastikan key di bawah ini adalah anon/publishable key, BUKAN service_role key!
const supabaseUrl = 'https://ejhmwxqbpmjkvudazjmc.supabase.co';
const supabaseKey = 'sb_publishable_pfloSKirXdrAE2lj7ygHNg_o-aMJPjz';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let currentStudent = null;

// ==========================================
// LOGIKA LOGIN PORTAL
// ==========================================
window.loginPortal = async function() {
    const nisn = document.getElementById('nisn-input').value.trim();
    const btn = document.getElementById('btn-login');
    
    if (!nisn) {
        Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Silakan masukkan NISN Anda.' });
        return;
    }
    
    // Validasi panjang NISN (Resmi Indonesia: 10 digit)
    if (nisn.length !== 10) {
        Swal.fire({ icon: 'warning', title: 'Format Tidak Valid', text: 'NISN harus terdiri dari tepat 10 digit angka.' });
        return;
    }

    // State Loading
    const originalBtnContent = btn.innerHTML;
    btn.innerHTML = `<ion-icon name="sync" class="animate-spin text-xl"></ion-icon> Memeriksa Data...`;
    btn.disabled = true;
    btn.classList.add('opacity-70', 'cursor-not-allowed');

    try {
        // 1. Mencoba fetch menggunakan tipe teks murni
        let { data, error } = await supabaseClient
            .from('ppdb')
            .select('*')
            .eq('nisn', nisn.toString())
            .maybeSingle();

        // 2. Fallback: Jika kosong, coba fetch menggunakan tipe Integer
        if (!data && !error) {
            const fallback = await supabaseClient
                .from('ppdb')
                .select('*')
                .eq('nisn', parseInt(nisn))
                .maybeSingle();
            data = fallback.data;
            error = fallback.error;
        }
        
        // Tampilkan error atau data langsung di browser console untuk proses debug
        console.log('--- Debug Supabase Fetch --- \nData:', data, '\nError:', error);

        if (error) {
            Swal.fire({ icon: 'error', title: 'Gagal Terhubung', text: 'Terjadi gangguan saat mengambil data. Pastikan koneksi internet stabil.' });
            return;
        }
        if (!data) {
            Swal.fire({ icon: 'error', title: 'Data Tidak Ditemukan', text: 'Pendaftaran dengan NISN tersebut tidak terdaftar di sistem. Pastikan Anda memasukkan NISN yang benar.' });
            return;
        }

        currentStudent = data;
        sessionStorage.setItem('portal_nisn', nisn);
        renderDashboard();

    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', text: err.message });
    } finally {
        // Kembalikan state tombol
        btn.innerHTML = originalBtnContent;
        btn.disabled = false;
        btn.classList.remove('opacity-70', 'cursor-not-allowed');
    }
};

// ==========================================
// LOGIKA RENDER DASHBOARD & STATUS
// ==========================================
window.renderDashboard = function() {
    if (!currentStudent) return;

    // Sembunyikan form login, tampilkan dashboard
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');

    // Menggunakan nomor_pendaftaran langsung dari database (fallback ke ID dummy jika kosong)
    const regId = currentStudent.nomor_pendaftaran || 
                  (typeof currentStudent.id === 'string' ? currentStudent.id.substring(0,8).toUpperCase() : `REG-${currentStudent.id.toString().padStart(4, '0')}`);
    
    // Parsing tanggal lahir aman dari crash bila field database kosong/null
    const rawDate = currentStudent.tanggal_lahir;
    const safeDate = (rawDate && !isNaN(new Date(rawDate))) ? new Date(rawDate).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-';
    
    // 1. TAMPILKAN INFO HEADER
    document.getElementById('student-name-header').innerText = currentStudent.nama;
    document.getElementById('student-reg-id').innerText = regId;

    // 2. TAMPILKAN RINCIAN DATA
    document.getElementById('det-nama').innerText = currentStudent.nama;
    document.getElementById('det-nisn').innerText = currentStudent.nisn || '-';
    document.getElementById('det-jk').innerText = currentStudent.jenis_kelamin;
    document.getElementById('det-ttl').innerText = `${currentStudent.tempat_lahir}, ${safeDate}`;
    document.getElementById('det-alamat').innerText = currentStudent.alamat;
    document.getElementById('det-sekolah').innerText = currentStudent.asal_sekolah;
    document.getElementById('det-lulus').innerText = currentStudent.tahun_lulus;
    document.getElementById('det-ayah').innerText = currentStudent.nama_ayah;
    document.getElementById('det-ibu').innerText = currentStudent.nama_ibu;
    document.getElementById('det-hp-ortu').innerText = currentStudent.no_hp_ortu;

    // 3. LOGIKA STATUS & TIMELINE
    const status = currentStudent.status || 'pending';
    
    // Elements Banner
    const banner = document.getElementById('status-banner');
    const iconContainer = document.getElementById('status-icon-container');
    const icon = document.getElementById('status-icon');
    const text = document.getElementById('status-text');
    const label = document.getElementById('status-label');
    const actionText = document.getElementById('action-text');
    const btnEdit = document.getElementById('btn-edit-profile');

    // Elements Timeline
    const step2Icon = document.getElementById('step-2-icon');
    const step2Text = document.getElementById('step-2-text');
    const step3Icon = document.getElementById('step-3-icon');
    const step3Text = document.getElementById('step-3-text');

    // Reset Class Base
    banner.className = "p-4 sm:p-6 rounded-2xl border-l-4 flex items-center gap-3 sm:gap-4 shadow-sm";
    iconContainer.className = "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0";

    if (status === 'pending') {
        banner.classList.add('bg-yellow-50', 'border-yellow-400');
        iconContainer.classList.add('bg-yellow-200', 'text-yellow-700');
        label.className = "text-xs md:text-sm font-bold uppercase tracking-wider mb-1 text-yellow-700";
        text.className = "text-xl md:text-2xl font-black text-yellow-800";
        icon.setAttribute('name', 'time');
        text.innerText = 'Sedang Diverifikasi';
        actionText.innerText = "Berkas pendaftaran Anda telah kami terima dan saat ini sedang dalam proses verifikasi oleh panitia. Silakan cek portal ini secara berkala.";

        step2Icon.className = "w-10 h-10 rounded-full bg-yellow-400 text-white flex items-center justify-center shrink-0 shadow-md";
        step2Icon.innerHTML = `<ion-icon name="sync" class="text-xl animate-spin"></ion-icon>`;
        step2Text.innerText = "Menunggu proses pemeriksaan oleh panitia.";
        
        step3Icon.className = "w-10 h-10 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center shrink-0 shadow-md";
        step3Icon.innerHTML = `<ion-icon name="ellipsis-horizontal" class="text-xl"></ion-icon>`;
        step3Text.innerText = "Hasil seleksi belum tersedia.";
        btnEdit.classList.remove('hidden');

    } else if (status === 'diterima') {
        banner.classList.add('bg-green-50', 'border-green-500');
        iconContainer.classList.add('bg-green-200', 'text-green-700');
        label.className = "text-xs md:text-sm font-bold uppercase tracking-wider mb-1 text-green-700";
        text.className = "text-xl md:text-2xl font-black text-green-800";
        icon.setAttribute('name', 'checkmark-circle');
        text.innerText = 'Selamat, Anda Diterima!';
        actionText.innerHTML = "Selamat! Anda dinyatakan lulus seleksi PPDB MTs An Nashr. Silakan hubungi panitia di WA: <a href='https://wa.me/6287884234210' target='_blank' class='text-[#27AE60] hover:underline font-bold'>+6287884234210</a> untuk proses <strong>Daftar Ulang</strong>.";

        step2Icon.className = "w-10 h-10 rounded-full bg-[#27AE60] text-white flex items-center justify-center shrink-0 shadow-md";
        step2Icon.innerHTML = `<ion-icon name="checkmark-outline" class="text-xl"></ion-icon>`;
        step2Text.innerText = "Berkas pendaftaran valid.";

        step3Icon.className = "w-10 h-10 rounded-full bg-[#27AE60] text-white flex items-center justify-center shrink-0 shadow-md";
        step3Icon.innerHTML = `<ion-icon name="checkmark-outline" class="text-xl"></ion-icon>`;
        step3Text.innerHTML = "Dinyatakan <strong class='text-[#27AE60]'>LULUS</strong> seleksi.";
        btnEdit.classList.add('hidden');

    } else if (status === 'ditolak') {
        banner.classList.add('bg-red-50', 'border-red-500');
        iconContainer.classList.add('bg-red-200', 'text-red-700');
        label.className = "text-xs md:text-sm font-bold uppercase tracking-wider mb-1 text-red-700";
        text.className = "text-xl md:text-2xl font-black text-red-800";
        icon.setAttribute('name', 'close-circle');
        text.innerText = 'Mohon Maaf, Belum Lolos';
        actionText.innerText = "Terima kasih telah berpartisipasi dalam pendaftaran PPDB. Jangan patah semangat dan teruslah belajar!";

        step2Icon.className = "w-10 h-10 rounded-full bg-[#27AE60] text-white flex items-center justify-center shrink-0 shadow-md";
        step2Icon.innerHTML = `<ion-icon name="checkmark-outline" class="text-xl"></ion-icon>`;
        step2Text.innerText = "Berkas telah selesai diperiksa.";

        step3Icon.className = "w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 shadow-md";
        step3Icon.innerHTML = `<ion-icon name="close-outline" class="text-xl"></ion-icon>`;
        step3Text.innerHTML = "Dinyatakan <strong class='text-red-500'>TIDAK LULUS</strong> seleksi.";
        btnEdit.classList.add('hidden');
    }

    // 4. CATATAN PANITIA
    const adminNoteCard = document.getElementById('admin-note-card');
    const adminNoteText = document.getElementById('admin-note-text');
    
    if (currentStudent.catatan_admin && currentStudent.catatan_admin.trim() !== '') {
        adminNoteText.innerText = currentStudent.catatan_admin;
        adminNoteCard.classList.remove('hidden');
    } else {
        adminNoteCard.classList.add('hidden');
    }
}

// ==========================================
// LOGIKA EDIT DATA DIRI
// ==========================================
window.openEditModal = function() {
    if (!currentStudent || currentStudent.status !== 'pending') return;
    
    // Isi form dengan data saat ini
    document.getElementById('es-nama').value = currentStudent.nama || '';
    document.getElementById('es-nisn').value = currentStudent.nisn || '';
    document.getElementById('es-jk').value = currentStudent.jenis_kelamin || 'Laki-laki';
    document.getElementById('es-tempat').value = currentStudent.tempat_lahir || '';
    document.getElementById('es-tgl').value = currentStudent.tanggal_lahir || '';
    document.getElementById('es-hp').value = currentStudent.no_hp_ortu || '';
    document.getElementById('es-alamat').value = currentStudent.alamat || '';
    document.getElementById('es-sekolah').value = currentStudent.asal_sekolah || '';
    document.getElementById('es-lulus').value = currentStudent.tahun_lulus || '';
    
    // Kosongkan input file jika ada
    if (document.getElementById('es-berkas-ktp')) document.getElementById('es-berkas-ktp').value = '';
    if (document.getElementById('es-berkas-kk')) document.getElementById('es-berkas-kk').value = '';
    if (document.getElementById('es-berkas-akta')) document.getElementById('es-berkas-akta').value = '';
    if (document.getElementById('es-berkas-ijazah')) document.getElementById('es-berkas-ijazah').value = '';

    document.getElementById('modal-edit-siswa').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

window.closeEditModal = function() {
    document.getElementById('modal-edit-siswa').classList.add('hidden');
    document.body.style.overflow = '';
};

window.saveEditSiswa = async function() {
    const nisn = document.getElementById('es-nisn').value.trim();
    if (nisn.length !== 10) {
        Swal.fire({ icon: 'warning', title: 'Format Tidak Valid', text: 'NISN harus terdiri dari tepat 10 digit angka.' });
        return;
    }

    const btn = document.getElementById('btn-save-edit');
    const originalBtnContent = btn.innerHTML;
    btn.innerHTML = `<ion-icon name="sync" class="animate-spin text-xl"></ion-icon> Menyimpan...`;
    btn.disabled = true;
    
    // Fungsi Unggah Berkas oleh Siswa
    const uploadFileSiswa = async (elementId, folder) => {
        const fileInput = document.getElementById(elementId);
        if (!fileInput || fileInput.files.length === 0) return null;
        const file = fileInput.files[0];
        if (file.size > 2 * 1024 * 1024) throw new Error(`Ukuran file ${folder} terlalu besar. Maksimal 2MB!`);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
        const { error } = await supabaseClient.storage.from('berkas_ppdb').upload(`${folder}/${fileName}`, file);
        if (error) throw error;
        const { data } = supabaseClient.storage.from('berkas_ppdb').getPublicUrl(`${folder}/${fileName}`);
        return data.publicUrl;
    };

    try {
        const urlKtp = await uploadFileSiswa('es-berkas-ktp', 'KTP');
        const urlKk = await uploadFileSiswa('es-berkas-kk', 'KK');
        const urlAkta = await uploadFileSiswa('es-berkas-akta', 'AKTA');
        const urlIjazah = await uploadFileSiswa('es-berkas-ijazah', 'IJAZAH');

        const payload = {
            nama: document.getElementById('es-nama').value,
            nisn: nisn,
            jenis_kelamin: document.getElementById('es-jk').value,
            tempat_lahir: document.getElementById('es-tempat').value,
            tanggal_lahir: document.getElementById('es-tgl').value,
            no_hp_ortu: document.getElementById('es-hp').value,
            alamat: document.getElementById('es-alamat').value,
            asal_sekolah: document.getElementById('es-sekolah').value,
            tahun_lulus: document.getElementById('es-lulus').value,
        };

        // Update tautan gambar hanya jika siswa mengunggah berkas revisi
        if (urlKtp) payload.berkas_ktp = urlKtp;
        if (urlKk) payload.berkas_kk = urlKk;
        if (urlAkta) payload.berkas_akta = urlAkta;
        if (urlIjazah) payload.berkas_ijazah = urlIjazah;

        const { error } = await supabaseClient.from('ppdb').update(payload).eq('id', currentStudent.id);
        if (error) throw error;
        
        Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data diri dan berkas berhasil diperbarui.' });
        
        currentStudent = { ...currentStudent, ...payload };
        if (payload.nisn !== sessionStorage.getItem('portal_nisn')) {
            sessionStorage.setItem('portal_nisn', payload.nisn);
        }
        
        renderDashboard();
        closeEditModal();
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: err.message });
    } finally {
        btn.innerHTML = originalBtnContent;
        btn.disabled = false;
    }
};

// ==========================================
// LOGOUT PORTAL
// ==========================================
window.logoutPortal = function() {
    Swal.fire({
        title: 'Keluar Portal?',
        text: "Anda akan keluar dari dashboard peserta.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Keluar!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            sessionStorage.removeItem('portal_nisn');
            currentStudent = null;
            document.getElementById('login-form').reset();
            
            // Efek transisi ringan
            document.getElementById('dashboard-view').classList.add('hidden');
            document.getElementById('login-view').classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
};

// ==========================================
// AUTO-LOGIN (Cek Session)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const savedNisn = sessionStorage.getItem('portal_nisn');
    if (savedNisn) {
        // Munculkan layar loading sementara session diverifikasi ke database
        Swal.fire({
            title: 'Memuat data...',
            text: 'Sedang memulihkan sesi Anda.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading() }
        });
        (async () => {
            try {
                const { data, error } = await supabaseClient.from('ppdb').select('*').eq('nisn', savedNisn).maybeSingle();
                if (data && !error) {
                    currentStudent = data;
                    Swal.close();
                    renderDashboard();
                } else {
                    Swal.close();
                    sessionStorage.removeItem('portal_nisn');
                }
            } catch (err) {
                Swal.close();
                console.error('Auto login failed', err);
            }
        })();
    }
});