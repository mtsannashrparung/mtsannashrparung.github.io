// ==========================================
// INISIALISASI SUPABASE
// ==========================================
const supabaseUrl = 'https://ejhmwxqbpmjkvudazjmc.supabase.co';
const supabaseKey = 'sb_publishable_pfloSKirXdrAE2lj7ygHNg_o-aMJPjz';

// Membuat client Supabase
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// FUNGSI UPLOAD BERKAS KE SUPABASE STORAGE
// ==========================================
async function uploadBerkas(fileElementId, folderName) {
    const fileInput = document.getElementById(fileElementId);
    if (!fileInput || fileInput.files.length === 0) return null;

    const file = fileInput.files[0];

    // Validasi Ukuran File (Maksimal 2MB = 2 * 1024 * 1024 bytes)
    if (file.size > 2 * 1024 * 1024) {
        throw new Error(`Ukuran file pada ${folderName} terlalu besar. Maksimal 2MB!`);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
    const filePath = `${folderName}/${fileName}`;

    // Pastikan Anda sudah membuat bucket bernama 'berkas_ppdb' di Supabase Storage
    const { error } = await supabaseClient.storage.from('berkas_ppdb').upload(filePath, file);
    
    if (error) throw error;

    // Ambil Public URL dari file yang di-upload
    const { data } = supabaseClient.storage.from('berkas_ppdb').getPublicUrl(filePath);
    
    return data.publicUrl;
}

// ==========================================
// FUNGSI SUBMIT FORM PPDB
// ==========================================
async function submitPPDB(event) {
    event.preventDefault(); 
    
    // Ambil tombol
    const btnSubmit = document.getElementById('btn-submit');
    const btnSubmitText = document.getElementById('btn-submit-text');
    const progressBar = document.getElementById('upload-progress');

    btnSubmitText.innerHTML = `<ion-icon name="sync-outline" class="animate-spin"></ion-icon> Memproses...`;
    btnSubmit.disabled = true;
    btnSubmit.classList.add('opacity-70', 'cursor-not-allowed');
    progressBar.style.width = '0%';

    try {
        const nisnValue = document.getElementById('nisn').value.trim();
        const noHpOrtuValue = document.getElementById('no_hp_ortu').value.trim();

        // ==========================================
        // VALIDASI NISN (HARUS 10 DIGIT)
        // ==========================================
        if (nisnValue.length !== 10) {
            showNotification('warning', 'Format Tidak Valid', 'NISN harus terdiri dari tepat 10 digit angka.');
            btnSubmitText.innerHTML = `Kirim Pendaftaran <ion-icon name="checkmark-done-outline"></ion-icon>`;
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('opacity-70', 'cursor-not-allowed');
            return; // Hentikan proses simpan
        }

        // ==========================================
        // 1. CEK DUPLIKASI NOMOR WA ORTU
        // ==========================================
        const { data: hpData, error: hpError } = await supabaseClient
            .from('ppdb')
            .select('no_hp_ortu')
            .eq('no_hp_ortu', noHpOrtuValue);
            
        if (hpError) throw hpError;
        if (hpData && hpData.length > 0) {
            showNotification('error', 'Pendaftaran Ditolak!', 'Nomor WA Orang Tua ini sudah pernah didaftarkan. Silakan hubungi panitia di WA +6287884234210 jika ini adalah kesalahan.');
            btnSubmitText.innerHTML = `Kirim Pendaftaran <ion-icon name="checkmark-done-outline"></ion-icon>`;
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('opacity-70', 'cursor-not-allowed');
            return; // Hentikan proses simpan
        }

        // ==========================================
        // 2. CEK DUPLIKASI NISN (Hanya jika diisi)
        // ==========================================
        if (nisnValue !== '') {
            const { data: nisnData, error: nisnError } = await supabaseClient
                .from('ppdb')
                .select('nisn')
                .eq('nisn', nisnValue);
                
            if (nisnError) throw nisnError;
            if (nisnData && nisnData.length > 0) {
                showNotification('error', 'Pendaftaran Ditolak!', 'NISN ini sudah terdaftar di sistem kami. Silakan hubungi panitia di WA +6287884234210 jika ini adalah kesalahan.');
                btnSubmitText.innerHTML = `Kirim Pendaftaran <ion-icon name="checkmark-done-outline"></ion-icon>`;
                btnSubmit.disabled = false;
                btnSubmit.classList.remove('opacity-70', 'cursor-not-allowed');
                return; // Hentikan proses simpan
            }
        }

        // ==========================================
        // 3. UPLOAD BERKAS KE STORAGE
        // ==========================================
        const uploadTasks = [
            { id: 'berkas_ktp', folder: 'KTP' },
            { id: 'berkas_kk', folder: 'KK' },
            { id: 'berkas_akta', folder: 'AKTA' },
            { id: 'berkas_ijazah', folder: 'IJAZAH' }
        ];

        const filesToUpload = uploadTasks.filter(task => document.getElementById(task.id).files.length > 0);
        const totalFiles = filesToUpload.length;
        let filesUploaded = 0;
        const urls = {};

        if (totalFiles > 0) {
            btnSubmitText.innerHTML = `<ion-icon name="cloud-upload-outline" class="animate-pulse"></ion-icon> Mengunggah Berkas (0/${totalFiles})...`;

            for (const task of filesToUpload) {
                const url = await uploadBerkas(task.id, task.folder);
                urls[task.id] = url;
                filesUploaded++;
                const progress = (filesUploaded / totalFiles) * 100;
                progressBar.style.width = `${progress}%`;
                btnSubmitText.innerHTML = `<ion-icon name="cloud-upload-outline" class="animate-pulse"></ion-icon> Mengunggah Berkas (${filesUploaded}/${totalFiles})...`;
            }
        }

        const urlKtp = urls['berkas_ktp'] || null;
        const urlKk = urls['berkas_kk'] || null;
        const urlAkta = urls['berkas_akta'] || null;
        const urlIjazah = urls['berkas_ijazah'] || null;

        btnSubmitText.innerHTML = `<ion-icon name="sync-outline" class="animate-spin"></ion-icon> Menyimpan Data...`;
        // Proses Insert ke Supabase menggunakan supabaseClient
        const { error } = await supabaseClient
            .from('ppdb')
            .insert([{ 
                // 1. Data Siswa
                nama: document.getElementById('nama').value,
                jenis_kelamin: document.getElementById('jenis_kelamin').value,
                tempat_lahir: document.getElementById('tempat_lahir').value,
                tanggal_lahir: document.getElementById('tanggal_lahir').value,
                nisn: document.getElementById('nisn').value,
                agama: document.getElementById('agama').value,
                alamat: document.getElementById('alamat').value,
                
                // 2. Data Orang Tua
                nama_ayah: document.getElementById('nama_ayah').value,
                nama_ibu: document.getElementById('nama_ibu').value,
                pekerjaan_ayah: document.getElementById('pekerjaan_ayah').value,
                pekerjaan_ibu: document.getElementById('pekerjaan_ibu').value,
                no_hp_ortu: document.getElementById('no_hp_ortu').value,
                
                // 3. Kontak Siswa
                no_hp_siswa: document.getElementById('no_hp_siswa').value,
                email_siswa: document.getElementById('email_siswa').value,
                
                // 4. Sekolah Asal
                asal_sekolah: document.getElementById('asal_sekolah').value,
                alamat_sekolah: document.getElementById('alamat_sekolah').value,
                tahun_lulus: document.getElementById('tahun_lulus').value,

                // Status Default (tidak ada di form)
                status: 'pending',
                no_hp: document.getElementById('no_hp_ortu').value, // Menyimpan no ortu ke field no_hp lama sebagai backup

                // 5. Berkas Pendukung (URL Storage)
                berkas_ktp: urlKtp,
                berkas_kk: urlKk,
                berkas_akta: urlAkta,
                berkas_ijazah: urlIjazah
            }]);

        if (error) throw error;

        // Memunculkan Notifikasi Custom yang mengarahkan ke Portal Siswa
        Swal.fire({
            icon: 'success',
            title: 'Pendaftaran Berhasil!',
            text: 'Alhamdulillah, data masuk ke sistem. Gunakan NISN Anda untuk memantau status secara berkala di Portal Siswa.',
            showCancelButton: true,
            confirmButtonText: 'Buka Portal Siswa',
            cancelButtonText: 'Tutup',
            confirmButtonColor: '#27AE60',
            cancelButtonColor: '#6B7280'
        }).then((result) => {
            if (result.isConfirmed) { window.location.href = 'portal-siswa.html'; }
        });
        
        document.getElementById('form-ppdb').reset();

    } catch (error) {
        console.error("Error:", error.message);
        // Jika error berasal dari validasi ukuran file yang kita buat di atas
        if (error.message.includes('terlalu besar')) {
            showNotification('error', 'Ukuran File Terlalu Besar!', error.message);
        } else {
            showNotification('error', 'Pendaftaran Gagal!', 'Gagal mengirim data. Pastikan koneksi internet Anda stabil, lalu coba lagi.');
        }
    } finally {
        progressBar.style.width = '0%';
        btnSubmitText.innerHTML = `Kirim Pendaftaran <ion-icon name="checkmark-done-outline"></ion-icon>`;
        btnSubmit.disabled = false;
        btnSubmit.classList.remove('opacity-70', 'cursor-not-allowed');
    }
}

// ==========================================
// FUNGSI NOTIF
function showNotification(type, title, message) {
    Swal.fire({
        icon: type, // 'success' or 'error'
        title: title,
        text: message,
        confirmButtonColor: type === 'success' ? '#27AE60' : '#d33'
    });
}

// ==========================================
// FUNGSI AUTO-FILL UNTUK TESTING
// ==========================================
function autoFillForm() {
    document.getElementById('nama').value = 'Ahmad Budi Santoso';
    document.getElementById('jenis_kelamin').value = 'Laki-laki';
    document.getElementById('agama').value = 'Islam';
    document.getElementById('tempat_lahir').value = 'Bogor';
    document.getElementById('tanggal_lahir').value = '2010-05-15';
    document.getElementById('nisn').value = '0102345678';
    document.getElementById('alamat').value = 'Jl. Raya Parung No. 123, Bogor, Jawa Barat';
    document.getElementById('nama_ayah').value = 'Budi Hermawan';
    document.getElementById('nama_ibu').value = 'Siti Aminah';
    document.getElementById('pekerjaan_ayah').value = 'Wiraswasta';
    document.getElementById('pekerjaan_ibu').value = 'Ibu Rumah Tangga';
    document.getElementById('no_hp_ortu').value = '081234567890';
    document.getElementById('no_hp_siswa').value = '089876543210';
    document.getElementById('email_siswa').value = 'ahmad.budi@example.com';
    document.getElementById('asal_sekolah').value = 'SDN Parung 01';
    document.getElementById('alamat_sekolah').value = 'Jl. Pendidikan No. 1, Parung';
    document.getElementById('tahun_lulus').value = '2026';
}

// ==========================================
// EVENT LISTENER
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const formPPDB = document.getElementById('form-ppdb');
    if (formPPDB) {
        // Memanggil fungsi submitPPDB saat form di-submit
        formPPDB.addEventListener('submit', submitPPDB);
        
        // JALANKAN AUTO-FILL (Hapus atau comment baris di bawah ini jika testing sudah selesai)
        // autoFillForm();
    }

    // ==========================================
    // FUNGSI LOAD PENGUMUMAN KELULUSAN
    // ==========================================
    async function loadAnnouncements() {
        const container = document.getElementById('announcement-list');
        const dateEl = document.getElementById('announcement-date');
        const emptyEl = document.getElementById('announcement-empty');
        const mainContainer = document.getElementById('announcement-container');

        // Hanya jalankan jika elemen ada di halaman
        if (!container || !dateEl || !emptyEl || !mainContainer) return;

        try {
            const { data, error } = await supabaseClient
                .from('pengumuman')
                .select('data_kelulusan')
                .eq('id', 1)
                .single();

            let diterima = [];
            let ditolak = [];
            let publishedAt = null;
            
            if (data && data.data_kelulusan) {
                let parsedData = data.data_kelulusan;
                // Fallback otomatis jika data dari Supabase berupa string text
                if (typeof parsedData === 'string') {
                    try { parsedData = JSON.parse(parsedData); } catch (e) {}
                }

                if (parsedData.students) {
                    diterima = parsedData.students; // Old format fallback
                } else {
                    diterima = parsedData.diterima || [];
                    ditolak = parsedData.ditolak || [];
                }
                publishedAt = parsedData.published_at;
            }

            if (error || (diterima.length === 0 && ditolak.length === 0)) {
                if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                   throw error;
                }
                mainContainer.classList.add('text-center');
                dateEl.classList.add('hidden');
                container.classList.add('hidden');
                emptyEl.classList.remove('hidden');
                return;
            }

            const publishedDate = new Date(publishedAt);

            dateEl.textContent = `Diterbitkan pada: ${publishedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB`;
            
            container.innerHTML = ''; // Clear loading state
            
            if (diterima.length > 0) {
                const headerDiterima = document.createElement('div');
                headerDiterima.className = 'col-span-full mt-2 mb-2 font-bold text-[#27AE60] text-lg border-b border-green-200 pb-1';
                headerDiterima.textContent = 'DITERIMA';
                container.appendChild(headerDiterima);
                
                diterima.forEach((student, index) => {
                    const studentItem = document.createElement('div');
                    studentItem.className = 'flex items-center gap-3 bg-green-50 p-3 rounded-lg border border-green-100 hover:shadow-md transition';
                    studentItem.innerHTML = `
                        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-green-200 text-green-700 flex items-center justify-center font-bold text-sm">${index + 1}</div>
                        <span class="font-medium text-gray-700">${student}</span>
                    `;
                    container.appendChild(studentItem);
                });
            }

            if (ditolak.length > 0) {
                const headerDitolak = document.createElement('div');
                headerDitolak.className = 'col-span-full mt-6 mb-2 font-bold text-red-500 text-lg border-b border-red-200 pb-1';
                headerDitolak.textContent = 'TIDAK DITERIMA';
                container.appendChild(headerDitolak);
                
                ditolak.forEach((student, index) => {
                    const studentItem = document.createElement('div');
                    studentItem.className = 'flex items-center gap-3 bg-red-50 p-3 rounded-lg border border-red-100 hover:shadow-md transition';
                    studentItem.innerHTML = `
                        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-red-200 text-red-700 flex items-center justify-center font-bold text-sm">${index + 1}</div>
                        <span class="font-medium text-gray-700">${student}</span>
                    `;
                    container.appendChild(studentItem);
                });
            }

        } catch (err) {
            console.error('Error loading announcements:', err);
            dateEl.textContent = 'Gagal memuat data pengumuman.';
            dateEl.classList.add('text-red-500');
            container.innerHTML = '';
        }
    }

    // Panggil fungsi untuk memuat pengumuman
    await loadAnnouncements();
});