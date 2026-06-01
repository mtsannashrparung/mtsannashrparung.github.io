// === KONFIGURASI SUPABASE ===
const supabaseUrl = 'https://ejhmwxqbpmjkvudazjmc.supabase.co';
const supabaseKey = 'sb_publishable_pfloSKirXdrAE2lj7ygHNg_o-aMJPjz';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
const ADMIN_SECRET_KEY = 'rahasia123'; // Kunci rahasia untuk menampilkan form login

// Global Variables
let allData = [];
let currentEditId = null; // null = Tambah Data, isi UUID = Edit Data
let currentPage = 1;
let rowsPerPage = 20; // Menentukan jumlah data per halaman
let filteredDataList = [];
let selectedIds = []; // Menyimpan ID baris yang dicentang

// State khusus untuk Backup
let backupDataList = [];
let filteredBackupList = [];
let selectedBackupIds = [];

// === UI & SIDEBAR ===
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

function showToast(message, type) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        }
    });
    Toast.fire({
        icon: type,
        title: message
    });
}

// ==========================================
// 1. SISTEM AUTENTIKASI (LOGIN / LOGOUT)
// ==========================================
window.onload = async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        showAdminView(session.user);
    } else {
        // FITUR KEAMANAN EKSTRA: Kunci URL Rahasia
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('kunci') === ADMIN_SECRET_KEY) {
            document.getElementById('login-view').classList.remove('hidden');
        } else {
            // Jika iseng menebak admin.html tanpa kunci, lempar kembali ke Beranda
            window.location.href = 'index.html';
        }
    }
};

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        showToast("Login Gagal: Periksa email dan password", "error");
    } else {
        showToast("Login Berhasil!", "success");
        showAdminView(data.user);
    }
});

async function handleLogout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

function showAdminView(user) {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('admin-view').classList.remove('hidden');
    document.getElementById('user-email').innerText = user.email;
    loadData();
}

// Fitur Ganti Password
function openPasswordModal() {
    document.getElementById('password-form').reset();
    document.getElementById('modal-password').classList.remove('hidden');
}

function closePasswordModal() {
    document.getElementById('modal-password').classList.add('hidden');
}

document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        showToast("Konfirmasi password tidak cocok!", "error");
        return;
    }
    
    const btn = document.getElementById('btn-save-password');
    btn.innerHTML = `<ion-icon name="sync" class="animate-spin"></ion-icon> Memproses...`;
    btn.disabled = true;

    try {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;
        showToast("Password berhasil diubah!", "success");
        closePasswordModal();
    } catch (error) {
        showToast("Gagal mengubah password: " + error.message, "error");
    } finally {
        btn.innerHTML = `<ion-icon name="save-outline" class="text-xl"></ion-icon> Simpan`;
        btn.disabled = false;
    }
});

// ==========================================
// 2. FETCH & RENDER DATA
// ==========================================
function renderTableSkeleton() {
    const tbody = document.getElementById('pendaftar-table');
    let skeletonHTML = '';
    for (let i = 0; i < 5; i++) { // Menampilkan 5 baris kerangka loading
        skeletonHTML += `
            <tr class="animate-pulse border-b border-gray-100">
                <td class="px-4 py-4 text-center"><div class="w-4 h-4 bg-gray-200 rounded mx-auto"></div></td>
                <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded w-24"></div></td>
                <td class="px-6 py-4">
                    <div class="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                </td>
                <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded w-full max-w-[150px]"></div></td>
                <td class="px-6 py-4"><div class="h-6 bg-gray-200 rounded-full w-20"></div></td>
                <td class="px-6 py-4 flex justify-center gap-2">
                    <div class="w-8 h-8 bg-gray-200 rounded-lg"></div>
                    <div class="w-8 h-8 bg-gray-200 rounded-lg"></div>
                </td>
            </tr>
        `;
    }
    tbody.innerHTML = skeletonHTML;
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) paginationContainer.innerHTML = '';
}

async function loadData() {
    renderTableSkeleton(); // Tampilkan efek skeleton

    const { data, error } = await supabaseClient
        .from('ppdb')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        showToast("Gagal mengambil data", "error");
        return;
    }

    allData = data;
    applyFilters(); // Terapkan filter & urutan default saat memuat data
    updateStats(allData);
}

function renderTable() {
    const tbody = document.getElementById('pendaftar-table');
    tbody.innerHTML = '';

    if(filteredDataList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-16">
                    <div class="flex flex-col items-center justify-center text-gray-400">
                        <ion-icon name="search-outline" class="text-6xl mb-3 text-gray-200"></ion-icon>
                        <p class="text-lg font-bold text-gray-500">Tidak ada data ditemukan</p>
                        <p class="text-sm mt-1">Coba sesuaikan filter atau kata kunci pencarian Anda.</p>
                    </div>
                </td>
            </tr>`;
        renderPagination(0);
        return;
    }

    // Potong data berdasarkan halaman aktif (Pagination Logic)
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = filteredDataList.slice(startIndex, endIndex);

    paginatedData.forEach(item => {
        const date = new Date(item.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year:'numeric'});
        
        let statusBadge = '';
        if (item.status === 'diterima') statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#27AE60]/10 text-[#27AE60] border border-[#27AE60]/30 flex items-center justify-center gap-1 w-fit mx-auto"><ion-icon name="checkmark-circle" class="text-sm"></ion-icon> Diterima</span>`;
        else if (item.status === 'ditolak') statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/30 flex items-center justify-center gap-1 w-fit mx-auto"><ion-icon name="close-circle" class="text-sm"></ion-icon> Ditolak</span>`;
        else statusBadge = `<span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-400/10 text-yellow-600 border border-yellow-400/30 flex items-center justify-center gap-1 w-fit mx-auto"><ion-icon name="time" class="text-sm"></ion-icon> Menunggu</span>`;
        
        const isChecked = selectedIds.includes(item.id);
        const row = `
            <tr class="hover:bg-gray-50 transition border-b border-gray-100 ${isChecked ? 'bg-[#27AE60]/5' : ''}">
                <td class="px-4 py-4 text-center">
                    <input type="checkbox" class="row-checkbox w-4 h-4 cursor-pointer accent-[#27AE60]" value="${item.id}" ${isChecked ? 'checked' : ''} onchange="toggleRowSelection(this)">
                </td>
                <td class="px-6 py-4 text-gray-600 whitespace-nowrap">${date}</td>
                <td class="px-6 py-4">
                    <button onclick="showDetail('${item.id}')" class="font-bold text-gray-800 hover:text-[#27AE60] transition text-left">
                        ${item.nama}
                    </button>
                    <p class="text-xs text-gray-500 mt-1">NISN: ${item.nisn || '-'}</p>
                </td>
                <td class="px-6 py-4 text-gray-600 text-sm">${item.asal_sekolah}</td>
                <td class="px-6 py-4">
                    ${statusBadge}
                </td>
                <td class="px-6 py-4 flex justify-center gap-2">
                    <button onclick="openModal('${item.id}')" class="w-8 h-8 flex items-center justify-center bg-blue-500/10 hover:bg-blue-500/30 text-blue-500 rounded-lg transition" title="Edit">
                        <ion-icon name="create"></ion-icon>
                    </button>
                    <button onclick="deleteData('${item.id}')" class="w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500/30 text-red-500 rounded-lg transition" title="Hapus">
                        <ion-icon name="trash"></ion-icon>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
    
    renderPagination(filteredDataList.length);
    
    // Perbarui status centang 'Select All' jika berpindah halaman
    const selectAllCb = document.getElementById('select-all');
    if (selectAllCb) {
        const allCurrentCb = Array.from(document.querySelectorAll('.row-checkbox'));
        selectAllCb.checked = allCurrentCb.length > 0 && allCurrentCb.every(c => c.checked);
    }
}

function updateStats(data) {
    document.getElementById('stat-total').innerText = data.length;
    document.getElementById('stat-pending').innerText = data.filter(d => d.status === 'pending').length;
    document.getElementById('stat-diterima').innerText = data.filter(d => d.status === 'diterima').length;
}

// ==========================================
// FITUR PAGINASI (HALAMAN)
// ==========================================
function renderPagination(totalItems) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / rowsPerPage);

    if (totalPages <= 1) {
        paginationContainer.innerHTML = ''; // Sembunyikan jika cuma 1 halaman
        return;
    }

    let html = `
    <div class="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-4">
        <div class="flex flex-1 justify-between sm:hidden">
            <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Previous</button>
            <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Next</button>
        </div>
        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
                <p class="text-sm text-gray-700">
                    Menampilkan <span class="font-medium">${(currentPage - 1) * rowsPerPage + 1}</span> sampai <span class="font-medium">${Math.min(currentPage * rowsPerPage, totalItems)}</span> dari <span class="font-medium">${totalItems}</span> data
                </p>
            </div>
            <div>
                <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 transition">
                        <span class="sr-only">Previous</span>
                        <ion-icon name="chevron-back-outline" class="h-5 w-5"></ion-icon>
                    </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<button aria-current="page" class="relative z-10 inline-flex items-center bg-[#27AE60] px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27AE60]">${i}</button>`;
        } else {
            html += `<button onclick="changePage(${i})" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 transition">${i}</button>`;
        }
    }

    html += `
                    <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 transition">
                        <span class="sr-only">Next</span>
                        <ion-icon name="chevron-forward-outline" class="h-5 w-5"></ion-icon>
                    </button>
                </nav>
            </div>
        </div>
    </div>`;

    paginationContainer.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredDataList.length / rowsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
}

// ==========================================
// 3. SEARCH & FILTER
// ==========================================

// Implementasi Debounce untuk Pencarian Utama (Optimalisasi Performa CPU)
let searchTimeout;
document.getElementById('search').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        applyFilters();
    }, 300); // Proses pencarian ditunda sampai Admin berhenti mengetik selama 300ms
});
document.getElementById('filter-status').addEventListener('change', applyFilters);
document.getElementById('sort-data').addEventListener('change', applyFilters);
document.getElementById('rows-per-page').addEventListener('change', (e) => {
    if (e.target.value === 'all') {
        rowsPerPage = 999999; // Angka sangat besar untuk menampilkan semua data
    } else {
        rowsPerPage = parseInt(e.target.value);
    }
    currentPage = 1; // Kembali ke halaman pertama setiap ganti jumlah baris
    renderTable();
});

function applyFilters() {
    const keyword = document.getElementById('search').value.toLowerCase();
    const status = document.getElementById('filter-status').value;
    const sortBy = document.getElementById('sort-data').value;

    filteredDataList = allData.filter(item => {
        const matchName = item.nama.toLowerCase().includes(keyword);
        const matchSchool = item.asal_sekolah.toLowerCase().includes(keyword);
        const matchStatus = status === 'all' || item.status === status;
        
        return (matchName || matchSchool) && matchStatus;
    });

    // Terapkan Pengurutan (Sorting)
    filteredDataList.sort((a, b) => {
        if (sortBy === 'newest') {
            return new Date(b.created_at) - new Date(a.created_at);
        } else if (sortBy === 'oldest') {
            return new Date(a.created_at) - new Date(b.created_at);
        } else if (sortBy === 'name_asc') {
            return a.nama.localeCompare(b.nama);
        } else if (sortBy === 'name_desc') {
            return b.nama.localeCompare(a.nama);
        }
    });

    currentPage = 1; // Reset ke halaman 1 setiap kali mencari atau mengurutkan
    renderTable();
}

// ==========================================
// 4. CRUD (TAMBAH, EDIT, HAPUS)
// ==========================================
function setupEditBerkasView(type, url) {
    const container = document.getElementById(`edit-view-${type}`);
    const link = document.getElementById(`edit-link-${type}`);
    if (url) {
        link.href = url;
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

function openModal(id = null) {
    currentEditId = id;
    const form = document.getElementById('admin-form');
    const modalTitle = document.getElementById('modal-title-text');
    
    if (id) {
        // Mode EDIT
        modalTitle.innerHTML = `<ion-icon name="create-outline"></ion-icon> <span>Edit Data Siswa</span>`;
        const item = allData.find(d => d.id === id);
        if (item) {
            document.getElementById('edit-status').value = item.status;
            document.getElementById('edit-catatan').value = item.catatan_admin || '';
            document.getElementById('edit-nama').value = item.nama;
            document.getElementById('edit-jk').value = item.jenis_kelamin;
            document.getElementById('edit-agama').value = item.agama;
            document.getElementById('edit-tempat-lahir').value = item.tempat_lahir;
            document.getElementById('edit-tanggal-lahir').value = item.tanggal_lahir;
            document.getElementById('edit-nisn').value = item.nisn;
            document.getElementById('edit-alamat').value = item.alamat;
            document.getElementById('edit-ayah').value = item.nama_ayah;
            document.getElementById('edit-ibu').value = item.nama_ibu;
            document.getElementById('edit-kerja-ayah').value = item.pekerjaan_ayah;
            document.getElementById('edit-kerja-ibu').value = item.pekerjaan_ibu;
            document.getElementById('edit-nohp-ortu').value = item.no_hp_ortu;
            document.getElementById('edit-nohp-siswa').value = item.no_hp_siswa;
            document.getElementById('edit-email-siswa').value = item.email_siswa;
            document.getElementById('edit-sekolah').value = item.asal_sekolah;
            document.getElementById('edit-alamat-sekolah').value = item.alamat_sekolah;
            document.getElementById('edit-lulus').value = item.tahun_lulus;

            // Tampilkan link ke dokumen saat ini jika ada
            setupEditBerkasView('ktp', item.berkas_ktp);
            setupEditBerkasView('kk', item.berkas_kk);
            setupEditBerkasView('akta', item.berkas_akta);
            setupEditBerkasView('ijazah', item.berkas_ijazah);
        }
    } else {
        // Mode TAMBAH BARU
        modalTitle.innerHTML = `<ion-icon name="person-add-outline"></ion-icon> <span>Tambah Pendaftar</span>`;
        form.reset();
        document.getElementById('edit-status').value = 'pending';
        document.getElementById('edit-catatan').value = '';

        // Sembunyikan preview link karena ini data baru
        setupEditBerkasView('ktp', null);
        setupEditBerkasView('kk', null);
        setupEditBerkasView('akta', null);
        setupEditBerkasView('ijazah', null);
    }

    document.getElementById('modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

async function uploadBerkasAdmin(fileElementId, folderName) {
    const fileInput = document.getElementById(fileElementId);
    if (!fileInput || fileInput.files.length === 0) return null;

    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
    const filePath = `${folderName}/${fileName}`;

    const { error } = await supabaseClient.storage.from('berkas_ppdb').upload(filePath, file);
    if (error) throw error;

    const { data } = supabaseClient.storage.from('berkas_ppdb').getPublicUrl(filePath);
    return data.publicUrl;
}

document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('btn-save');
    btn.innerHTML = `<ion-icon name="sync" class="animate-spin"></ion-icon> Memproses & Mengunggah...`;
    btn.disabled = true;

        // Validasi Keamanan: Pastikan Nomor HP hanya berisi angka sebelum diproses ke database
        const noHpOrtu = document.getElementById('edit-nohp-ortu').value;
        const noHpSiswa = document.getElementById('edit-nohp-siswa').value;
        
        if (noHpOrtu && !/^[0-9]+$/.test(noHpOrtu)) {
            showToast("Format Tidak Valid: Nomor HP Orang Tua hanya boleh berisi angka!", "error");
            btn.innerHTML = `<ion-icon name="save-outline"></ion-icon> Simpan Data`;
            btn.disabled = false;
            return;
        }
        if (noHpSiswa && !/^[0-9]+$/.test(noHpSiswa)) {
            showToast("Format Tidak Valid: Nomor HP Siswa hanya boleh berisi angka!", "error");
            btn.innerHTML = `<ion-icon name="save-outline"></ion-icon> Simpan Data`;
            btn.disabled = false;
            return;
        }

    try {
        // Upload file jika ada yang diisi (jika tidak, ini akan me-return null)
        const urlKtp = await uploadBerkasAdmin('edit-berkas-ktp', 'KTP');
        const urlKk = await uploadBerkasAdmin('edit-berkas-kk', 'KK');
        const urlAkta = await uploadBerkasAdmin('edit-berkas-akta', 'AKTA');
        const urlIjazah = await uploadBerkasAdmin('edit-berkas-ijazah', 'IJAZAH');

        const payload = {
            status: document.getElementById('edit-status').value,
            catatan_admin: document.getElementById('edit-catatan').value,
            nama: document.getElementById('edit-nama').value,
            jenis_kelamin: document.getElementById('edit-jk').value,
            agama: document.getElementById('edit-agama').value,
            tempat_lahir: document.getElementById('edit-tempat-lahir').value,
            tanggal_lahir: document.getElementById('edit-tanggal-lahir').value,
            nisn: document.getElementById('edit-nisn').value,
            alamat: document.getElementById('edit-alamat').value,
            nama_ayah: document.getElementById('edit-ayah').value,
            nama_ibu: document.getElementById('edit-ibu').value,
            pekerjaan_ayah: document.getElementById('edit-kerja-ayah').value,
            pekerjaan_ibu: document.getElementById('edit-kerja-ibu').value,
            no_hp_ortu: document.getElementById('edit-nohp-ortu').value,
            no_hp_siswa: document.getElementById('edit-nohp-siswa').value,
            email_siswa: document.getElementById('edit-email-siswa').value,
            asal_sekolah: document.getElementById('edit-sekolah').value,
            alamat_sekolah: document.getElementById('edit-alamat-sekolah').value,
            tahun_lulus: document.getElementById('edit-lulus').value
        };

        // Hanya timpa data URL berkas jika Admin mengunggah file baru
        if (urlKtp) payload.berkas_ktp = urlKtp;
        if (urlKk) payload.berkas_kk = urlKk;
        if (urlAkta) payload.berkas_akta = urlAkta;
        if (urlIjazah) payload.berkas_ijazah = urlIjazah;

        let error;
        if (currentEditId) {
            const res = await supabaseClient.from('ppdb').update(payload).eq('id', currentEditId);
            error = res.error;
        } else {
            const res = await supabaseClient.from('ppdb').insert([payload]);
            error = res.error;
        }

        if (error) throw error;

        showToast(currentEditId ? "Data diperbarui!" : "Data ditambahkan!", "success");
        closeModal();
        loadData(); // Refresh table
    } catch (err) {
        showToast("Gagal menyimpan: " + err.message, "error");
    } finally {
        btn.innerHTML = `<ion-icon name="save-outline"></ion-icon> Simpan Data`;
        btn.disabled = false;
    }
});

async function deleteData(id) {
    const result = await Swal.fire({
        title: 'Hapus Data?',
        text: "Apakah Anda yakin ingin menghapus data siswa ini secara permanen?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
        Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const { error } = await supabaseClient.from('ppdb').delete().eq('id', id);
        if (error) {
            Swal.fire('Gagal!', 'Gagal menghapus data', 'error');
        } else {
            Swal.fire('Terhapus!', 'Data berhasil dihapus!', 'success');
            loadData();
        }
    }
}

// ==========================================
// FITUR AKSI MASSAL (BULK ACTIONS)
// ==========================================
function toggleSelectAll(source) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = source.checked;
        // Update selectedIds array tanpa langsung memanggil update UI agar lebih cepat
        if (cb.checked && !selectedIds.includes(cb.value)) selectedIds.push(cb.value);
        if (!cb.checked) selectedIds = selectedIds.filter(id => id !== cb.value);
    });
    renderTable(); // Render ulang agar baris terpilih berubah warnanya
    updateBulkActionBar();
}

function toggleRowSelection(cb) {
    if (cb.checked) {
        if (!selectedIds.includes(cb.value)) selectedIds.push(cb.value);
    } else {
        selectedIds = selectedIds.filter(id => id !== cb.value);
    }
    cb.closest('tr').classList.toggle('bg-[#27AE60]/5', cb.checked);
    
    const selectAllCb = document.getElementById('select-all');
    if (selectAllCb) {
        const allCurrentCb = Array.from(document.querySelectorAll('.row-checkbox'));
        selectAllCb.checked = allCurrentCb.length > 0 && allCurrentCb.every(c => c.checked);
    }
    updateBulkActionBar();
}

function updateBulkActionBar() {
    const bar = document.getElementById('bulk-action-bar');
    const countSpan = document.getElementById('selected-count');
    if (selectedIds.length > 0) {
        bar.classList.remove('hidden');
        countSpan.innerText = selectedIds.length;
    } else {
        bar.classList.add('hidden');
    }
}

async function applyBulkStatus() {
    const newStatus = document.getElementById('bulk-status-select').value;
    if (!newStatus) { showToast("Pilih status terlebih dahulu!", "error"); return; }
    showToast("Memproses...", "success");
    
    const { error } = await supabaseClient.from('ppdb').update({ status: newStatus }).in('id', selectedIds);
    if (error) { showToast("Gagal memperbarui status", "error"); } 
    else { showToast(`${selectedIds.length} data diperbarui!`, "success"); resetBulkSelection(); }
}

async function applyBulkDelete() {
    const result = await Swal.fire({
        title: 'Hapus Data Terpilih?',
        text: `Yakin ingin menghapus ${selectedIds.length} data siswa secara permanen?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    });
    if (result.isConfirmed) {
        Swal.fire({ title: 'Menghapus data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const { error } = await supabaseClient.from('ppdb').delete().in('id', selectedIds);
        if (error) { Swal.fire('Gagal!', "Gagal menghapus data", 'error'); } 
        else { Swal.fire('Terhapus!', `${selectedIds.length} data dihapus!`, 'success'); resetBulkSelection(); }
    }
}

function resetBulkSelection() {
    selectedIds = [];
    document.getElementById('select-all').checked = false;
    updateBulkActionBar();
    loadData();
}

// ==========================================
// 5. PUBLISH ANNOUNCEMENT
// ==========================================
async function publishAnnouncements() {
    const result = await Swal.fire({
        title: 'Publikasi Pengumuman?',
        text: "Anda yakin ingin mempublikasikan daftar siswa yang diterima saat ini ke papan pengumuman? Data pengumuman sebelumnya akan ditimpa.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#27AE60',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Publikasikan!',
        cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
        Swal.fire({ title: 'Memproses publikasi...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const btn = document.querySelector('button[onclick="publishAnnouncements()"]');
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = `<ion-icon name="sync" class="animate-spin text-lg"></ion-icon> Mempublikasikan...`;
            btn.disabled = true;
            btn.classList.add('opacity-70', 'cursor-not-allowed');
        }

        try {
            // 1. Fetch accepted students
            const { data: acceptedStudents, error: fetchError } = await supabaseClient
                .from('ppdb')
                .select('nama, status')
                .in('status', ['diterima', 'ditolak'])
                .order('nama', { ascending: true });

            if (fetchError) throw fetchError;

            // 2. Prepare the payload
            const diterima = acceptedStudents.filter(s => s.status === 'diterima').map(s => s.nama);
            const ditolak = acceptedStudents.filter(s => s.status === 'ditolak').map(s => s.nama);
            
            const payload = {
                id: 1, // Always update the same row
                data_kelulusan: {
                    diterima: diterima,
                    ditolak: ditolak,
                    published_at: new Date().toISOString()
                }
            };

            // 3. Upsert to 'pengumuman' table
            const { error: upsertError } = await supabaseClient
                .from('pengumuman')
                .upsert(payload, { onConflict: 'id' });

            if (upsertError) throw upsertError;

            Swal.fire('Berhasil!', "Pengumuman berhasil dipublikasikan!", 'success');
        } catch (error) {
            console.error("Gagal mempublikasikan pengumuman:", error);
            Swal.fire('Gagal!', `Terjadi kesalahan: ${error.message}`, 'error');
        } finally {
            if (btn) {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
                btn.classList.remove('opacity-70', 'cursor-not-allowed');
            }
        }
    }
}

// ==========================================
// 6. DETAIL MODAL
// ==========================================

function showDetail(id) {
    const siswa = allData.find(s => s.id === id);
    if (!siswa) return;
    
    document.getElementById('modal-nama').innerText = siswa.nama;
    document.getElementById('det-jk').innerText = siswa.jenis_kelamin;
    document.getElementById('det-agama').innerText = siswa.agama;
    document.getElementById('det-ttl').innerText = `${siswa.tempat_lahir}, ${siswa.tanggal_lahir}`;
    document.getElementById('det-nisn').innerText = siswa.nisn || '-';
    document.getElementById('det-hp-siswa').innerText = siswa.no_hp_siswa || '-';
    document.getElementById('det-email-siswa').innerText = siswa.email_siswa || '-';
    document.getElementById('det-alamat').innerText = siswa.alamat;
    
    document.getElementById('det-ayah').innerText = siswa.nama_ayah;
    document.getElementById('det-kerja-ayah').innerText = siswa.pekerjaan_ayah || '-';
    document.getElementById('det-ibu').innerText = siswa.nama_ibu;
    document.getElementById('det-kerja-ibu').innerText = siswa.pekerjaan_ibu || '-';
    
    document.getElementById('det-hp-ortu').innerText = siswa.no_hp_ortu;
    document.getElementById('det-wa-ortu').href = `https://wa.me/62${siswa.no_hp_ortu.replace(/^0/, '')}`;
    
    document.getElementById('det-sekolah').innerText = siswa.asal_sekolah;
    document.getElementById('det-lulus').innerText = siswa.tahun_lulus;
    document.getElementById('det-alamat-sekolah').innerText = siswa.alamat_sekolah || '-';

    // Menampilkan link berkas
    const files = [
        { id: 'ktp', url: siswa.berkas_ktp },
        { id: 'kk', url: siswa.berkas_kk },
        { id: 'akta', url: siswa.berkas_akta },
        { id: 'ijazah', url: siswa.berkas_ijazah }
    ];

    files.forEach(file => {
        const containerEl = document.getElementById(`container-berkas-${file.id}`);
        const linkEl = document.getElementById(`det-berkas-${file.id}`);
        const imgEl = document.getElementById(`img-berkas-${file.id}`);
        const emptyEl = document.getElementById(`det-berkas-${file.id}-empty`);
        
        if (file.url) {
            linkEl.href = file.url;
            imgEl.src = file.url;
            containerEl.classList.remove('hidden');
            emptyEl.classList.add('hidden');
        } else {
            containerEl.classList.add('hidden');
            emptyEl.classList.remove('hidden');
            imgEl.src = '';
        }
    });

    document.getElementById('modal-detail').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
    document.getElementById('modal-detail').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// ==========================================
// 7. EXPORT EXCEL (CSV)
// ==========================================
function exportToExcel() {
    if (allData.length === 0) {
        showToast("Tidak ada data untuk diexport", "error");
        return;
    }

    // Gunakan separator titik koma (;) agar terbaca per kolom di MS Excel Indonesia
    const separator = ";";
    let csvContent = "";

    // Header CSV
    csvContent += "Tgl Daftar,Status,Nama Lengkap,Jenis Kelamin,Tempat Lahir,Tgl Lahir,NISN,Agama,Alamat,Asal Sekolah,Tahun Lulus,Nama Ayah,Pekerjaan Ayah,Nama Ibu,Pekerjaan Ibu,No HP Ortu".replace(/,/g, separator) + "\n";
    
    // Looping Data
    allData.forEach(row => {
        let r = [
            new Date(row.created_at).toLocaleDateString('id-ID'),
            row.status,
            `"${row.nama || ''}"`,
            row.jenis_kelamin,
            `"${row.tempat_lahir || ''}"`,
            row.tanggal_lahir,
            `"${row.nisn || ''}"`,
            row.agama,
            `"${(row.alamat || '').replace(/\n/g, " ")}"`,
            `"${row.asal_sekolah || ''}"`,
            row.tahun_lulus,
            `"${row.nama_ayah || ''}"`,
            `"${row.pekerjaan_ayah || ''}"`,
            `"${row.nama_ibu || ''}"`,
            `"${row.pekerjaan_ibu || ''}"`,
            `"${row.no_hp_ortu || ''}"`
        ];
        csvContent += r.join(separator) + "\n";
    });

    // Proses Download
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Data_PPDB_MTs_${new Date().toLocaleDateString('id-ID')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast("Data berhasil diexport!", "success");
}

// ==========================================
// 8. PENGELOLAAN GALERI KEGIATAN
// ==========================================

// Fungsi Switch Menu
function switchView(viewName) {
    const btnDash = document.getElementById('menu-dashboard');
    const btnGal = document.getElementById('menu-galeri');
    const btnBerita = document.getElementById('menu-berita');
    const btnSertifikat = document.getElementById('menu-sertifikat');
    const btnBackup = document.getElementById('menu-backup');
    const btnPengaturan = document.getElementById('menu-pengaturan');
    const viewDash = document.getElementById('content-dashboard');
    const viewGal = document.getElementById('content-galeri');
    const viewBerita = document.getElementById('content-berita');
    const viewSertifikat = document.getElementById('content-sertifikat');
    const viewBackup = document.getElementById('content-backup');
    const viewPengaturan = document.getElementById('content-pengaturan');

    // Reset Class
    btnDash.className = "flex items-center gap-3 px-4 py-3 border-l-4 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-r-xl font-bold transition";
    btnGal.className = "flex items-center gap-3 px-4 py-3 border-l-4 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-r-xl font-bold transition";
    btnBerita.className = "flex items-center gap-3 px-4 py-3 border-l-4 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-r-xl font-bold transition";
    btnSertifikat.className = "flex items-center gap-3 px-4 py-3 border-l-4 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-r-xl font-bold transition";
    btnBackup.className = "flex items-center gap-3 px-4 py-3 border-l-4 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-r-xl font-bold transition";
    if(btnPengaturan) btnPengaturan.className = "flex items-center gap-3 px-4 py-3 border-l-4 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-r-xl font-bold transition";
    viewDash.classList.add('hidden');
    viewGal.classList.add('hidden');
    viewBerita.classList.add('hidden');
    viewSertifikat.classList.add('hidden');
    viewBackup.classList.add('hidden');
    if(viewPengaturan) viewPengaturan.classList.add('hidden');

    // Set Active
    if (viewName === 'dashboard') {
        btnDash.className = "flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#27AE60]/20 to-transparent border-l-4 border-[#27AE60] text-[#27AE60] rounded-r-xl font-bold transition";
        viewDash.classList.remove('hidden');
    } else if (viewName === 'galeri') {
        btnGal.className = "flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#27AE60]/20 to-transparent border-l-4 border-[#27AE60] text-[#27AE60] rounded-r-xl font-bold transition";
        viewGal.classList.remove('hidden');
        loadGaleriAdmin(); // Load data saat menu diklik
    } else if (viewName === 'berita') {
        btnBerita.className = "flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#27AE60]/20 to-transparent border-l-4 border-[#27AE60] text-[#27AE60] rounded-r-xl font-bold transition";
        viewBerita.classList.remove('hidden');
        loadBeritaAdmin(); // Load data berita saat menu diklik
    } else if (viewName === 'sertifikat') {
        btnSertifikat.className = "flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-yellow-500/20 to-transparent border-l-4 border-yellow-500 text-yellow-600 rounded-r-xl font-bold transition";
        viewSertifikat.classList.remove('hidden');
        loadSertifikatAdmin(); // Load data sertifikat
    } else if (viewName === 'backup') {
        btnBackup.className = "flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500/20 to-transparent border-l-4 border-purple-500 text-purple-600 rounded-r-xl font-bold transition";
        viewBackup.classList.remove('hidden');
        loadBackupAdmin(); // Load data arsip
    } else if (viewName === 'pengaturan') {
        if(btnPengaturan) btnPengaturan.className = "flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500/20 to-transparent border-l-4 border-blue-500 text-blue-600 rounded-r-xl font-bold transition";
        if(viewPengaturan) viewPengaturan.classList.remove('hidden');
        loadPengaturanWeb();
    }

    if (window.innerWidth < 768) toggleSidebar(); // Tutup sidebar di HP
}

// Ambil data Galeri
async function loadGaleriAdmin() {
    const grid = document.getElementById('galeri-admin-grid');
    document.getElementById('loading-galeri').classList.remove('hidden');
    grid.innerHTML = '';

    const { data, error } = await supabaseClient.from('galeri').select('*').order('created_at', { ascending: false });
    document.getElementById('loading-galeri').classList.add('hidden');

    if (error) { showToast("Gagal memuat galeri", "error"); return; }
    if (data.length === 0) { grid.innerHTML = `<div class="col-span-full text-center py-16 flex flex-col items-center"><ion-icon name="images-outline" class="text-6xl mb-4 text-gray-200"></ion-icon><p class="text-lg font-bold text-gray-500">Belum ada foto galeri.</p><p class="text-sm text-gray-400 mt-1">Silakan klik "Upload Foto" untuk menambahkan.</p></div>`; return; }

    data.forEach(item => {
        grid.innerHTML += `
            <div class="relative aspect-square bg-gray-200 rounded-xl overflow-hidden group shadow-sm border border-gray-200">
                <img src="${item.image_url}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onclick="deleteFotoGaleri('${item.id}', '${item.image_url}')" class="bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform">
                        <ion-icon name="trash"></ion-icon>
                    </button>
                </div>
            </div>`;
    });
}

// Upload Foto Galeri
async function uploadFotoGaleri(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const totalFiles = files.length;
    showToast(`Sedang mengunggah ${totalFiles} foto...`, "success");
    
    // Tampilkan progress bar
    const progressContainer = document.getElementById('galeri-upload-progress-container');
    const progressBar = document.getElementById('galeri-upload-progress-bar');
    const progressStatus = document.getElementById('galeri-upload-status');
    const progressPercentage = document.getElementById('galeri-upload-percentage');

    if (progressContainer) progressContainer.classList.remove('hidden');
    if (progressBar) progressBar.style.width = '0%';
    if (progressStatus) progressStatus.innerText = `Mengunggah 0 dari ${totalFiles} foto...`;
    if (progressPercentage) progressPercentage.innerText = `0%`;

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        // Menambahkan index (i) ke nama file untuk menghindari duplikasi saat upload bersamaan
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,8)}_${i}.${fileExt}`;

        // Upload ke bucket 'galeri_sekolah'
        const { error: uploadError } = await supabaseClient.storage.from('galeri_sekolah').upload(fileName, file);
        if (uploadError) { 
            errorCount++; 
        } else {
            // Simpan ke database 'galeri'
            const { data: urlData } = supabaseClient.storage.from('galeri_sekolah').getPublicUrl(fileName);
            await supabaseClient.from('galeri').insert([{ image_url: urlData.publicUrl }]);
            successCount++;
        }

        // Update Progress
        const uploadedSoFar = i + 1;
        const percentage = Math.round((uploadedSoFar / totalFiles) * 100);
        
        if (progressBar) progressBar.style.width = `${percentage}%`;
        if (progressStatus) progressStatus.innerText = `Mengunggah ${uploadedSoFar} dari ${totalFiles} foto...`;
        if (progressPercentage) progressPercentage.innerText = `${percentage}%`;
    }

    if (errorCount > 0) {
        showToast(`Selesai! Berhasil: ${successCount}, Gagal: ${errorCount}`, "error");
    } else {
        showToast(`${successCount} foto berhasil ditambahkan!`, "success");
    }

    event.target.value = '';
    
    // Sembunyikan progress bar setelah selesai (jeda 1.5 detik agar tulisan 100% terlihat)
    setTimeout(() => {
        if (progressContainer) progressContainer.classList.add('hidden');
    }, 1500);

    loadGaleriAdmin();
}

// Hapus Foto Galeri
async function deleteFotoGaleri(id, url) {
    const result = await Swal.fire({
        title: 'Hapus Foto?',
        text: "Hapus foto ini secara permanen dari galeri?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    });
    if (result.isConfirmed) {
        Swal.fire({ title: 'Menghapus foto...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const fileName = url.split('/').pop();
        await supabaseClient.from('galeri').delete().eq('id', id); // Hapus DB
        await supabaseClient.storage.from('galeri_sekolah').remove([fileName]); // Hapus Storage
        Swal.fire('Terhapus!', 'Foto berhasil dihapus!', 'success');
        loadGaleriAdmin();
    }
}

// ==========================================
// 9. PENGELOLAAN BERITA (ARTIKEL)
// ==========================================

async function loadBeritaAdmin() {
    const grid = document.getElementById('berita-admin-grid');
    document.getElementById('loading-berita').classList.remove('hidden');
    grid.innerHTML = '';

    const { data, error } = await supabaseClient.from('berita').select('*').order('created_at', { ascending: false });
    document.getElementById('loading-berita').classList.add('hidden');

    if (error) { showToast("Gagal memuat berita", "error"); return; }
    if (data.length === 0) { grid.innerHTML = `<div class="col-span-full text-center py-16 flex flex-col items-center"><ion-icon name="newspaper-outline" class="text-6xl mb-4 text-gray-200"></ion-icon><p class="text-lg font-bold text-gray-500">Belum ada berita.</p><p class="text-sm text-gray-400 mt-1">Klik "Tulis Berita" untuk mulai mempublikasikan artikel.</p></div>`; return; }

    data.forEach(item => {
        grid.innerHTML += `
            <div class="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 flex flex-col h-full group">
                <div class="h-40 overflow-hidden relative">
                    <img src="${item.image_url}" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button onclick="editBerita('${item.id}')" class="bg-blue-500 hover:bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform shadow-lg"><ion-icon name="create"></ion-icon></button>
                        <button onclick="deleteBerita('${item.id}', '${item.image_url}')" class="bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform shadow-lg"><ion-icon name="trash"></ion-icon></button>
                    </div>
                </div>
                <div class="p-5 flex flex-col flex-grow">
                    <p class="text-xs text-gray-400 mb-2">${new Date(item.created_at).toLocaleDateString('id-ID')}</p>
                    <h3 class="font-bold text-gray-800 leading-tight mb-2 line-clamp-2">${item.judul}</h3>
                    <p class="text-sm text-gray-500 line-clamp-2 flex-grow">${item.ringkasan}</p>
                </div>
            </div>`;
    });
}

let currentBeritaData = []; // Untuk cache data berita

// Inisialisasi Editor Teks (Quill)
let quillEditor;
document.addEventListener("DOMContentLoaded", () => {
    if(document.getElementById('berita-konten')) {
        quillEditor = new Quill('#berita-konten', {
            theme: 'snow',
            placeholder: 'Ketik konten berita di sini...',
            modules: { toolbar: [ ['bold', 'italic', 'underline', 'strike'], ['blockquote', 'code-block'], [{ 'header': 1 }, { 'header': 2 }], [{ 'list': 'ordered'}, { 'list': 'bullet' }], [{ 'align': [] }], ['clean'], ['link'] ] }
        });
    }
});

function openModalBerita() {
    document.getElementById('berita-form').reset();
    document.getElementById('edit-berita-id').value = '';
    document.getElementById('modal-berita-title').innerHTML = `<ion-icon name="document-text-outline"></ion-icon> <span>Tulis Berita Baru</span>`;
    document.getElementById('berita-image').required = true; // Wajib upload cover untuk berita baru
    if(quillEditor) quillEditor.root.innerHTML = ''; // Kosongkan editor
    document.getElementById('modal-berita').classList.remove('hidden');
}

function closeModalBerita() {
    document.getElementById('modal-berita').classList.add('hidden');
}

async function editBerita(id) {
    const { data } = await supabaseClient.from('berita').select('*').eq('id', id).single();
    if(!data) return;

    document.getElementById('modal-berita-title').innerHTML = `<ion-icon name="create-outline"></ion-icon> <span>Edit Berita</span>`;
    document.getElementById('edit-berita-id').value = data.id;
    document.getElementById('berita-judul').value = data.judul;
    document.getElementById('berita-ringkasan').value = data.ringkasan;
    if(quillEditor) quillEditor.root.innerHTML = data.konten || ''; // Isi editor
    document.getElementById('berita-link').value = data.link_eksternal || '';
    
    document.getElementById('berita-image').required = false; // Cover tidak wajib jika sedang edit (karena sudah ada gambar lama)
    document.getElementById('modal-berita').classList.remove('hidden');
}

document.getElementById('berita-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('btn-save-berita');
    btn.innerHTML = `<ion-icon name="sync" class="animate-spin"></ion-icon> Memproses...`;
    btn.disabled = true;

    const id = document.getElementById('edit-berita-id').value;
    const fileInput = document.getElementById('berita-image');
    let imageUrl = '';

    try {
        // Jika ada file gambar di-upload (Insert / Ganti Cover saat Edit)
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2,8)}.${fileExt}`;
            
            const { error: uploadError } = await supabaseClient.storage.from('berita_images').upload(fileName, file);
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabaseClient.storage.from('berita_images').getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
        }

        const payload = {
            judul: document.getElementById('berita-judul').value,
            ringkasan: document.getElementById('berita-ringkasan').value,
            konten: quillEditor ? quillEditor.root.innerHTML : '', // Ambil isi HTML dari editor
            link_eksternal: document.getElementById('berita-link').value || null
        };

        if (imageUrl) payload.image_url = imageUrl; // Update cover hanya jika upload baru

        let error;
        if (id) {
            const res = await supabaseClient.from('berita').update(payload).eq('id', id);
            error = res.error;
        } else {
            const res = await supabaseClient.from('berita').insert([payload]);
            error = res.error;
        }

        if (error) throw error;

        showToast(id ? "Berita diperbarui!" : "Berita dipublikasikan!", "success");
        closeModalBerita();
        loadBeritaAdmin();
    } catch (error) {
        showToast("Gagal menyimpan berita: " + error.message, "error");
    } finally {
        btn.innerHTML = `<ion-icon name="paper-plane-outline" class="text-xl"></ion-icon> Publikasikan`;
        btn.disabled = false;
    }
});

async function deleteBerita(id, url) {
    const result = await Swal.fire({
        title: 'Hapus Artikel?',
        text: "Hapus artikel ini secara permanen?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    });
    if (result.isConfirmed) {
        Swal.fire({ title: 'Menghapus artikel...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const fileName = url.split('/').pop();
        await supabaseClient.from('berita').delete().eq('id', id); 
        if (fileName) supabaseClient.storage.from('berita_images').remove([fileName]); 
        Swal.fire('Terhapus!', 'Artikel berhasil dihapus!', 'success');
        loadBeritaAdmin();
    }
}

// ==========================================
// 10. PENGELOLAAN SERTIFIKAT TAHFIDZ
// ==========================================

let sertifikatData = []; // Cache data sertifikat

// Fungsi Konversi Masehi ke Hijriyah
function updateHijriDate() {
    const masehiInput = document.getElementById('sertifikat-masehi').value;
    if (!masehiInput) {
        document.getElementById('sertifikat-hijriyah').value = '';
        return;
    }
    try {
        const date = new Date(masehiInput);
        const formatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        let hijriStr = formatter.format(date);
        // Bersihkan format bawaan dan tambahkan "H" di akhir
        hijriStr = hijriStr.replace(/ AH| H/gi, '').trim() + ' H';
        document.getElementById('sertifikat-hijriyah').value = hijriStr;
    } catch (e) { console.error("Gagal mengkonversi tanggal:", e); }
}
document.getElementById('sertifikat-masehi').addEventListener('change', updateHijriDate);

async function loadSertifikatAdmin() {
    const tbody = document.getElementById('sertifikat-table');
    const searchKeyword = document.getElementById('search-sertifikat').value.toLowerCase();
    
    // Tampilkan Skeleton Table Sertifikat
    let skeletonHTML = '';
    for (let i = 0; i < 4; i++) {
        skeletonHTML += `
            <tr class="animate-pulse border-b border-gray-100">
                <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded w-20"></div></td>
                <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded w-24"></div></td>
                <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded w-24"></div></td>
                <td class="px-6 py-4"><div class="h-4 bg-gray-300 rounded w-48"></div></td>
                <td class="px-6 py-4"><div class="h-5 bg-gray-200 rounded-full w-20"></div></td>
                <td class="px-6 py-4 flex justify-center gap-2">
                    <div class="w-8 h-8 bg-gray-200 rounded-lg"></div>
                    <div class="w-8 h-8 bg-gray-200 rounded-lg"></div>
                </td>
            </tr>`;
    }
    tbody.innerHTML = skeletonHTML;

    const { data, error } = await supabaseClient.from('sertifikat_tahfidz').select('*').order('created_at', { ascending: false });

    if (error) { showToast("Gagal memuat data sertifikat", "error"); return; }
    
    sertifikatData = data;
    
    // Filter berdasarkan input pencarian
    const filteredData = sertifikatData.filter(item => 
        item.nisn.toLowerCase().includes(searchKeyword) || 
        item.nama_siswa.toLowerCase().includes(searchKeyword) ||
        (item.nomor_sertifikat && item.nomor_sertifikat.toLowerCase().includes(searchKeyword))
    );

    if (filteredData.length === 0) { 
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-16">
                    <div class="flex flex-col items-center justify-center text-gray-400">
                        <ion-icon name="document-text-outline" class="text-6xl mb-3 text-gray-200"></ion-icon>
                        <p class="text-lg font-bold text-gray-500">Data tidak ditemukan</p>
                        <p class="text-sm mt-1">Belum ada data sertifikat yang ditambahkan.</p>
                    </div>
                </td>
            </tr>`;
        return; 
    }

    tbody.innerHTML = ''; // Kosongkan skeleton loading sebelum merender data asli

    filteredData.forEach(item => {
        const date = new Date(item.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year:'numeric'});
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 border-b border-gray-100 transition">
                <td class="px-6 py-4 text-gray-500 whitespace-nowrap text-xs">${date}</td>
                <td class="px-6 py-4 text-gray-800 font-mono tracking-wider font-semibold">${item.nomor_sertifikat || '-'}</td>
                <td class="px-6 py-4 text-gray-800 font-mono tracking-wider">${item.nisn}</td>
                <td class="px-6 py-4 font-bold text-gray-800">${item.nama_siswa}</td>
                <td class="px-6 py-4"><span class="px-3 py-1 bg-yellow-100 text-yellow-700 font-bold rounded-full text-xs">${item.kategori_hafalan}</span></td>
                <td class="px-6 py-4 flex justify-center gap-2">
                    <button onclick="editSertifikat('${item.id}')" class="w-8 h-8 flex items-center justify-center bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/30 transition" title="Edit">
                        <ion-icon name="create"></ion-icon>
                    </button>
                    <button onclick="deleteSertifikat('${item.id}')" class="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/30 transition" title="Hapus">
                        <ion-icon name="trash"></ion-icon>
                    </button>
                </td>
            </tr>`;
    });
}

function openModalSertifikat() {
    document.getElementById('sertifikat-form').reset();
    document.getElementById('edit-sertifikat-id').value = '';
    
    // Default nomor sertifikat
    document.getElementById('sertifikat-nomor').value = `037 /10-657/MTS AN/VI/2026`;
    document.getElementById('sertifikat-masehi').value = new Date().toISOString().split('T')[0];
    updateHijriDate(); // Menjalankan konversi hijriyah secara otomatis

    document.getElementById('modal-sertifikat-title').innerHTML = `<ion-icon name="medal-outline"></ion-icon> <span>Tambah Data Sertifikat</span>`;
    document.getElementById('modal-sertifikat').classList.remove('hidden');
}

function closeModalSertifikat() {
    document.getElementById('modal-sertifikat').classList.add('hidden');
}

function editSertifikat(id) {
    const data = sertifikatData.find(item => item.id == id);
    if (!data) return;

    document.getElementById('modal-sertifikat-title').innerHTML = `<ion-icon name="create-outline"></ion-icon> <span>Edit Data Sertifikat</span>`;
    document.getElementById('edit-sertifikat-id').value = data.id;
    document.getElementById('sertifikat-nomor').value = data.nomor_sertifikat || '';
    document.getElementById('sertifikat-nisn').value = data.nisn;
    document.getElementById('sertifikat-nama').value = data.nama_siswa;
    document.getElementById('sertifikat-kategori').value = data.kategori_hafalan;
    document.getElementById('sertifikat-detail').value = data.detail_juz || '';
    document.getElementById('sertifikat-masehi').value = data.tanggal_masehi || '';
    document.getElementById('sertifikat-hijriyah').value = data.tanggal_hijriyah || '';
    
    document.getElementById('modal-sertifikat').classList.remove('hidden');
}

document.getElementById('sertifikat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-save-sertifikat');
    btn.innerHTML = `<ion-icon name="sync" class="animate-spin"></ion-icon> Memproses...`;
    btn.disabled = true;

    const id = document.getElementById('edit-sertifikat-id').value;
    const payload = {
        nomor_sertifikat: document.getElementById('sertifikat-nomor').value,
        nisn: document.getElementById('sertifikat-nisn').value,
        nama_siswa: document.getElementById('sertifikat-nama').value,
        kategori_hafalan: document.getElementById('sertifikat-kategori').value,
        detail_juz: document.getElementById('sertifikat-detail').value,
        tanggal_masehi: document.getElementById('sertifikat-masehi').value,
        tanggal_hijriyah: document.getElementById('sertifikat-hijriyah').value,
        tanggal_ujian: new Date().toISOString() // Simpan tanggal saat ini saat dibuat/diedit
    };

    let error;
    if (id) {
        const res = await supabaseClient.from('sertifikat_tahfidz').update(payload).eq('id', id);
        error = res.error;
    } else {
        const res = await supabaseClient.from('sertifikat_tahfidz').insert([payload]);
        error = res.error;
    }

    btn.innerHTML = `<ion-icon name="save-outline" class="text-xl"></ion-icon> Simpan Data`;
    btn.disabled = false;

    if (error) {
        showToast("Gagal menyimpan data: " + error.message, "error");
    } else {
        showToast(id ? "Data diperbarui!" : "Data ditambahkan!", "success");
        closeModalSertifikat();
        loadSertifikatAdmin();
    }
});

async function deleteSertifikat(id) {
    const result = await Swal.fire({
        title: 'Hapus Data Sertifikat?',
        text: "Yakin ingin menghapus data sertifikat siswa ini?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    });
    if (result.isConfirmed) {
        Swal.fire({ title: 'Menghapus data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const { error } = await supabaseClient.from('sertifikat_tahfidz').delete().eq('id', id);
        if (error) {
            Swal.fire('Gagal!', "Gagal menghapus data", 'error');
        } else {
            Swal.fire('Terhapus!', "Data berhasil dihapus!", 'success');
            loadSertifikatAdmin();
        }
    }
}

// ==========================================
// 11. SISTEM BACKUP & ARSIP BERKAS PPDB
// ==========================================

async function loadBackupAdmin() {
    // Gunakan allData yang sudah diload dari fungsi Dashboard
    if (allData.length === 0) await loadData();
    
    backupDataList = allData.map(item => {
        let fileCount = 0;
        if (item.berkas_ktp) fileCount++;
        if (item.berkas_kk) fileCount++;
        if (item.berkas_akta) fileCount++;
        if (item.berkas_ijazah) fileCount++;
        
        return {
            ...item,
            year: new Date(item.created_at).getFullYear().toString(),
            fileCount: fileCount
        };
    });

    // Extract unique years for the filter dropdown
    const years = [...new Set(backupDataList.map(item => item.year))].sort((a, b) => b - a);
    const yearSelect = document.getElementById('filter-year-backup');
    
    // Reset options but keep "Semua Tahun"
    yearSelect.innerHTML = '<option value="all">Semua Tahun</option>';
    years.forEach(year => {
        yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
    });

    applyBackupFilters();
}

function applyBackupFilters() {
    const keyword = document.getElementById('search-backup').value.toLowerCase();
    const year = document.getElementById('filter-year-backup').value;
    const status = document.getElementById('filter-status-backup').value;

    filteredBackupList = backupDataList.filter(item => {
        const matchName = item.nama.toLowerCase().includes(keyword) || (item.nisn && item.nisn.includes(keyword));
        const matchYear = year === 'all' || item.year === year;
        const matchStatus = status === 'all' || item.status === status;
        return matchName && matchYear && matchStatus;
    });

    selectedBackupIds = [];
    document.getElementById('backup-select-all').checked = false;
    updateBackupCount();
    renderBackupTable();
}

// Attach listeners
// Implementasi Debounce untuk Pencarian Arsip & Backup
let backupSearchTimeout;
document.getElementById('search-backup').addEventListener('input', () => {
    clearTimeout(backupSearchTimeout);
    backupSearchTimeout = setTimeout(() => {
        applyBackupFilters();
    }, 300);
});
document.getElementById('filter-year-backup').addEventListener('change', applyBackupFilters);
document.getElementById('filter-status-backup').addEventListener('change', applyBackupFilters);

function toggleBackupSelectAll(source) {
    const checkboxes = document.querySelectorAll('.backup-row-checkbox');
    selectedBackupIds = [];
    checkboxes.forEach(cb => {
        cb.checked = source.checked;
        if (source.checked) selectedBackupIds.push(cb.value);
    });
    updateBackupCount();
}

function toggleBackupRow(cb) {
    if (cb.checked) {
        if (!selectedBackupIds.includes(cb.value)) selectedBackupIds.push(cb.value);
    } else {
        selectedBackupIds = selectedBackupIds.filter(id => id !== cb.value);
        document.getElementById('backup-select-all').checked = false;
    }
    updateBackupCount();
}

function updateBackupCount() {
    document.getElementById('backup-selected-count').innerText = selectedBackupIds.length;
}

function renderBackupTable() {
    const tbody = document.getElementById('backup-table');
    tbody.innerHTML = '';

    if (filteredBackupList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-gray-500">Tidak ada data arsip yang sesuai filter.</td></tr>`;
        return;
    }

    filteredBackupList.forEach(item => {
        const badgeColors = {
            'diterima': 'text-green-600 bg-green-100',
            'ditolak': 'text-red-600 bg-red-100',
            'pending': 'text-yellow-600 bg-yellow-100'
        };
        
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                <td class="px-4 py-3 text-center">
                    <input type="checkbox" class="backup-row-checkbox w-4 h-4 cursor-pointer accent-purple-600" value="${item.id}" onchange="toggleBackupRow(this)">
                </td>
                <td class="px-6 py-3 font-bold text-gray-800 whitespace-nowrap">${item.nama}</td>
                <td class="px-6 py-3 text-gray-600 font-mono tracking-wider">${item.nisn || '-'}</td>
                <td class="px-6 py-3 text-gray-600">${item.year}</td>
                <td class="px-6 py-3"><span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeColors[item.status] || ''}">${item.status}</span></td>
                <td class="px-6 py-3 text-center font-bold ${item.fileCount === 0 ? 'text-red-400' : 'text-purple-600'}">${item.fileCount} File</td>
            </tr>`;
    });
}

function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9 \-_]/g, '').trim();
}

function getStoragePathFromUrl(url) {
    if (!url) return null;
    try {
        const parts = url.split('/berkas_ppdb/');
        return parts.length > 1 ? decodeURIComponent(parts[1]) : null;
    } catch (e) { return null; }
}

async function startBackupProcess(deleteAfter = false) {
    if (selectedBackupIds.length === 0) {
        showToast("Pilih minimal 1 siswa untuk dibackup!", "error");
        return;
    }
    if (selectedBackupIds.length > 100) {
        showToast("Maksimal 100 siswa per backup agar browser tidak crash.", "error");
        return;
    }

    const textWarning = deleteAfter 
        ? "Seluruh berkas dari siswa terpilih akan di-download lalu <b>DIHAPUS PERMANEN</b> dari server Supabase. Lanjutkan?"
        : "Berkas siswa akan di-compress menjadi ZIP dan di-download.";

    const result = await Swal.fire({
        title: 'Konfirmasi Backup',
        html: textWarning,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: deleteAfter ? '#EF4444' : '#2563EB',
        cancelButtonColor: '#6B7280',
        confirmButtonText: deleteAfter ? 'Ya, Backup & Hapus!' : 'Ya, Mulai Backup'
    });

    if (!result.isConfirmed) return;

    Swal.fire({
        title: 'Memproses Arsip Backup...',
        html: `<div id="swal-backup-text" class="text-sm font-semibold text-gray-600 mb-2 mt-4">Mempersiapkan File...</div>
               <div class="w-full bg-gray-200 rounded-full h-3"><div id="swal-backup-bar" class="bg-purple-600 h-3 rounded-full transition-all duration-300" style="width: 0%"></div></div>`,
        allowOutsideClick: false,
        showConfirmButton: false
    });

    const textEl = document.getElementById('swal-backup-text');
    const barEl = document.getElementById('swal-backup-bar');
    
    try {
        const zip = new JSZip();
        const studentsToBackup = backupDataList.filter(s => selectedBackupIds.includes(s.id));
        
        let filesProcessed = 0;
        let totalFiles = studentsToBackup.reduce((acc, curr) => acc + curr.fileCount, 0);

        if (totalFiles === 0) {
            Swal.fire('Info', 'Siswa yang dipilih tidak memiliki berkas yang dilampirkan.', 'info');
            return;
        }

        // 1. Download Files and Add to ZIP
        for (const student of studentsToBackup) {
            if (student.fileCount === 0) continue;
            
            const folderName = `${sanitizeFilename(student.nama)}_${student.nisn || 'NONISN'}`;
            const folder = zip.folder(folderName);
            const filesToGet = [
                { type: 'KTP', url: student.berkas_ktp },
                { type: 'KK', url: student.berkas_kk },
                { type: 'AKTA', url: student.berkas_akta },
                { type: 'IJAZAH', url: student.berkas_ijazah }
            ];

            for (const file of filesToGet) {
                if (!file.url) continue;
                
                const storagePath = getStoragePathFromUrl(file.url);
                if (storagePath) {
                    textEl.innerText = `Mengunduh berkas ${student.nama.substring(0,10)}...`;
                    
                    const { data: blob, error } = await supabaseClient.storage.from('berkas_ppdb').download(storagePath);
                    if (!error && blob) {
                        const extension = storagePath.split('.').pop();
                        folder.file(`${file.type}_${student.nisn || 'NONISN'}.${extension}`, blob);
                    } else {
                        console.warn(`Gagal mengunduh ${file.type} milik ${student.nama}:`, error);
                    }
                }
                filesProcessed++;
                barEl.style.width = `${Math.round((filesProcessed / totalFiles) * 80)}%`; // 0% to 80% is downloading
            }
        }

        // 2. Generate ZIP
        textEl.innerText = `Mengkompresi ke dalam bentuk ZIP... Mohon jangan tutup halaman.`;
        const zipBlob = await zip.generateAsync({ type: "blob" }, function updateCallback(metadata) {
            barEl.style.width = `${80 + Math.round(metadata.percent * 0.2)}%`; // 80% to 100% is zipping
        });

        // 3. Trigger Download
        const dateStr = new Date().toISOString().split('T')[0];
        saveAs(zipBlob, `Backup_PPDB_${dateStr}.zip`);

        // 4. (Opsional) Hapus file dari server jika admin mencentang "Backup & Hapus"
        if (deleteAfter) {
            textEl.innerText = `Backup selesai. Menghapus berkas dari server...`;
            
            let pathsToDelete = [];
            for (const student of studentsToBackup) {
                [student.berkas_ktp, student.berkas_kk, student.berkas_akta, student.berkas_ijazah].forEach(url => {
                    const path = getStoragePathFromUrl(url);
                    if(path) pathsToDelete.push(path);
                });
            }

            if (pathsToDelete.length > 0) {
                await supabaseClient.storage.from('berkas_ppdb').remove(pathsToDelete);
                
                // Hapus URL dari database
                await supabaseClient.from('ppdb').update({ 
                    berkas_ktp: null, berkas_kk: null, berkas_akta: null, berkas_ijazah: null 
                }).in('id', selectedBackupIds);
            }
        }

        // 5. Catat log backup ke database
        // CATATAN: Pastikan Anda membuat tabel "backup_logs" di Supabase dengan field: id, total_siswa, total_file, is_deleted, created_at
        try {
            await supabaseClient.from('backup_logs').insert([{
                total_siswa: studentsToBackup.length,
                total_file: totalFiles,
                is_deleted: deleteAfter
            }]);
        } catch(e) { console.warn("Tabel backup_logs belum dibuat di Supabase, tapi backup tetap berhasil.") }

        Swal.fire({
            title: 'Selesai!',
            text: deleteAfter ? `Backup ZIP berhasil diunduh dan ${totalFiles} file telah dihapus dari server cloud.` : `Backup ZIP berhasil diunduh.`,
            icon: 'success'
        });
        
        if(deleteAfter) loadData(); // Reload seluruh data baru jika dihapus
        
    } catch (error) {
        console.error("Backup Error:", error);
        Swal.fire('Gagal!', `Terjadi kesalahan saat memproses backup: ${error.message}`, 'error');
    }
}

// ==========================================
// 12. SISTEM PENGATURAN WEB DINAMIS
// ==========================================
async function loadPengaturanWeb() {
    document.getElementById('loading-pengaturan').classList.remove('hidden');
    document.getElementById('form-pengaturan').classList.add('hidden');

    const { data, error } = await supabaseClient.from('pengaturan_web').select('*').eq('id', 1).maybeSingle();

    document.getElementById('loading-pengaturan').classList.add('hidden');
    document.getElementById('form-pengaturan').classList.remove('hidden');

    // Daftar gambar bawaan sistem (default) yang saat ini dipakai di web
    const defaults = {
        bg_home: 'Assets/img/bgfix.jpeg',
        bg_ppdb: 'Assets/img/kegiatan.jpeg',
        bg_profil: 'Assets/img/kegiatan3.jpeg',
        brosur_1: 'Assets/img/brosur.jpeg',
        brosur_2: 'Assets/img/brosur2.jpeg',
        brosur_3: 'Assets/img/seragam.jpeg'
    };

    if (data && !error) {
        setupPreviewPengaturan('bg_home', data.bg_home, defaults.bg_home);
        setupPreviewPengaturan('bg_ppdb', data.bg_ppdb, defaults.bg_ppdb);
        setupPreviewPengaturan('bg_profil', data.bg_profil, defaults.bg_profil);
        setupPreviewPengaturan('brosur_1', data.brosur_1, defaults.brosur_1);
        setupPreviewPengaturan('brosur_2', data.brosur_2, defaults.brosur_2);
        setupPreviewPengaturan('brosur_3', data.brosur_3, defaults.brosur_3);
    } else {
        // Jika admin belum membuat baris ID 1 di tabel Supabase, buatkan otomatis
        await supabaseClient.from('pengaturan_web').insert([{ id: 1 }]);
        
        // Tampilkan gambar default
        setupPreviewPengaturan('bg_home', null, defaults.bg_home);
        setupPreviewPengaturan('bg_ppdb', null, defaults.bg_ppdb);
        setupPreviewPengaturan('bg_profil', null, defaults.bg_profil);
        setupPreviewPengaturan('brosur_1', null, defaults.brosur_1);
        setupPreviewPengaturan('brosur_2', null, defaults.brosur_2);
        setupPreviewPengaturan('brosur_3', null, defaults.brosur_3);
    }
}

function setupPreviewPengaturan(id, dbUrl, defaultUrl) {
    const img = document.getElementById(`preview-${id}`);
    const label = document.getElementById(`label-${id}`);
    
    // Gunakan URL dari Supabase jika ada, jika kosong gunakan default bawaan
    const activeUrl = dbUrl ? dbUrl : defaultUrl;
    
    if (img && activeUrl) {
        img.src = activeUrl;
        img.classList.remove('hidden');
        if (label) {
            label.classList.remove('hidden');
            label.innerText = dbUrl ? "Gambar Saat Ini (Diubah):" : "Gambar Saat Ini (Bawaan):";
            label.className = "text-[10px] uppercase font-bold tracking-wider mb-1 block text-gray-500";
        }
    }
}

window.previewSelectedImage = function(input, previewId, labelId) {
    const preview = document.getElementById(previewId);
    const label = document.getElementById(labelId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            if(label) {
                label.classList.remove('hidden');
                label.innerText = "Preview Gambar Baru:";
                label.className = "text-[10px] uppercase font-bold tracking-wider mb-1 block text-blue-500";
            }
        }
        reader.readAsDataURL(input.files[0]);
    }
}

async function uploadAssetsWeb(fileElementId) {
    const fileInput = document.getElementById(fileElementId);
    if (!fileInput || fileInput.files.length === 0) return null;
    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `web_${Date.now()}_${Math.random().toString(36).substring(2,8)}.${fileExt}`;
    // Kita menggunakan bucket yang sudah ada dari galeri agar file menjadi format publik
    const { error } = await supabaseClient.storage.from('galeri_sekolah').upload(fileName, file);
    if (error) throw error;
    const { data } = supabaseClient.storage.from('galeri_sekolah').getPublicUrl(fileName);
    return data.publicUrl;
}

window.savePengaturanWeb = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-pengaturan');
    btn.innerHTML = `<ion-icon name="sync" class="animate-spin"></ion-icon> Menyimpan...`;
    btn.disabled = true;

    try {
        let payload = {};
        const fields = ['bg_home', 'bg_ppdb', 'bg_profil', 'brosur_1', 'brosur_2', 'brosur_3'];

        for (const field of fields) {
            const url = await uploadAssetsWeb(`input-${field}`);
            if (url) payload[field] = url; // Hanya simpan jika admin mengunggah file baru di kotak tersebut
        }

        if (Object.keys(payload).length > 0) {
            // Gunakan fungsi UPDATE agar tidak menimpa kolom gambar lain menjadi kosong
            const { error } = await supabaseClient.from('pengaturan_web').update(payload).eq('id', 1);
            if (error) throw error;
            showToast("Pengaturan web berhasil diperbarui!", "success");
            
            // Refresh form
            document.getElementById('form-pengaturan').reset();
            loadPengaturanWeb();
        } else {
            showToast("Tidak ada gambar baru yang dipilih", "info");
        }
    } catch (error) {
        showToast("Terjadi kesalahan: " + error.message, "error");
    } finally {
        btn.innerHTML = `<ion-icon name="save-outline" class="text-xl"></ion-icon> Simpan Pengaturan`;
        btn.disabled = false;
    }
};