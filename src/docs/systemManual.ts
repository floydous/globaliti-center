// Panduan Operasional Sistem Toko Globaliti Creative Center
export const SYSTEM_MANUAL_MD = `
# Panduan Lengkap Operasional Web Toko Globaliti Creative Center
Unit Usaha SMKS TI Bali Global Denpasar

## 1. Kasir POS (Point of Sale)
- Pindai barcode produk via USB Barcode Scanner (mode keyboard) atau klik kartu es krim.
- Atur kuantitas produk dengan tombol (+) atau (-).
- Pilih metode pembayaran: Tunai atau QRIS.
- Klik tombol Bayar untuk mencetak nota transaksi kasir.
- Transaksi bersifat final dan langsung mengurangi stok fisik barang.

## 2. Katalog & Pengelolaan Stok
- Tambah Produk Baru: Klik "Tambah Produk", masukkan barcode, nama, unit (cup/cone/stick/pcs), harga modal, harga jual, stok awal, dan batas reorder point.
- Penyesuaian Stok: Klik ikon penyesuaian pada baris produk untuk mencatat stok masuk (kulakan), barang rusak, atau koreksi opname.
- Peringatan: Produk dengan stok di bawah reorder point akan ditandai lencana peringatan.

## 3. Jasa Print Dokumen Microsoft Word
- Order Baru: Klik "Buat order print", masukkan nama file .docx, mode cetak (Hitam putih atau Berwarna), jumlah halaman, serta waktu pembayaran.
- Alur Pembayaran: Siswa dapat memilih "Lunas di muka" (prabayar) atau "Bayar di akhir" (pascabayar / piutang).
- Penyelesaian & Pelunasan: Tandai "Selesai" jika dokumen telah dicetak, lalu klik "Tandai lunas" setelah siswa melunasi tagihan print.
- Tarif Dinamis: Tarif default Hitam putih (Rp 500) dan Berwarna (Rp 1.000) per halaman atau kertas dapat diubah via ikon pengaturan tarif.

## 4. Laporan Keuangan SAK EMKM
- Laba Rugi: Pendapatan penjualan es krim dan print dikurangi HPP menghasilkan Laba Bruto, kemudian dikurangi Beban Operasional menghasilkan Laba Bersih.
- Posisi Keuangan (Neraca): Menyajikan keseimbangan Aset Lancar (Kas, Piutang Print, Nilai Persediaan Stok) terhadap Liabilitas dan Ekuitas Modal.
- Penjualan Harian & Beban: Menampilkan log nota transaksi kasir dan pencatatan beban operasional toko (seperti kertas HVS, tinta printer).
- Cetak Laporan: Tombol "Cetak Laporan" menghasilkan format cetak/PDF standar pertanggungjawaban sekolah.

## 5. Asisten AI Toko & Kendali Groq
- Cek data stok inventori dan status reorder produk secara langsung.
- Memberikan ringkasan keuangan harian, laba rugi, dan piutang.
- Memandu pengelola langkah demi langkah cara mengoperasikan setiap fitur web.
- Usulan modifikasi data aman (Human-in-the-Loop): Perintah penambahan stok akan memunculkan Kartu Konfirmasi dan tidak diterapkan sebelum disetujui pengelola.
`
