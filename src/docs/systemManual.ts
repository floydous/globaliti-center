// Panduan Operasional Sistem Toko Globaliti Creative Center
export const SYSTEM_MANUAL_MD = `
# Panduan Lengkap Operasional Web Toko Globaliti Creative Center
Unit Usaha SMKS TI Bali Global Denpasar

## 1. Kasir POS (Point of Sale)
- Pindai barcode produk via USB Barcode Scanner (mode keyboard) atau klik kartu es krim.
- Atur kuantitas produk dengan tombol (+) atau (-).
- Pilih metode pembayaran: Tunai atau QRIS.
- Klik tombol Bayar (atau tekan tombol Enter) untuk mencetak nota transaksi kasir.
- Transaksi bersifat final dan langsung mengurangi stok fisik barang.

## 2. Katalog & Pengelolaan Stok
- Tambah Produk Baru: Klik "Tambah Produk", masukkan barcode, nama, harga jual, stok awal, dan batas reorder point.
- Penyesuaian Stok: Klik ikon penyesuaian pada kartu produk untuk mencatat stok masuk (kulakan), barang rusak, atau koreksi opname.
- Peringatan: Produk dengan stok di bawah reorder point akan ditandai lencana peringatan.

## 3. Laporan Keuangan SAK EMKM
- Laba Rugi (satu langkah): Total Pendapatan dikurangi Total Beban Usaha (HPP ditambah beban operasional) langsung menghasilkan Laba atau Rugi Bersih, tanpa subtotal Laba Bruto.
- Posisi Keuangan (Neraca): Menyajikan keseimbangan Aset Lancar (Kas, Nilai Persediaan Stok) terhadap Liabilitas dan Ekuitas Modal.
- Penjualan Harian: rekap per hari (nota, item, pendapatan, laba kotor estimasi) dengan pemilih rentang tanggal; seret dari satu tanggal ke tanggal lain, atau klik satu tanggal untuk laporan satu hari. Tiap hari menampilkan produk terjual dengan perubahan stok awal → akhir hari dan daftar nota.
- Beban: pencatatan beban operasional toko (seperti kertas HVS, tinta printer).
- Cetak Laporan: Tombol "Cetak Laporan" menghasilkan format cetak/PDF standar pertanggungjawaban sekolah.

## 4. Asisten AI Toko & Kendali Groq
- Diaktifkan lewat tombol "Asisten AI" di bilah atas. Tombol mati bila kunci API Groq belum diatur.
- Kunci API Groq diatur di Pengaturan dan disimpan sebagai file lokal di perangkat ini, bukan di browser. Gunakan "Uji Koneksi Groq API" sebelum menyimpan.
- Cek data stok inventori dan status reorder produk secara langsung.
- Memberikan ringkasan keuangan harian dan laba rugi.
- Memandu pengelola langkah demi langkah cara mengoperasikan setiap fitur web.
- Usulan modifikasi data aman (Human-in-the-Loop): Perintah penambahan stok akan memunculkan Kartu Konfirmasi dan tidak diterapkan sebelum disetujui pengelola.
`
