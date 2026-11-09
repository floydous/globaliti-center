// Harga modal tidak lagi dicatat per produk, jadi Beban Pokok Penjualan (HPP)
// diestimasi memakai rasio terhadap harga jual (bisa diubah di Pengaturan). Rasio ini diturunkan dari
// data harga modal lama pada katalog seed (Rp 114.000 dari Rp 200.500 harga
// jual). Semua angka HPP di aplikasi memakai helper ini agar konsisten.
export const HPP_RATIO = 0.57

export const estimateCost = (price: number, ratio = HPP_RATIO) => Math.round(price * ratio)
