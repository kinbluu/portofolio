# Desain Portofolio Rahmat

## Status dan sumber acuan

- Status: arah redesign yang disepakati, belum diterapkan pada website. Detail yang belum diputuskan tercatat di bagian akhir dokumen.
- Referensi visual: [refrensi.jpeg](./refrensi.jpeg). Gunakan sebagai inspirasi, bukan sebagai desain untuk disalin seluruhnya.
- Catatan diskusi: [DESIGN-DRAFT.md](./DESIGN-DRAFT.md). Struktur dokumen ini mengikuti contoh [example-design.md](./example-design.md), bukan palet atau isi portofolio dalam contoh tersebut.
- Sumber fakta profil dan pengalaman: [src/data/profile.ts](./src/data/profile.ts). Jangan menambahkan pengalaman, proyek, hasil, logo, atau klaim yang belum terverifikasi.
- [PRODUCT.md](./PRODUCT.md) selaras dengan arah redesign ini. Implementasi saat ini masih menggunakan studio 3D dan konten utama berbahasa Inggris hingga redesign selesai.

## Tujuan dan karakter

- Portofolio yang minimalis, sederhana, dan estetis, dengan pengalaman sebagai fokus.
- Pendekatan editorial melalui konten dan tipografi, dengan judul besar, komposisi terpusat, dan ruang kosong yang lega.
- Hindari elemen berlebihan dan tulisan pengisi. Setiap bagian harus membantu pengunjung memahami pekerjaan atau menghubungi Rahmat.
- Website tidak menggunakan elemen 3D.
- Bagian pembuka tidak menampilkan foto profil.
- Referensi memuat foto, logo, dan teks yang bukan otomatis milik Rahmat. Jangan menyalinnya sebagai identitas atau bukti pengalaman.

## Arsitektur informasi

| Bagian                       | Arah yang disepakati                                                                       | Status                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Perkenalan                   | Nama, peran, dan pengantar singkat; judul utama besar dan terpusat.                        | Isi dan susunan rinci perlu dirancang.                |
| Pengalaman                   | Ringkas seperti CV, rata tengah: peran, tempat, periode, dan poin kontribusi yang relevan. | Pengalaman menjadi fokus utama.                       |
| Kontribusi GitHub            | Bagian tersendiri setelah pengalaman.                                                      | Bentuk tampilan dan detailnya belum diputuskan.       |
| Asisten AI                   | Bagian tersendiri dalam alur halaman, bukan sekadar diasumsikan sebagai tombol mengambang. | Posisi relatif terhadap bagian lain belum diputuskan. |
| Proyek, keahlian, dan kontak | Gunakan informasi dan tujuan kontak yang benar bila ditampilkan.                           | Susunan dan penyajiannya belum diputuskan.            |

Jangan menghapus tautan kontak atau anchor yang dipakai saat ini hanya karena belum tercantum dalam urutan akhir. Perhatikan anchor `#work`, `#experience`, `#about`, `#github`, dan `#contact` yang juga digunakan asisten AI; pertahankan atau selaraskan seluruh pemakainya saat implementasi.

## Warna dan tema

| Peran                 | Arah                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------- |
| Dasar                 | Monokrom: hitam, putih, dan abu-abu.                                                        |
| Warna pendukung       | Sedikit biru sebagai aksen, digunakan seperlunya dan bukan sebagai warna dominan.           |
| Tema terang dan gelap | Keduanya mengikuti preferensi perangkat. Sesuaikan nilai dan kontras di masing-masing tema. |

Nuansa biru, nilai warna, dan penempatan aksen belum dipilih. Tombol untuk mengubah tema secara manual juga belum diputuskan. Jangan mengadopsi aksen olive atau nilai warna dari dokumen contoh sebagai keputusan baru.

## Tipografi

- Jadikan tipografi pembawa utama karakter visual, bukan dekorasi atau objek 3D.
- Judul utama berukuran besar dan rata tengah. Sesuaikan ukurannya dengan lebar layar agar tetap terbaca.
- Susun teks pengalaman secara terpusat dan ringkas, dengan pembedaan jelas antara peran, organisasi, periode, dan kontribusi.
- Jaga panjang baris, jarak, dan ukuran teks agar nyaman dibaca. Nama font, bobot, skala, dan angka ukuran belum ditentukan.

## Ruang, bentuk, dan komponen

- Gunakan ruang kosong untuk membedakan bagian dan memberi fokus pada isi, tanpa membuat halaman mobile memanjang secara berlebihan.
- Panel membulat dan bentuk tombol terlihat pada referensi, tetapi belum dipilih sebagai aturan desain. Ukuran radius, batas, dan bayangan masih terbuka.
- Komponen yang diperlukan mencakup perkenalan, entri pengalaman, kontribusi GitHub, dan asisten AI. Kebutuhan navigasi, penempatan kontak, serta komponen tambahan disesuaikan setelah susunan konten disepakati.
- Aksen dan elemen interaktif harus punya fungsi yang jelas; jangan menambahkan kartu atau ornamen hanya untuk mengisi ruang.

## Responsif

- Rancang pengalaman mobile secara khusus, bukan dengan mengecilkan tampilan desktop.
- Pertahankan isi utama dan urutan bacanya; teks tetap terbaca dan tidak terpotong atau menyebabkan gulir horizontal.
- Pada layar kecil, gunakan ruang kosong secara proporsional dan pastikan asisten tidak menghalangi konten.
- Kontribusi GitHub harus tetap terbaca tanpa memaksa kisi desktop yang terlalu lebar. Tampilan saat ini menggunakan rentang yang lebih pendek di mobile; bentuk akhirnya perlu ditinjau.
- Breakpoint dan ukuran spesifik belum dipilih; tentukan dan uji saat desain responsif dibuat.

## Interaksi dan aksesibilitas

- Ikuti preferensi warna perangkat dan respons terhadap perubahannya. Perilaku override manual masih menunggu keputusan.
- Pastikan konten portofolio tetap dapat dibaca tanpa JavaScript atau GPU; asisten AI boleh memerlukan JavaScript untuk berinteraksi.
- Semua navigasi dan kontrol harus dapat digunakan dengan keyboard, mempunyai nama yang jelas, dan menampilkan fokus yang terlihat.
- Targetkan area interaksi sedikitnya 44 × 44 px. Jangan mengandalkan warna saja untuk membedakan status atau tautan.
- Penuhi kontras minimal WCAG AA: 4,5:1 untuk teks normal dan 3:1 untuk teks besar. Rasio warna aktual belum diukur.
- Hormati `prefers-reduced-motion` dan hindari animasi atau scroll yang menghalangi pembacaan.
- Pertahankan informasi status, keadaan gagal, dan pemulihan untuk kontribusi GitHub serta asisten AI.

## Konten dan suara

- Gunakan bahasa Indonesia pada konten portofolio. Asisten AI tetap menggunakan perilaku dan bahasa yang ada saat ini.
- Tulis dengan singkat dan spesifik; utamakan peran dan kontribusi nyata daripada slogan atau paragraf pengisi.
- Peran dan riwayat mengacu pada `src/data/profile.ts`. Terjemahan tidak boleh mengubah makna atau menambahkan klaim.
- Bila angka cakupan LEAP ditampilkan, pertahankan penanda perkiraan untuk sekitar 50 staf dan 1.000 siswa. Jumlah serta rincian modul perlu dikonfirmasi sebelum diklaim sebagai fakta final.

## Catatan implementasi dan verifikasi

Dokumen ini belum mengubah website. Selama implementasi redesign:

- Jaga konsistensi bahasa dan keputusan desain pada data profil, navigasi, `PRODUCT.md`, serta semua konsumen yang terkait.
- Pertahankan perilaku data kontribusi GitHub, kondisi loading dan gagal, tautan pemulihan, dan batasan keamanan asisten AI.
- Uji mode terang dan gelap mengikuti perangkat, keyboard, ukuran target, kontras, serta preferensi reduced motion. Pastikan pengalaman tetap dapat dibaca tanpa JavaScript.
- Periksa tampilan desktop dan mobile, termasuk keadaan asisten dan kontribusi GitHub. Jalankan pemeriksaan `bun check`, `bun lint`, `bun fmt --check`, dan `bun run build`; gunakan Obscura untuk pengujian browser.
- Tinjau dan sesuaikan pengujian yang khusus untuk studio 3D dengan arah baru tanpa menghilangkan cakupan perilaku yang masih relevan.

## Hal yang belum diputuskan

- Font, skala tipografi, jarak, radius, dan nilai warna termasuk nuansa biru.
- Urutan asisten AI serta susunan dan penyajian proyek, keahlian, dan kontak.
- Bentuk kontribusi GitHub dan antarmuka asisten AI pada desktop dan mobile.
- Ada atau tidaknya pilihan tema manual selain mengikuti perangkat.
- Elemen lain dari referensi yang ingin digunakan, serta rincian desain untuk tablet dan mobile.
