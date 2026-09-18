import type { Question } from '../types'

type BankQuestion = Question & {
  topicId: string
  cognitiveLevel: 'Pemahaman' | 'Aplikasi' | 'Penalaran'
  misconception: string
  source: 'kurasi' | 'variasi-tervalidasi'
  hint: string
  studyMaterial: string
  hintSteps: string[]
}

const q = (
  id: string,
  topicId: string,
  skill: string,
  concept: string,
  cognitiveLevel: BankQuestion['cognitiveLevel'],
  difficulty: BankQuestion['difficulty'],
  prompt: string,
  options: string[],
  answerIndex: number,
  explanation: string,
  misconception: string,
  source: BankQuestion['source'] = 'kurasi',
): BankQuestion => {
  const support = studySupport[topicId]?.[concept] ?? studySupport[topicId]?.default ?? studySupport.default.default
  return { id, topicId, skill, concept, cognitiveLevel, difficulty, prompt, options, answer: options[answerIndex], answerIndex, explanation, misconception, source, ...support }
}

type StudySupport = Pick<BankQuestion, 'hint' | 'studyMaterial' | 'hintSteps'>
const support = (hint: string, studyMaterial: string, hintSteps: string[]): StudySupport => ({ hint, studyMaterial, hintSteps })

const studySupport: Record<string, Record<string, StudySupport>> = {
  default: { default: support('Identifikasi konsep yang diuji sebelum memilih operasi.', 'Mulai dari definisi dan syarat konsep. Tulis informasi yang diketahui, apa yang ditanyakan, lalu pilih aturan yang menghubungkan keduanya.', ['Tandai kata kunci pada soal.', 'Tulis rumus atau definisi yang relevan.', 'Hitung satu langkah demi satu langkah dan periksa tanda.']) },
  foundations: {
    default: support('Pisahkan tanda, koefisien, pangkat, dan operasi sebelum menghitung.', 'Kelancaran aljabar bergantung pada urutan operasi, sifat distributif, aturan pangkat, dan persamaan setara. Tanda kurung menentukan bilangan yang terkena pangkat.', ['Tulis struktur ekspresi tanpa melompati tanda.', 'Terapkan satu aturan pada satu baris.', 'Substitusikan kembali untuk mengecek hasil.']),
    'Operasi bilangan berpangkat': support('Perhatikan apakah tanda negatif berada di dalam tanda kurung.', 'Pangkat menunjukkan perkalian berulang. Untuk (-a)², seluruh bilangan negatif dipangkatkan; untuk -a², tanda negatif berada di luar pangkat.', ['Baca tanda kurung terlebih dahulu.', 'Kerjakan pangkat sebelum penjumlahan atau pengurangan.', 'Bandingkan tanda hasil dengan arti kuadrat.']),
    'Bentuk akar': support('Cari faktor kuadrat sempurna terbesar di dalam radikan.', 'Bentuk akar disederhanakan dengan memisahkan faktor kuadrat sempurna: √(ab) = √a√b. Ambil akar dari faktor yang merupakan kuadrat sempurna.', ['Faktorkan bilangan di dalam akar.', 'Keluarkan pasangan faktor yang sama.', 'Pastikan tidak ada faktor kuadrat sempurna yang tersisa.']),
    'Rasionalisasi penyebut': support('Kalikan pembilang dan penyebut dengan akar yang sama.', 'Penyebut berbentuk √a dapat dirasionalkan dengan mengalikan pecahan oleh √a/√a. Nilai pecahan tidak berubah karena faktor tersebut bernilai 1.', ['Pilih faktor yang membuat penyebut menjadi bilangan rasional.', 'Kalikan pembilang dan penyebut, bukan penyebut saja.', 'Sederhanakan hasil akhir.']),
  },
  functions: {
    default: support('Tentukan dulu input yang diizinkan dan aturan yang harus dipakai.', 'Fungsi memasangkan setiap input dalam domain dengan tepat satu output. Domain dibatasi oleh penyebut nol, isi akar negatif, atau argumen logaritma tidak positif.', ['Tulis domain dari syarat fungsi.', 'Substitusikan input dengan tanda kurung.', 'Cek apakah output sesuai dengan bentuk fungsi.']),
    'Substitusi fungsi': support('Ganti x dengan seluruh input di dalam tanda kurung.', 'Nilai f(a) diperoleh dengan memasukkan a ke setiap kemunculan x dalam aturan fungsi. Tanda negatif harus tetap dikelompokkan.', ['Salin aturan fungsi.', 'Ganti setiap x dengan (a).', 'Sederhanakan pangkat dan operasi.']),
    'Domain fungsi rasional': support('Cari nilai yang membuat penyebut sama dengan nol.', 'Fungsi rasional tidak terdefinisi ketika penyebutnya nol. Nilai tersebut harus dikeluarkan dari domain, meskipun pembilangnya juga nol.', ['Set penyebut sama dengan nol.', 'Selesaikan nilai terlarang.', 'Tulis domain dengan mengecualikan nilai itu.']),
    'Komposisi fungsi': support('Kerjakan fungsi yang berada paling dalam terlebih dahulu.', 'Komposisi (f ∘ g)(x) berarti f(g(x)), bukan f(x)+g(x). Output g menjadi input bagi f.', ['Hitung g(input).', 'Masukkan hasilnya ke f.', 'Periksa urutan komposisi.']),
  },
  polynomials: { default: support('Cari hubungan antara akar, faktor, dan nilai polinom.', 'Teorema faktor dan teorema sisa memungkinkan kita mengevaluasi polinom tanpa pembagian panjang. Jika p(r)=0, maka x-r adalah faktor.', ['Identifikasi bentuk pembagi atau akar.', 'Gunakan p(r) sesuai tanda pembagi.', 'Periksa derajat dan koefisien hasil.']) },
  matrices: { default: support('Periksa ukuran matriks sebelum melakukan operasi.', 'Penjumlahan matriks dilakukan pada elemen bersesuaian, sedangkan perkalian memakai hasil kali baris dan kolom. Determinan nol berarti matriks tidak memiliki invers.', ['Tulis ukuran hasil terlebih dahulu.', 'Gunakan baris dan kolom yang tepat.', 'Cek kembali tanda pada determinan.']) },
  vectors: { default: support('Tulis komponen dalam urutan yang sama sebelum menghitung.', 'Vektor memiliki besar dan arah. Operasi komponen dilakukan bersesuaian; panjang vektor dihitung dengan akar jumlah kuadrat komponennya.', ['Tentukan arah atau urutan titik.', 'Operasikan komponen yang bersesuaian.', 'Gunakan panjang atau hasil kali titik sesuai yang ditanyakan.']) },
  circles: { default: support('Bandingkan persamaan dengan bentuk baku lingkaran.', 'Bentuk baku lingkaran adalah (x-h)²+(y-k)²=r². Pusatnya (h,k), sedangkan jari-jari adalah akar dari ruas kanan.', ['Temukan pusat dan jari-jari.', 'Gunakan jarak untuk menguji titik atau garis.', 'Bedakan panjang, keliling, dan luas.']) },
  transformations: { default: support('Tulis aturan transformasi dan terapkan pada setiap koordinat.', 'Transformasi memetakan titik ke bayangan. Translasi menambah vektor, refleksi mengubah atau menukar tanda/koordinat, rotasi mengikuti aturan sudut, dan dilatasi mengubah luas dengan kuadrat faktor.', ['Catat pusat dan arah transformasi.', 'Hitung koordinat antara jika ada komposisi.', 'Periksa kuadran, jarak, atau luas.']) },
  limits: { default: support('Gunakan substitusi sebagai diagnosis, lalu tangani bentuk tak tentu.', 'Limit menggambarkan perilaku fungsi saat x mendekati titik. Bentuk 0/0 bukan jawaban; faktorkan, rasionalkan, atau gunakan identitas limit yang sesuai.', ['Substitusi untuk melihat bentuk awal.', 'Pilih faktorisasi, sekawan, atau identitas.', 'Evaluasi bentuk yang sudah disederhanakan.']) },
}

export const questionBank: BankQuestion[] = [
  q('af-01', 'foundations', 'Kelancaran aljabar', 'Operasi bilangan berpangkat', 'Pemahaman', 'Mudah', 'Nilai dari (-3)² + 4 adalah ...', ['-5', '5', '9', '13'], 3, 'Tanda negatif berada di dalam kurung, sehingga (-3)² = 9. Kemudian 9 + 4 = 13.', 'Menganggap (-3)² sama dengan -3² = -9.'),
  q('af-02', 'foundations', 'Kelancaran aljabar', 'Penyederhanaan bentuk aljabar', 'Aplikasi', 'Mudah', 'Sederhanakan 3(2x - 1) - 2(x + 4).', ['4x - 11', '4x + 5', '8x - 5', '8x - 11'], 0, 'Distribusikan: 6x - 3 - 2x - 8 = 4x - 11.', 'Lupa mengubah tanda semua suku setelah tanda negatif.'),
  q('af-03', 'foundations', 'Kelancaran aljabar', 'Persamaan linear', 'Aplikasi', 'Sedang', 'Jika 4x - 7 = 13, nilai x adalah ...', ['1,5', '5', '6', '20'], 1, 'Tambahkan 7 pada kedua ruas: 4x = 20, lalu bagi 4 sehingga x = 5.', 'Membagi 13 langsung dengan 4 tanpa memindahkan konstanta.'),
  q('af-04', 'foundations', 'Kelancaran aljabar', 'Bentuk akar', 'Penalaran', 'Sedang', 'Bentuk paling sederhana dari √72 adalah ...', ['2√18', '3√8', '6√2', '12√2'], 2, '√72 = √(36 × 2) = 6√2.', 'Mengambil akar 72 sebagai 6√2 tanpa menunjukkan faktor kuadrat sempurna.'),
  q('af-05', 'foundations', 'Kelancaran aljabar', 'Persamaan pecahan', 'Aplikasi', 'Sedang', 'Jika (2/3)x = 8, nilai x adalah ...', ['6', '10', '12', '16'], 2, 'Kalikan kedua ruas dengan 3/2: x = 8 × 3/2 = 12.', 'Mengalikan hanya pembilang atau membagi 8 dengan 3 tanpa memperhatikan faktor 2.'),
  q('af-06', 'foundations', 'Kelancaran aljabar', 'Sifat pangkat', 'Pemahaman', 'Mudah', 'Nilai dari (2³ × 2²) / 2⁴ adalah ...', ['1', '2', '4', '8'], 1, 'Pangkat dengan basis sama dijumlahkan saat dikali dan dikurangkan saat dibagi: 2^(3+2−4) = 2.', 'Menjumlahkan semua pangkat, termasuk pangkat pada penyebut.'),
  q('af-07', 'foundations', 'Kelancaran aljabar', 'Persamaan nilai mutlak', 'Penalaran', 'Sedang', 'Himpunan penyelesaian |x − 2| = 5 adalah ...', ['x = 3', 'x = −3', 'x = −3 atau 7', 'x = 3 atau 7'], 2, 'Nilai mutlak memberi dua kasus: x − 2 = 5 atau x − 2 = −5, sehingga x = 7 atau x = −3.', 'Hanya mengambil kasus positif dan kehilangan salah satu penyelesaian.'),
  q('af-08', 'foundations', 'Kelancaran aljabar', 'Rasionalisasi penyebut', 'Aplikasi', 'Sedang', 'Bentuk tanpa akar di penyebut dari 1/√3 adalah ...', ['√3', '3√3', '√3/3', '1/3'], 2, 'Kalikan pembilang dan penyebut dengan √3: 1/√3 = √3/3.', 'Mengalikan penyebut saja atau mengubah 1/√3 menjadi √3.'),

  q('fn-01', 'functions', 'Fungsi dan grafik', 'Substitusi fungsi', 'Pemahaman', 'Mudah', 'Diketahui f(x) = 2x + 1. Nilai f(-3) adalah ...', ['-7', '-5', '5', '7'], 1, 'Substitusi x = -3: f(-3) = 2(-3) + 1 = -6 + 1 = -5.', 'Menghilangkan tanda negatif saat substitusi.'),
  q('fn-02', 'functions', 'Fungsi dan grafik', 'Domain fungsi rasional', 'Aplikasi', 'Sedang', 'Untuk f(x) = (x + 1)/(x - 4), nilai yang tidak termasuk domain adalah ...', ['-1', '0', '1', '4'], 3, 'Penyebut tidak boleh nol. x - 4 = 0 sehingga x = 4 dikeluarkan dari domain.', 'Mengira pembilang yang menentukan nilai terlarang.'),
  q('fn-03', 'functions', 'Fungsi dan grafik', 'Komposisi fungsi', 'Aplikasi', 'Sedang', 'Jika f(x) = x + 2 dan g(x) = 3x, nilai (f ∘ g)(2) adalah ...', ['6', '8', '10', '12'], 1, 'g(2) = 6, lalu f(6) = 8. Jadi (f ∘ g)(2) = 8.', 'Menukar urutan komposisi atau langsung menjumlahkan aturan.', 'variasi-tervalidasi'),
  q('fn-04', 'functions', 'Fungsi dan grafik', 'Interpretasi gradien', 'Penalaran', 'Sedang', 'Garis y = -2x + 5 memotong sumbu-y di ...', ['(-2, 0)', '(0, -2)', '(0, 5)', '(5, 0)'], 2, 'Pada bentuk y = mx + b, titik potong sumbu-y adalah (0, b), yaitu (0, 5).', 'Menganggap konstanta 5 sebagai koordinat-x.'),
  q('fn-05', 'functions', 'Fungsi dan grafik', 'Fungsi invers', 'Aplikasi', 'Sedang', 'Jika f(x) = 3x − 2, nilai f⁻¹(7) adalah ...', ['1', '3', '5/3', '7'], 1, 'Cari x yang memenuhi 3x − 2 = 7. Maka 3x = 9 dan x = 3.', 'Menghitung f(7) atau menukar 3 dan −2 tanpa menyelesaikan persamaan.'),
  q('fn-06', 'functions', 'Fungsi dan grafik', 'Domain fungsi akar', 'Pemahaman', 'Mudah', 'Domain f(x) = √(2x − 6) adalah ...', ['x ≤ 3', 'x ≥ 3', 'x ≠ 3', 'semua bilangan real'], 1, 'Isi akar harus tidak negatif: 2x − 6 ≥ 0, sehingga x ≥ 3.', 'Membalik tanda pertidaksamaan saat membagi dengan bilangan positif.'),
  q('fn-07', 'functions', 'Fungsi dan grafik', 'Komposisi fungsi', 'Penalaran', 'Sedang', 'Jika f(x) = x² dan g(x) = x + 1, nilai (g ∘ f)(−2) adalah ...', ['−5', '−3', '3', '5'], 3, 'f(−2) = 4, lalu g(4) = 5. Jadi (g ∘ f)(−2) = 5.', 'Menukar urutan menjadi f(g(−2)) atau mengkuadratkan hasil akhir saja.'),
  q('fn-08', 'functions', 'Fungsi dan grafik', 'Fungsi bagian demi bagian', 'Aplikasi', 'Sedang', 'Diberikan f(x) = x + 1 untuk x < 2 dan f(x) = x² untuk x ≥ 2. Nilai f(2) adalah ...', ['2', '3', '4', '5'], 2, 'Karena 2 memenuhi syarat x ≥ 2, gunakan bagian x². Jadi f(2) = 4.', 'Memakai rumus pertama hanya karena letaknya ditulis lebih dahulu.'),

  q('poly-01', 'polynomials', 'Penalaran polinomial', 'Teorema sisa', 'Aplikasi', 'Sedang', 'Sisa pembagian f(x) = x³ + 2x² - 3x + 2 oleh x - 2 adalah ...', ['8', '10', '12', '16'], 2, 'Menurut teorema sisa, sisa = f(2) = 8 + 8 - 6 + 2 = 12.', 'Membagi polinomial secara panjang tetapi berhenti sebelum menjumlahkan semua suku.'),
  q('poly-02', 'polynomials', 'Penalaran polinomial', 'Teorema faktor', 'Pemahaman', 'Mudah', 'Jika f(3) = 0, faktor yang pasti dimiliki f(x) adalah ...', ['x + 3', 'x - 3', '3x - 1', 'x² - 3'], 1, 'f(r) = 0 berarti x - r merupakan faktor. Dengan r = 3, faktornya x - 3.', 'Menggunakan x + r karena tertukar antara akar dan faktor.'),
  q('poly-03', 'polynomials', 'Penalaran polinomial', 'Akar polinomial', 'Penalaran', 'Sulit', 'Akar-akar dari x² - 5x + 6 = 0 adalah ...', ['1 dan 6', '2 dan 3', '-2 dan -3', '5 dan 6'], 1, 'Faktorkan menjadi (x - 2)(x - 3) = 0, sehingga akarnya 2 dan 3.', 'Mencari pasangan yang jumlahnya 5 tetapi lupa hasil kalinya harus 6.'),
  q('poly-04', 'polynomials', 'Penalaran polinomial', 'Identitas polinomial', 'Aplikasi', 'Sedang', 'Jika (x + a)(x + 2) = x² + 7x + 10, nilai a adalah ...', ['2', '5', '7', '10'], 1, 'Koefisien x adalah a + 2 = 7, sehingga a = 5. Konstanta juga cocok: 5 × 2 = 10.', 'Menggunakan konstanta 10 sebagai nilai a.'),
  q('poly-05', 'polynomials', 'Penalaran polinomial', 'Teorema sisa', 'Pemahaman', 'Mudah', 'Sisa pembagian x⁴ − 1 oleh x + 1 adalah ...', ['−2', '−1', '0', '1'], 2, 'Menurut teorema sisa, evaluasikan f(−1): (−1)⁴ − 1 = 0.', 'Menggunakan f(1) karena mengambil tanda pembagi x + 1 secara langsung.'),
  q('poly-06', 'polynomials', 'Penalaran polinomial', 'Koefisien polinomial', 'Aplikasi', 'Mudah', 'Koefisien x dari (x − 1)(x + 2) adalah ...', ['−2', '−1', '1', '2'], 2, 'Kembangkan: x² + 2x − x − 2 = x² + x − 2. Koefisien x adalah 1.', 'Hanya mengambil 2x dan melupakan suku −x.'),
  q('poly-07', 'polynomials', 'Penalaran polinomial', 'Akar dan faktor', 'Penalaran', 'Sedang', 'Polinomial dengan akar 1, 2, dan −3 memiliki faktor ...', ['(x + 1)(x + 2)(x − 3)', '(x − 1)(x − 2)(x + 3)', '(x − 1)(x + 2)(x − 3)', '(x + 1)(x − 2)(x + 3)'], 1, 'Akar r menghasilkan faktor x − r. Jadi faktornya (x − 1)(x − 2)(x + 3).', 'Menulis tanda faktor sama dengan tanda akar, bukan kebalikannya.'),
  q('poly-08', 'polynomials', 'Penalaran polinomial', 'Bentuk polinomial', 'Aplikasi', 'Sedang', 'Jika f(x) = 2x³ − 3x² + x − 4, nilai f(1) adalah ...', ['−6', '−4', '−2', '0'], 1, 'Substitusi x = 1: 2 − 3 + 1 − 4 = −4.', 'Mengabaikan suku −3x² atau salah menjumlahkan tanda negatif.'),

  q('mat-01', 'matrices', 'Matriks', 'Determinan matriks 2×2', 'Pemahaman', 'Mudah', 'Determinan matriks [[2, 3], [4, 5]] adalah ...', ['-2', '2', '10', '-10'], 0, 'det(A) = ad - bc = (2)(5) - (3)(4) = 10 - 12 = -2.', 'Menukar urutan pengurangan sehingga mendapat 2.'),
  q('mat-02', 'matrices', 'Matriks', 'Perkalian matriks', 'Aplikasi', 'Sedang', 'Jika A = [[1, 2], [3, 4]] dan B = [[5, 6], [7, 8]], elemen baris pertama kolom pertama dari AB adalah ...', ['5', '12', '19', '21'], 2, 'Ambil baris pertama A dan kolom pertama B: (1)(5) + (2)(7) = 19.', 'Mengalikan elemen yang posisinya sama secara langsung.'),
  q('mat-03', 'matrices', 'Matriks', 'Persamaan matriks', 'Aplikasi', 'Sedang', 'Jika [[x, 2], [3, 4]] = [[5, 2], [3, y]], nilai x + y adalah ...', ['5', '7', '9', '11'], 2, 'Kesamaan matriks berarti elemen bersesuaian sama: x = 5 dan y = 4, jadi x + y = 9.', 'Menjumlahkan elemen diagonal saja atau salah membaca y.'),
  q('mat-04', 'matrices', 'Matriks', 'Invers matriks', 'Penalaran', 'Sulit', 'Matriks 2×2 memiliki invers jika dan hanya jika ...', ['semua elemennya positif', 'determinan sama dengan nol', 'determinan tidak sama dengan nol', 'jumlah elemennya sama dengan satu'], 2, 'Invers matriks 2×2 ada ketika determinannya tidak nol.', 'Mengira determinan nol menandakan matriks dapat dibalik.'),
  q('mat-05', 'matrices', 'Matriks', 'Penjumlahan matriks', 'Pemahaman', 'Mudah', 'Jika A = [[1, 2], [3, 4]] dan B = [[2, 1], [0, 5]], elemen baris kedua kolom pertama dari A + B adalah ...', ['0', '2', '3', '8'], 2, 'Jumlahkan elemen yang bersesuaian: 3 + 0 = 3.', 'Menjumlahkan elemen diagonal atau mencampur posisi baris dan kolom.'),
  q('mat-06', 'matrices', 'Matriks', 'Dimensi perkalian matriks', 'Pemahaman', 'Mudah', 'Hasil kali matriks berukuran 2×3 dan 3×1 berukuran ...', ['1×1', '2×1', '2×3', '3×3'], 1, 'Dimensi dalam 3 dan 3 cocok, sehingga dimensi hasil memakai dimensi luar: 2×1.', 'Memakai salah satu dimensi matriks pertama atau mengalikan semua ukuran.'),
  q('mat-07', 'matrices', 'Matriks', 'Determinan matriks 2×2', 'Aplikasi', 'Sedang', 'Jika det([[a, 2], [3, 4]]) = 10, nilai a adalah ...', ['1', '2', '4', '5'], 2, '4a − 6 = 10, maka 4a = 16 dan a = 4.', 'Menggunakan 4a + 6 karena lupa pola ad − bc.'),
  q('mat-08', 'matrices', 'Matriks', 'Sistem persamaan linear', 'Penalaran', 'Sedang', 'Penyelesaian sistem x + y = 5 dan 2x − y = 4 adalah ...', ['(1, 4)', '(2, 3)', '(3, 2)', '(4, 1)'], 2, 'Jumlahkan kedua persamaan: 3x = 9 sehingga x = 3. Substitusi memberi y = 2.', 'Menganggap koefisien 2 pada persamaan kedua berarti x = 2.'),

  q('vec-01', 'vectors', 'Vektor', 'Perkalian titik', 'Aplikasi', 'Sedang', 'Jika u = (2, -1) dan v = (3, 4), nilai u · v adalah ...', ['-10', '-2', '2', '10'], 2, 'u · v = (2)(3) + (-1)(4) = 6 - 4 = 2.', 'Mengalikan komponen secara berpasangan tanpa menjumlahkan.'),
  q('vec-02', 'vectors', 'Vektor', 'Panjang vektor', 'Pemahaman', 'Mudah', 'Panjang vektor (3, 4) adalah ...', ['1', '5', '7', '25'], 1, '||v|| = √(3² + 4²) = √25 = 5.', 'Menggunakan 3 + 4 atau 3² + 4² tanpa mengambil akar.'),
  q('vec-03', 'vectors', 'Vektor', 'Vektor posisi', 'Aplikasi', 'Sedang', 'Vektor dari P(2, -1) ke Q(5, 3) adalah ...', ['(3, 4)', '(7, 2)', '(-3, -4)', '(2, 5)'], 0, 'PQ = Q - P = (5 - 2, 3 - (-1)) = (3, 4).', 'Mengurangi koordinat dengan urutan terbalik.'),
  q('vec-04', 'vectors', 'Vektor', 'Tegak lurus', 'Penalaran', 'Sulit', 'Nilai k agar vektor (2, k) tegak lurus dengan (3, 4) adalah ...', ['-3/2', '-1', '1', '3/2'], 0, 'Tegak lurus berarti hasil kali titik nol: 2(3) + 4k = 0, sehingga k = -3/2.', 'Mengatur hasil kali titik sama dengan satu atau lupa koefisien 4.'),
  q('vec-05', 'vectors', 'Vektor', 'Panjang vektor ruang', 'Pemahaman', 'Mudah', 'Panjang vektor (2, −3, 6) adalah ...', ['5', '6', '7', '9'], 2, '||v|| = √(2² + (−3)² + 6²) = √49 = 7.', 'Menjumlahkan komponen langsung atau lupa mengkuadratkan komponen negatif.'),
  q('vec-06', 'vectors', 'Vektor', 'Penjumlahan vektor', 'Aplikasi', 'Mudah', 'Jika u = (2, −1) dan v = (−3, 4), u + v adalah ...', ['(−1, 3)', '(1, 3)', '(−1, −5)', '(5, 3)'], 0, 'Jumlahkan komponen bersesuaian: (2 + (−3), −1 + 4) = (−1, 3).', 'Mengurangi vektor kedua atau menjumlahkan panjangnya saja.'),
  q('vec-07', 'vectors', 'Vektor', 'Titik tengah', 'Aplikasi', 'Sedang', 'Titik tengah ruas yang menghubungkan A(2, 1) dan B(6, 5) adalah ...', ['(2, 2)', '(3, 3)', '(4, 3)', '(4, 4)'], 2, 'Rata-rata koordinat: ((2+6)/2, (1+5)/2) = (4, 3).', 'Mengambil titik tengah hanya dari koordinat-x atau salah menjumlahkan y.'),
  q('vec-08', 'vectors', 'Vektor', 'Vektor sejajar', 'Penalaran', 'Sedang', 'Nilai k agar (k, 2) sejajar dengan (3, 6) adalah ...', ['1/3', '1', '2', '3'], 1, 'Perbandingan komponen harus sama: k/3 = 2/6 = 1/3, sehingga k = 1.', 'Menyamakan k dengan 3 atau membandingkan komponen tanpa menjaga urutan.'),

  q('cir-01', 'circles', 'Lingkaran dan garis singgung', 'Pusat lingkaran', 'Pemahaman', 'Mudah', 'Pusat lingkaran (x - 3)² + (y + 2)² = 25 adalah ...', ['(-3, 2)', '(3, -2)', '(3, 2)', '(-3, -2)'], 1, 'Bandingkan dengan (x - h)² + (y - k)² = r². Pusatnya (h, k) = (3, -2).', 'Mengambil tanda yang tertulis di dalam kurung tanpa membaliknya.'),
  q('cir-02', 'circles', 'Lingkaran dan garis singgung', 'Jari-jari lingkaran', 'Aplikasi', 'Mudah', 'Jari-jari lingkaran x² + y² = 49 adalah ...', ['4', '7', '14', '49'], 1, 'Bentuk standar x² + y² = r², maka r = √49 = 7.', 'Menganggap ruas kanan langsung sebagai jari-jari.'),
  q('cir-03', 'circles', 'Lingkaran dan garis singgung', 'Kedudukan titik', 'Aplikasi', 'Sedang', 'Titik (3, 4) terhadap lingkaran x² + y² = 25 berada ...', ['di dalam', 'tepat pada lingkaran', 'di luar', 'di pusat'], 1, '3² + 4² = 25, sama dengan r². Titik tepat pada lingkaran.', 'Membandingkan jarak 3 atau 4 saja, bukan jarak dari pusat.'),
  q('cir-04', 'circles', 'Lingkaran dan garis singgung', 'Garis singgung', 'Penalaran', 'Sulit', 'Jika jari-jari ke titik singgung tegak lurus garis, maka sudut antara keduanya adalah ...', ['0°', '45°', '90°', '180°'], 2, 'Sifat garis singgung: jari-jari yang ditarik ke titik singgung tegak lurus garis singgung.', 'Menyamakan garis singgung dengan tali busur.'),
  q('cir-05', 'circles', 'Lingkaran dan garis singgung', 'Melengkapkan kuadrat', 'Aplikasi', 'Sedang', 'Pusat lingkaran x² + y² − 6x + 4y − 12 = 0 adalah ...', ['(−3, 2)', '(3, −2)', '(−3, −2)', '(3, 2)'], 1, 'Susun menjadi (x − 3)² + (y + 2)² = 25. Pusatnya (3, −2).', 'Membaca koefisien x dan y sebagai koordinat pusat tanpa membalik tanda.'),
  q('cir-06', 'circles', 'Lingkaran dan garis singgung', 'Kedudukan garis', 'Penalaran', 'Sedang', 'Garis y = 4 terhadap lingkaran x² + y² = 25 adalah ...', ['tidak berpotongan', 'menyinggung', 'memotong di dua titik', 'berimpit'], 2, 'Jarak garis y = 4 dari pusat adalah 4, lebih kecil dari jari-jari 5, sehingga garis memotong di dua titik.', 'Menyamakan jarak pusat ke garis dengan jari-jari tanpa menghitung nilainya.'),
  q('cir-07', 'circles', 'Lingkaran dan garis singgung', 'Persamaan garis singgung', 'Aplikasi', 'Sulit', 'Garis singgung lingkaran x² + y² = 25 di titik (3, 4) adalah ...', ['3x + 4y = 5', '3x + 4y = 25', '4x + 3y = 25', 'x + y = 25'], 1, 'Untuk x² + y² = r², garis singgung di (x₁,y₁) adalah xx₁ + yy₁ = r². Jadi 3x + 4y = 25.', 'Menukar koordinat titik atau menggunakan persamaan lingkaran sebagai garis.'),
  q('cir-08', 'circles', 'Lingkaran dan garis singgung', 'Panjang tali busur', 'Penalaran', 'Sulit', 'Panjang tali busur lingkaran berjari-jari 5 yang berjarak 3 dari pusat adalah ...', ['4', '6', '8', '10'], 2, 'Setengah tali busur membentuk segitiga siku-siku: √(5² − 3²) = 4. Panjang penuh = 8.', 'Menggunakan 4 sebagai panjang tali busur penuh.'),

  q('tr-01', 'transformations', 'Transformasi', 'Translasi titik', 'Aplikasi', 'Mudah', 'Titik (2, -1) ditranslasi oleh (3, 4). Bayangannya adalah ...', ['(5, 3)', '(-1, 3)', '(5, -5)', '(-1, -5)'], 0, 'Tambahkan vektor translasi: (2 + 3, -1 + 4) = (5, 3).', 'Mengurangi vektor translasi atau salah pada koordinat negatif.'),
  q('tr-02', 'transformations', 'Transformasi', 'Refleksi sumbu-x', 'Pemahaman', 'Mudah', 'Bayangan titik (4, -2) terhadap sumbu-x adalah ...', ['(-4, -2)', '(-4, 2)', '(4, 2)', '(2, 4)'], 2, 'Refleksi terhadap sumbu-x mempertahankan x dan mengubah tanda y: (4, 2).', 'Mengubah tanda x, padahal itu refleksi terhadap sumbu-y.'),
  q('tr-03', 'transformations', 'Transformasi', 'Rotasi 90°', 'Aplikasi', 'Sedang', 'Rotasi 90° berlawanan arah jarum jam terhadap titik pusat mengubah (x, y) menjadi ...', ['(y, -x)', '(-y, x)', '(-x, -y)', '(x, -y)'], 1, 'Rumus rotasi 90° berlawanan arah jarum jam adalah (x, y) → (-y, x).', 'Menggunakan rumus rotasi searah jarum jam.'),
  q('tr-04', 'transformations', 'Transformasi', 'Dilatasi', 'Penalaran', 'Sedang', 'Dilatasi berpusat di O dengan faktor skala 3 mengubah (2, -1) menjadi ...', ['(5, 2)', '(6, -3)', '(2/3, -1/3)', '(-6, 3)'], 1, 'Kalikan kedua koordinat dengan 3: (3×2, 3×(-1)) = (6, -3).', 'Hanya mengalikan salah satu koordinat atau membalik tanda.'),
  q('tr-05', 'transformations', 'Transformasi', 'Refleksi garis y = x', 'Pemahaman', 'Mudah', 'Bayangan titik (2, −3) terhadap garis y = x adalah ...', ['(−3, 2)', '(3, −2)', '(2, 3)', '(−2, −3)'], 0, 'Refleksi terhadap y = x menukar koordinat: (x, y) menjadi (y, x), sehingga (−3, 2).', 'Mengubah tanda koordinat, padahal refleksi y = x menukar posisinya.'),
  q('tr-06', 'transformations', 'Transformasi', 'Rotasi 180°', 'Aplikasi', 'Mudah', 'Rotasi 180° terhadap O mengubah titik (4, −1) menjadi ...', ['(−4, 1)', '(4, 1)', '(−1, 4)', '(1, −4)'], 0, 'Rotasi 180° mengubah (x, y) menjadi (−x, −y): (−4, 1).', 'Hanya mengubah tanda satu koordinat seperti refleksi terhadap satu sumbu.'),
  q('tr-07', 'transformations', 'Transformasi', 'Komposisi transformasi', 'Penalaran', 'Sedang', 'Titik (1, 2) ditranslasi oleh (3, −1), lalu dicerminkan terhadap sumbu-x. Bayangannya ...', ['(4, 1)', '(4, −1)', '(−4, 1)', '(−4, −1)'], 1, 'Translasi memberi (4, 1). Refleksi sumbu-x mengubah y menjadi −1, sehingga (4, −1).', 'Mencerminkan titik awal sebelum menerapkan translasi atau mengubah tanda x.'),
  q('tr-08', 'transformations', 'Transformasi', 'Luas hasil dilatasi', 'Aplikasi', 'Sedang', 'Sebuah bangun luasnya 12. Setelah dilatasi faktor skala −2, luasnya menjadi ...', ['−24', '−6', '24', '48'], 3, 'Luas dikalikan kuadrat faktor skala: (−2)² × 12 = 48.', 'Membawa tanda negatif ke luas atau hanya mengalikan dengan 2.'),

  q('lim-01', 'limits', 'Limit', 'Limit aljabar', 'Aplikasi', 'Sedang', 'Nilai lim x→3 dari (x² - 9)/(x - 3) adalah ...', ['0', '3', '6', '9'], 2, 'Faktorkan x² - 9 = (x - 3)(x + 3), lalu sederhanakan menjadi x + 3. Nilainya 6.', 'Berhenti pada bentuk 0/0 atau langsung mengganti x = 3 sebelum menyederhanakan.'),
  q('lim-02', 'limits', 'Limit', 'Limit fungsi linear', 'Pemahaman', 'Mudah', 'Nilai lim x→2 dari (3x + 1) adalah ...', ['5', '6', '7', '8'], 2, 'Fungsi linear kontinu, jadi substitusi langsung: 3(2) + 1 = 7.', 'Mengalikan 3 dengan 1 atau mengabaikan konstanta.'),
  q('lim-03', 'limits', 'Limit', 'Limit trigonometri dasar', 'Penalaran', 'Sulit', 'Nilai lim x→0 dari sin x / x adalah ...', ['0', '1', 'tidak ada', 'tak hingga'], 1, 'Ini merupakan limit trigonometri dasar yang nilainya 1 saat x diukur dalam radian.', 'Menganggap sin 0 / 0 berarti limit tidak ada.'),
  q('lim-04', 'limits', 'Limit', 'Limit satu sisi', 'Aplikasi', 'Sedang', 'Limit dua sisi di x = a ada jika limit dari kiri dan kanan ...', ['keduanya nol', 'keduanya tak hingga', 'ada dan bernilai sama', 'memiliki tanda berbeda'], 2, 'Limit dua sisi ada jika kedua limit satu sisi ada dan memberikan nilai yang sama.', 'Menganggap cukup satu sisi atau cukup keduanya terbatas.'),
  q('lim-05', 'limits', 'Limit', 'Limit bentuk akar', 'Penalaran', 'Sulit', 'Nilai lim x→0 dari (√(x + 4) − 2)/x adalah ...', ['1/2', '1/4', '1/8', '0'], 1, 'Rasionalkan pembilang: 1/(√(x+4) + 2), lalu substitusi x = 0 menghasilkan 1/4.', 'Mengganti x = 0 langsung dan berhenti pada bentuk 0/0.'),
  q('lim-06', 'limits', 'Limit tak hingga', 'Limit fungsi rasional', 'Aplikasi', 'Sedang', 'Nilai lim x→∞ dari (3x² + 1)/(x² − 2) adalah ...', ['0', '1', '2', '3'], 3, 'Derajat pembilang dan penyebut sama, jadi limitnya adalah perbandingan koefisien utama 3/1 = 3.', 'Membandingkan konstanta atau menganggap penyebut tumbuh lebih cepat.'),
  q('lim-07', 'limits', 'Limit', 'Kontinuitas fungsi', 'Pemahaman', 'Sedang', 'Agar limit dua sisi f(x) di x = a ada, nilai limit dari kiri dan kanan harus ...', ['berlawanan tanda', 'sama', 'keduanya nol', 'tak hingga'], 1, 'Kedua limit satu sisi harus menuju nilai yang sama.', 'Menganggap dua nilai berbeda masih dapat membentuk satu limit.'),
  q('lim-08', 'limits', 'Limit', 'Limit aljabar', 'Aplikasi', 'Mudah', 'Nilai lim x→2 dari (x² − 4)/(x − 2) adalah ...', ['2', '4', '6', 'tidak ada'], 1, 'Faktorkan x² − 4 = (x − 2)(x + 2), lalu bentuk sederhananya x + 2. Nilainya 4.', 'Berhenti pada 0/0 atau hanya mengambil faktor x − 2.'),
]

export const topicLabels: Record<string, string> = {
  foundations: 'Kelancaran aljabar', functions: 'Fungsi dan grafik', polynomials: 'Penalaran polinomial', matrices: 'Matriks', vectors: 'Vektor', circles: 'Lingkaran dan garis singgung', transformations: 'Transformasi', limits: 'Limit',
}

export const getQuestionsForTopic = (topicId: string) => questionBank.filter((question) => question.topicId === topicId)
export const questionCount = questionBank.length

export function shuffledQuestions(items: BankQuestion[], count = items.length): BankQuestion[] {
  return [...items].sort(() => Math.random() - 0.5).slice(0, Math.min(count, items.length))
}

export function validateQuestionBank(items: BankQuestion[] = questionBank): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  items.forEach((question) => {
    if (ids.has(question.id)) errors.push(`ID duplikat: ${question.id}`)
    ids.add(question.id)
    if (question.options.length !== 4 || new Set(question.options).size !== 4) errors.push(`Opsi tidak valid: ${question.id}`)
    if (question.answerIndex === undefined || question.answer !== question.options[question.answerIndex]) errors.push(`Jawaban tidak cocok: ${question.id}`)
    if (!question.explanation || !question.misconception) errors.push(`Pembahasan tidak lengkap: ${question.id}`)
  })
  return errors
}

export type { BankQuestion }
export default questionBank

// Validated local variants: the learner sees different numbers/orderings without changing the concept.
export const variantSeeds = questionBank.filter((question) => question.source === 'variasi-tervalidasi')

// AI-generated content must pass validateQuestionBank before being merged into this bank.
export function acceptGeneratedQuestions(items: BankQuestion[]): BankQuestion[] {
  return validateQuestionBank(items).length === 0 ? items : []
}
