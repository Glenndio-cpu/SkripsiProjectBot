import React from 'react';
import Layout from '../components/layout/Layout';
import { Salad, Droplets, Dumbbell, Moon, Brain, CigaretteOff, Wine, ShieldCheck, Stethoscope, Users, Sun, MonitorOff, Flame, Heart, Sparkles, Apple, Bike, Pipette, Leaf, Citrus, Armchair, ChefHat, Smile, HandMetal, PersonStanding, Sunrise, Calendar, type LucideIcon } from 'lucide-react';

type PreventionTip = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const Pencegahan: React.FC = () => {
  const tips: PreventionTip[] = [
    {
      icon: Salad,
      title: 'Makan Makanan Bergizi Seimbang',
      description: 'Konsumsi berbagai jenis makanan seperti sayuran, buah-buahan, biji-bijian utuh, protein tanpa lemak (ikan, ayam), dan lemak sehat (alpukat, kacang-kacangan). Hindari terlalu banyak gula dan makanan olahan.'
    },
    {
      icon: Droplets,
      title: 'Minum Cukup Air Setiap Hari',
      description: 'Tubuh membutuhkan air untuk mencerna makanan, mengatur suhu tubuh, dan membuang racun. Usahakan minum minimal 8 gelas per hari atau lebih jika sedang aktif atau cuaca panas.'
    },
    {
      icon: Dumbbell,
      title: 'Olahraga Secara Teratur',
      description: 'Lakukan aktivitas fisik minimal 30 menit sehari, 5 hari dalam seminggu. Bisa berupa jalan cepat, jogging, yoga, atau latihan kekuatan. Olahraga membantu menjaga berat badan dan mendukung kesehatan jantung serta mental.'
    },
    {
      icon: Moon,
      title: 'Tidur Berkualitas Setiap Malam',
      description: 'Tidur cukup (7–9 jam/hari) penting untuk pemulihan tubuh, fungsi otak, dan kesehatan emosional. Buat rutinitas tidur yang tenang dan hindari layar sebelum tidur.'
    },
    {
      icon: Brain,
      title: 'Kelola Stres dengan Baik',
      description: 'Stres yang tidak terkontrol bisa menyebabkan penyakit fisik dan mental. Lakukan teknik relaksasi seperti meditasi, pernapasan dalam, atau hobi yang menyenangkan untuk melepas ketegangan.'
    },
    {
      icon: CigaretteOff,
      title: 'Hindari Merokok dan Paparan Asap Rokok',
      description: 'Merokok merusak paru-paru dan meningkatkan risiko kanker, penyakit jantung, dan gangguan kesehatan lainnya. Berhenti merokok kapan saja bisa memberi manfaat besar bagi kesehatan.'
    },
    {
      icon: Wine,
      title: 'Batasi Konsumsi Alkohol',
      description: 'Jika mengonsumsi alkohol, lakukan secara moderat atau hindari sama sekali. Batasi maksimal 1 gelas per hari untuk wanita dan 2 gelas untuk pria. Lebih baik lagi jika tidak dikonsumsi sama sekali.'
    },
    {
      icon: ShieldCheck,
      title: 'Jaga Kebersihan Diri dan Lingkungan',
      description: 'Rajin mencuci tangan, mandi setiap hari, dan menjaga kebersihan lingkungan rumah dapat mencegah penyebaran penyakit infeksi seperti flu, diare, dan penyakit kulit.'
    },
    {
      icon: Stethoscope,
      title: 'Lakukan Pemeriksaan Kesehatan Rutin',
      description: 'Kunjungi dokter secara berkala untuk skrining kesehatan, vaksinasi, dan deteksi dini masalah kesehatan. Pencegahan lebih baik daripada pengobatan.'
    },
    {
      icon: Users,
      title: 'Bangun Hubungan Sosial yang Positif',
      description: 'Interaksi sosial yang sehat meningkatkan kesejahteraan emosional dan mental. Curahkan perasaan kepada keluarga atau teman terpercaya saat sedang kesulitan.'
    },
    {
      icon: Sun,
      title: 'Dapatkan Paparan Matahari Secara Cukup',
      description: 'Vitamin D dari sinar matahari pagi penting untuk kesehatan tulang dan sistem imun. Berjemur selama 10–15 menit setiap pagi bisa memberi manfaat besar.'
    },
    {
      icon: MonitorOff,
      title: 'Kurangi Penggunaan Gadget dan Layar',
      description: 'Terlalu banyak waktu di depan layar bisa menyebabkan mata lelah, kurang tidur, dan isolasi sosial. Luangkan waktu bebas gadget untuk beraktivitas offline seperti membaca atau berkebun.'
    },
    {
      icon: Flame,
      title: 'Praktikkan Pola Hidup Minimalis dan Tenang',
      description: 'Kurangi kebiasaan multitasking, hidup sederhana, dan fokus pada hal-hal yang benar-benar penting. Ini membantu mengurangi stres dan meningkatkan kualitas hidup.'
    },
    {
      icon: Heart,
      title: 'Rajin Merawat Kesehatan Mulut dan Gigi',
      description: 'Sikat gigi dua kali sehari, gunakan benang gigi (floss), dan kunjungi dokter gigi setiap 6 bulan. Kesehatan gigi terkait erat dengan kesehatan jantung dan diabetes.'
    },
    {
      icon: Sparkles,
      title: 'Tanamkan Pikiran dan Mental yang Positif',
      description: 'Latih diri untuk bersyukur, berpikir optimis, dan melihat tantangan sebagai peluang belajar. Mental yang kuat mampu meningkatkan daya tahan tubuh dan kualitas hidup secara keseluruhan.'
    },
    {
      icon: Apple,
      title: 'Makan Perlahan dan Nikmati Setiap Suapan',
      description: 'Makan tergesa-gesa dapat mengganggu pencernaan dan menyebabkan makan berlebihan. Luangkan waktu untuk mengunyah makanan dengan baik (sekitar 20–30 kali per suapan), agar tubuh lebih mudah mencerna dan otak memberi sinyal kenyang.'
    },
    {
      icon: Brain,
      title: 'Latih Otak dengan Aktivitas Stimulatif',
      description: 'Seperti tubuh, otak juga butuh latihan. Lakukan aktivitas seperti membaca buku, menyelesaikan teka-teki silang, belajar bahasa baru, atau bermain alat musik. Ini bisa meningkatkan daya ingat, fokus, dan melindungi otak dari penuaan dini.'
    },
    {
      icon: Bike,
      title: 'Pilih Transportasi atau Aktivitas yang Ramah Gerak',
      description: 'Jika memungkini, jalan kaki atau naik sepeda ke tempat kerja atau pasar. Selain ramah lingkungan, hal ini bisa meningkatkan kebugaran jantung, membantu pengelolaan berat badan, serta membuat suasana hati lebih baik karena terpapar alam bebas.'
    },
    {
      icon: Pipette,
      title: 'Gunakan Skincare yang Sesuai dengan Jenis Kulitmu',
      description: 'Kulit adalah organ terbesar di tubuh, dan merawatnya bukan hanya soal kecantikan, tapi juga kesehatan. Gunakan produk perawatan kulit yang sesuai jenis kulitmu (berminyak, kering, sensitif, atau kombinasi). Pastikan tidak mengandung bahan berbahaya seperti merkuri atau hidrokuinon. Jangan lupa pakai sunscreen setiap hari untuk melindungi kulit dari paparan sinar UV.'
    },
    {
      icon: Leaf,
      title: 'Coba Masukkan Suplemen Alami ke Dalam Diet',
      description: 'Beberapa bahan alami seperti jahe, kunyit, madu, dan probiotik (dari yogurt atau kimchi) bisa membantu sistem pencernaan, meningkatkan imunitas, dan mengurangi peradangan. Namun, pastikan sesuai anjuran ahli gizi atau dokter.'
    },
    {
      icon: Citrus,
      title: 'Penuhi Kebutuhan Vitamin Harianmu secara Alami atau Suplemen',
      description: 'Vitamin seperti C, D, B kompleks, dan E sangat penting untuk sistem imun, energi, kesehatan kulit, dan fungsi otak. Penuhi dari sumber alami seperti jeruk, sayuran hijau, ikan, telur, dan susu. Jika diperlukan dan atas rekomendasi dokter, gunakan suplemen untuk memenuhi kekurangan tertentu seperti vitamin D atau B12.'
    },
    {
      icon: Armchair,
      title: 'Hindari Duduk Terlalu Lama',
      description: 'Jika pekerjaanmu banyak duduk, coba istirahat setiap 30–60 menit untuk berdiri, meregangkan tubuh, atau jalan kaki sebentar. Duduk terlalu lama dikaitkan dengan risiko penyakit jantung, diabetes, dan nyeri punggung.'
    },
    {
      icon: ChefHat,
      title: 'Masak Sendiri Makananmu Lebih Sering',
      description: 'Memasak sendiri memberimu kontrol penuh atas bahan dan cara pengolahannya. Kamu bisa menghindari makanan tinggi garam, gula, dan minyak tidak sehat. Selain lebih sehat, memasak juga bisa menjadi bentuk terapi dan momen berkumpul bersama keluarga.'
    },
    {
      icon: Smile,
      title: 'Praktikkan Sikap Bersyukur Setiap Hari',
      description: 'Luangkan waktu 5 menit setiap hari untuk mencatat atau mengingat hal-hal baik yang terjadi hari itu. Rasa syukur membantu mengurangi stres, meningkatkan mood, dan memperkuat hubungan sosial. Ini bagian penting dari kesehatan mental dan emosional.'
    },
    {
      icon: HandMetal,
      title: 'Selalu Cuci Tangan Sebelum Makan dan Setelah Keluar Rumah',
      description: 'Ini langkah sederhana namun efektif mencegah masuknya bakteri dan virus ke dalam tubuh. Gunakan sabun minimal 20 detik, atau hand sanitizer jika tidak ada air. Kebersihan tangan adalah salah satu benteng pertama pertahanan kesehatan kita.'
    },
	{
      icon: PersonStanding,
      title: 'Perbaiki Postur Tubuhmu Setiap Hari untuk Kesehatan Jangka Panjang',
      description: 'Postur tubuh yang baik bukan hanya soal terlihat tegak dan percaya diri, tapi juga mendasari kesehatan tulang belakang, fungsi organ dalam, dan kenyamanan saat beraktivitas. Banyak dari kita menghabiskan waktu lama di depan komputer, ponsel, atau meja kerja — hal ini sering menyebabkan bungkuk, nyeri leher, sakit punggung, hingga gangguan pernapasan.'
    },
	{
      icon: Sunrise,
      title: 'Bangun Lebih Awal untuk Memulai Hari dengan Energi Positif',
      description: 'Memiliki pagi yang tenang dan produktif bisa menjadi fondasi kuat untuk hari yang menyenangkan dan penuh energi. Bangun lebih awal tidak harus langsung berarti bangun sangat pagi; cukup atur alarm 15–30 menit lebih cepat dari biasanya dan gunakan waktu itu untuk aktivitas yang menenangkan dan menyehatkan.'
    }
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center text-blue-800 border-b-2 border-blue-500 pb-3 mb-8">
           Pencegahan & Gaya Hidup Sehat
        </h1>
        <p className="text-center italic text-gray-600 mb-10 text-lg">
          Tips sederhana untuk gaya hidup sehat dan pencegahan penyakit
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tips.map((tip, index) => (
            <div 
              key={index}
              className="bg-white border-2 border-blue-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start">
                <tip.icon className="w-8 h-8 mr-4 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg text-blue-700 mb-2">{tip.title}</h3>
                  <p className="text-gray-600">{tip.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-xl border border-blue-200">
          <h3 className="text-xl font-semibold text-blue-800 mb-3 flex items-center">
            <Calendar className="w-6 h-6 mr-2" /> Bonus: Jadwal Harian Sehat
          </h3>
          <p className="text-gray-700">
            Atur waktu untuk makan teratur, istirahat, kerja, rekreasi, dan waktu bersama orang tercinta. 
            Kehidupan yang terorganisasi membuat kita lebih mudah menjaga pola hidup sehat.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Pencegahan;