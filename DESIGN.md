# Desain Portofolio Rahmat

## Status dan sumber acuan

- Status: implementasi awal redesign tersedia di workspace dan masih menunggu tinjauan visual pengguna. Detail yang belum diputuskan tercatat di bagian akhir dokumen.
- Referensi visual: [refrensi.jpeg](./refrensi.jpeg). Gunakan sebagai inspirasi, bukan sebagai desain untuk disalin seluruhnya.
- Catatan diskusi: [DESIGN-DRAFT.md](./DESIGN-DRAFT.md). Struktur dokumen ini mengikuti contoh [example-design.md](./example-design.md), bukan palet atau isi portofolio dalam contoh tersebut.
- Sumber fakta profil dan pengalaman: [src/data/profile.ts](./src/data/profile.ts). Jangan menambahkan pengalaman, proyek, hasil, logo, atau klaim yang belum terverifikasi.
- [PRODUCT.md](./PRODUCT.md) selaras dengan arah redesign ini. Halaman utama menggunakan konten bahasa Inggris tanpa merender studio 3D.

## Tujuan dan karakter

- Portofolio yang minimalis, sederhana, dan estetis, dengan pengalaman sebagai fokus.
- Pendekatan editorial melalui konten dan tipografi, dengan judul besar, komposisi terpusat, dan ruang kosong yang lega.
- Hindari elemen berlebihan dan tulisan pengisi. Setiap bagian harus membantu pengunjung memahami pekerjaan atau menghubungi Rahmat.
- Website tidak menggunakan elemen 3D.
- Bagian pembuka tidak menampilkan foto profil.
- Referensi memuat foto, logo, dan teks yang bukan otomatis milik Rahmat. Jangan menyalinnya sebagai identitas atau bukti pengalaman.

## Arsitektur informasi

| Bagian                       | Arah yang disepakati                                                                  | Status                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Perkenalan                   | Nama, peran, dan pengantar singkat; judul utama besar dan terpusat.                   | Ada di awal halaman.                                                                        |
| Pengalaman                   | Ringkas seperti CV, rata tengah: peran, tempat, periode, dan kontribusi yang relevan. | Pengalaman menjadi fokus utama.                                                             |
| Kontribusi GitHub            | Bagian tersendiri setelah pengalaman.                                                 | Kalender tetap menggunakan server island dan fallback.                                      |
| Asisten AI                   | Bagian tersendiri dalam alur halaman, bukan tombol mengambang.                        | Penempatan awal setelah keahlian dan sebelum kontak; belum diputuskan sebagai posisi final. |
| Proyek, keahlian, dan kontak | Informasi dan tujuan kontak yang nyata.                                               | Pekerjaan saat ini, keahlian, dan kontak tersedia di halaman.                               |

Jangan menghapus tautan kontak atau anchor yang dipakai saat ini hanya karena belum tercantum dalam urutan akhir. Perhatikan anchor `#work`, `#experience`, `#about`, `#github`, dan `#contact` yang juga digunakan asisten AI; pertahankan atau selaraskan seluruh pemakainya saat implementasi.

## Warna dan tema

| Token          | Terang    | Gelap     | Penggunaan           |
| -------------- | --------- | --------- | -------------------- |
| `--rm3-canvas` | `#e9e9eb` | `#111214` | Latar halaman        |
| `--rm3-paper`  | `#fafafa` | `#1b1c20` | Permukaan konten     |
| `--rm3-ink`    | `#1c1d20` | `#f3f3f4` | Teks utama           |
| `--rm3-muted`  | `#555b63` | `#b9bdc5` | Teks sekunder        |
| `--rm3-line`   | `#d6d8dc` | `#43464d` | Garis pemisah        |
| `--rm3-accent` | `#2854a4` | `#a9c5ff` | Aksen biru dan fokus |

Nilai implementasi awal berada di `src/styles/portfolio.css` dan masih dapat disesuaikan setelah ditinjau pengguna. Tema mengikuti perangkat tanpa tombol manual pada iterasi ini; penambahan override manual masih terbuka. Aksen olive dan nilai warna dokumen contoh tidak digunakan.

## Tipografi

- Jadikan tipografi pembawa utama karakter visual, bukan dekorasi atau objek 3D.
- Judul utama berukuran besar dan rata tengah. Sesuaikan ukurannya dengan lebar layar agar tetap terbaca.
- Susun teks pengalaman secara terpusat dan ringkas, dengan pembedaan jelas antara peran, organisasi, periode, dan kontribusi.
- Implementasi awal memakai Manrope untuk judul dan DM Sans untuk isi. Judul utama memakai `clamp(2rem, 5.5vw, 5.5rem)`; ukuran dan pilihan font dapat ditinjau kembali.

## Ruang, bentuk, dan komponen

- Gunakan ruang kosong untuk membedakan bagian dan memberi fokus pada isi, tanpa membuat halaman mobile memanjang secara berlebihan.
- Implementasi awal menggunakan satu permukaan halaman dengan sudut 28 px di desktop dan 18 px di mobile, serta panel asisten 14 px di desktop dan 12 px di mobile. Hindari menambahkan panel berulang tanpa fungsi.
- Komponen yang diperlukan mencakup perkenalan, entri pengalaman, kontribusi GitHub, dan asisten AI. Kebutuhan navigasi, penempatan kontak, serta komponen tambahan disesuaikan setelah susunan konten disepakati.
- Aksen dan elemen interaktif harus punya fungsi yang jelas; jangan menambahkan kartu atau ornamen hanya untuk mengisi ruang.

## Responsif

- Rancang pengalaman mobile secara khusus, bukan dengan mengecilkan tampilan desktop.
- Pertahankan isi utama dan urutan bacanya; teks tetap terbaca dan tidak terpotong atau menyebabkan gulir horizontal.
- Pada layar kecil, gunakan ruang kosong secara proporsional dan pastikan asisten tidak menghalangi konten.
- Kontribusi GitHub harus tetap terbaca tanpa memaksa kisi desktop yang terlalu lebar. Tampilan saat ini menggunakan rentang yang lebih pendek di mobile; bentuk akhirnya perlu ditinjau.
- Navigasi beralih ke menu ringkas pada lebar maksimal 60rem; penyesuaian mobile tambahan ada pada 40rem dan 600px. Uji pada lebar yang lebih beragam saat pengembangan.

## Interaksi dan aksesibilitas

- Tema mengikuti preferensi warna perangkat dan berubah tanpa reload. Override manual belum tersedia dan masih menunggu keputusan.
- Pastikan konten portofolio tetap dapat dibaca tanpa JavaScript atau GPU; asisten AI boleh memerlukan JavaScript untuk berinteraksi.
- Semua navigasi dan kontrol harus dapat digunakan dengan keyboard, mempunyai nama yang jelas, dan menampilkan fokus yang terlihat.
- Targetkan area interaksi sedikitnya 44 × 44 px. Jangan mengandalkan warna saja untuk membedakan status atau tautan.
- Targetkan kontras WCAG AA: 4,5:1 untuk teks normal dan 3:1 untuk teks besar. Pasangan teks utama terhadap permukaan terukur 16,15:1 terang dan 15,35:1 gelap; teks sekunder 6,57:1 dan 9,04:1. Pasangan lain tetap perlu diperiksa sesuai penggunaannya.
- Hormati `prefers-reduced-motion` dan hindari animasi atau scroll yang menghalangi pembacaan.
- Pertahankan informasi status, keadaan gagal, dan pemulihan untuk kontribusi GitHub serta asisten AI.

## Konten dan suara

- Gunakan bahasa Inggris pada konten portofolio dan respons asisten AI.
- Tulis dengan singkat dan spesifik; utamakan peran dan kontribusi nyata daripada slogan atau paragraf pengisi.
- Peran dan riwayat mengacu pada `src/data/profile.ts`. Terjemahan tidak boleh mengubah makna atau menambahkan klaim.
- Bila angka cakupan LEAP ditampilkan, pertahankan penanda perkiraan untuk sekitar 50 staf dan 1.000 siswa. Jumlah serta rincian modul perlu dikonfirmasi sebelum diklaim sebagai fakta final.

## Catatan implementasi dan verifikasi

Implementasi awal sudah dibuat; tinjauan pengguna dan verifikasi lanjutan tetap diperlukan:

- Jaga konsistensi bahasa dan keputusan desain pada data profil, navigasi, `PRODUCT.md`, serta semua konsumen yang terkait.
- Pertahankan perilaku data kontribusi GitHub, kondisi loading dan gagal, tautan pemulihan, dan batasan keamanan asisten AI.
- Uji mode terang dan gelap mengikuti perangkat, keyboard, ukuran target, kontras, serta preferensi reduced motion. Pastikan pengalaman tetap dapat dibaca tanpa JavaScript.
- Periksa tampilan desktop dan mobile, termasuk keadaan asisten dan kontribusi GitHub. Jalankan pemeriksaan `bun check`, `bun lint`, `bun fmt --check`, dan `bun run build`; gunakan Obscura untuk pengujian browser.
- Pengujian perilaku umum yang masih relevan dicakup ulang di `tests/portfolio-redesign.e2e.ts`; tes studio 3D lama tetap tersimpan sebagai referensi dan tidak dipakai untuk verifikasi desain ini.

## Verifikasi implementasi awal

- Pengujian Obscura mencakup lebar 320, 390, 768, dan 1440 px, anchor, perubahan tema, HTML server, chat dengan respons tiruan, serta pemulihan GitHub untuk HTTP 503 dan koneksi putus.
- Obscura tidak memverifikasi JavaScript yang benar-benar dimatikan atau aktivasi keyboard bawaan. Pemeriksaan browser desktop terpisah memastikan konten utama dan fallback tersedia tanpa JavaScript, serta Tab, Enter, Space, dan Escape bekerja pada navigasi yang diuji.
- Chat diuji dengan respons lokal tiruan; panggilan ke penyedia AI sebenarnya tidak dilakukan. Aturan CSS cetak diperiksa, tetapi hasil cetak sesungguhnya belum diuji. Tinjauan visual akhir tetap menunggu pengguna.

## Hal yang belum diputuskan

- Persetujuan pengguna atas implementasi awal, termasuk font, jarak, radius, dan nuansa biru.
- Posisi final asisten AI dan penyajian proyek, keahlian, serta kontak.
- Ada atau tidaknya pilihan tema manual selain mengikuti perangkat.
- Gambar pratinjau sosial baru: gambar lama dinonaktifkan atas pilihan pengguna karena masih menampilkan studio 3D.
