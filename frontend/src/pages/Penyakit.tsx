import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { trackArticleRead } from '../lib/userActivityTracking';
import { Bug, HeartPulse, AlertTriangle, Search, ChevronLeft, ChevronRight, ExternalLink, MessageCircle } from 'lucide-react';

type DiseaseType = 'menular' | 'tidak-menular';
type SeverityLevel = 'ringan' | 'sedang' | 'berat';

interface Disease {
  name: string;
  symptoms: string;
  prevention: string;
  type: DiseaseType;
  severity: SeverityLevel;
  transmission?: string;
}

const Penyakit = () => {
  const [selectedType, setSelectedType] = useState<DiseaseType | 'semua'>('semua');
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel | 'semua'>('semua');
  const [expandedPandemic, setExpandedPandemic] = useState<number | null>(null);

  const handleDiseaseClick = (diseaseName: string) => {
    trackArticleRead(diseaseName);
  };

  const diseases: Disease[] = [
    { name: "COVID-19", symptoms: "Demam, batuk kering, kelelahan, kehilangan indra penciuman dan perasa", prevention: "Vaksinasi, menjaga jarak, memakai masker, sering mencuci tangan", type: "menular", severity: "sedang", transmission: "Droplet pernapasan saat batuk/bersin, kontak dengan permukaan terkontaminasi" },
    { name: "Influenza", symptoms: "Demam tinggi, sakit tenggorokan, nyeri otot, batuk, kelelahan", prevention: "Vaksinasi tahunan, mencuci tangan, menghindari kontak dengan orang sakit", type: "menular", severity: "sedang", transmission: "Droplet udara dari batuk/bersin, kontak langsung dengan penderita" },
    { name: "Demam Berdarah", symptoms: "Demam tinggi, nyeri otot dan sendi, ruam, pendarahan ringan", prevention: "Menghilangkan genangan air, menggunakan kelambu, memakai repellent", type: "menular", severity: "berat", transmission: "Gigitan nyamuk Aedes aegypti yang terinfeksi virus dengue" },
    { name: "Tuberculosis", symptoms: "Batuk berkepanjangan, batuk darah, nyeri dada, penurunan berat badan", prevention: "Vaksinasi BCG, ventilasi baik, deteksi dini dan pengobatan tepat", type: "menular", severity: "berat", transmission: "Udara saat penderita batuk/bersin, kontak lama dengan penderita aktif" },
    { name: "Cacar Air", symptoms: "Ruam merah gatal, lecet kecil berisi cairan, demam, kelelahan", prevention: "Vaksinasi varicella, menghindari kontak dengan orang terinfeksi", type: "menular", severity: "ringan", transmission: "Udara (airborne), kontak langsung dengan cairan lepuh penderita" },
    { name: "Diare", symptoms: "Tinja encer, kram perut, mual, muntah, demam ringan", prevention: "Cuci tangan, konsumsi air bersih, makanan yang dimasak dengan benar", type: "menular", severity: "ringan", transmission: "Fecal-oral (makanan/air terkontaminasi), kontak dengan tangan kotor" },
    { name: "Malaria", symptoms: "Demam tinggi, menggigil, sakit kepala, mual, nyeri otot", prevention: "Kelambu berinsektisida, repellent, profilaksis untuk traveler", type: "menular", severity: "berat", transmission: "Gigitan nyamuk Anopheles betina yang terinfeksi parasit Plasmodium" },
    { name: "Hepatitis B", symptoms: "Kelelahan, mual, sakit perut, kulit kuning, urin gelap", prevention: "Vaksinasi, hindari berbagi jarum, hubungan seks aman", type: "menular", severity: "sedang", transmission: "Darah/cairan tubuh, jarum suntik terkontaminasi, hubungan seksual, ibu ke bayi" },
    { name: "Campak", symptoms: "Demam tinggi, batuk, pilek, mata merah, ruam kulit", prevention: "Vaksinasi MMR, isolasi penderita, kebersihan tangan", type: "menular", severity: "sedang", transmission: "Udara (sangat menular), droplet dari batuk/bersin penderita" },
    { name: "Kolera", symptoms: "Diare berat, dehidrasi, muntah, kram otot", prevention: "Air bersih, sanitasi baik, vaksin oral, masak makanan matang", type: "menular", severity: "berat", transmission: "Air/makanan terkontaminasi bakteri Vibrio cholerae dari feses penderita" },
    { name: "Polio", symptoms: "Demam, kelelahan, muntah, nyeri otot, kelumpuhan", prevention: "Vaksinasi IPV/OPV, kebersihan tangan, sanitasi baik", type: "menular", severity: "berat", transmission: "Fecal-oral, air/makanan terkontaminasi virus polio dari feses" },
    { name: "HIV/AIDS", symptoms: "Demam berkepanjangan, penurunan berat badan, infeksi oportunistik", prevention: "Penggunaan kondom, tidak berbagi jarum, PrEP untuk risiko tinggi", type: "menular", severity: "berat", transmission: "Darah, cairan seksual, ASI, jarum suntik bersama, ibu ke bayi" },
    { name: "Ebola", symptoms: "Demam mendadak, lemah, nyeri otot, sakit kepala, perdarahan", prevention: "Hindari kontak dengan pasien/benda terkontaminasi, karantina ketat", type: "menular", severity: "berat", transmission: "Kontak langsung dengan darah/cairan tubuh penderita atau hewan terinfeksi" },
    { name: "Zika", symptoms: "Demam ringan, ruam, nyeri sendi, konjungtivitis", prevention: "Kontrol nyamuk, repellent, hindari daerah endemik saat hamil", type: "menular", severity: "ringan", transmission: "Gigitan nyamuk Aedes, hubungan seksual, ibu ke janin saat hamil" },
    { name: "SARS", symptoms: "Demam tinggi, batuk kering, sesak napas, sakit kepala", prevention: "Kebersihan tangan, masker, isolasi penderita, ventilasi baik", type: "menular", severity: "berat", transmission: "Droplet pernapasan, kontak dekat dengan penderita, permukaan terkontaminasi" },
    { name: "ISPA", symptoms: "Batuk, pilek, sakit tenggorokan, demam ringan, hidung tersumbat", prevention: "Cuci tangan, hindari asap rokok, jaga daya tahan tubuh, ventilasi baik", type: "menular", severity: "ringan", transmission: "Droplet dari batuk/bersin, kontak dengan penderita, permukaan terkontaminasi" },
    { name: "Common Cold", symptoms: "Pilek, bersin, hidung tersumbat, sakit tenggorokan ringan, kelelahan", prevention: "Cuci tangan sering, hindari kontak dengan penderita, jaga kebersihan", type: "menular", severity: "ringan", transmission: "Droplet pernapasan, kontak tangan dengan hidung/mulut setelah menyentuh benda terkontaminasi" },
    { name: "Diare - GEA", symptoms: "Diare cair, mual, muntah, kram perut, demam ringan, dehidrasi", prevention: "Cuci tangan dengan sabun, konsumsi air matang, makanan bersih dan higienis", type: "menular", severity: "sedang", transmission: "Fecal-oral melalui makanan/minuman terkontaminasi, tangan kotor" },
    { name: "Varicella", symptoms: "Ruam merah berisi cairan, gatal, demam, kelelahan, sakit kepala", prevention: "Vaksinasi varicella, hindari kontak dengan penderita, isolasi saat sakit", type: "menular", severity: "ringan", transmission: "Udara (airborne) dan kontak langsung dengan cairan vesikel" },
    { name: "Pneumonia", symptoms: "Batuk berdahak, demam tinggi, sesak napas, nyeri dada, menggigil", prevention: "Vaksinasi pneumonia, hindari rokok, cuci tangan, jaga daya tahan tubuh", type: "menular", severity: "berat", transmission: "Droplet pernapasan, aspirasi bakteri dari mulut/tenggorokan" },
    { name: "Dermatitis", symptoms: "Kulit merah, gatal, ruam, kulit kering dan mengelupas, bengkak", prevention: "Hindari alergen, jaga kelembaban kulit, gunakan sabun lembut, hindari garukan", type: "menular", severity: "ringan", transmission: "Kontak langsung kulit ke kulit atau dengan benda yang terkontaminasi (tergantung jenis)" },
    { name: "Skabies", symptoms: "Gatal parah (terutama malam), ruam merah, luka bekas garuk, benjolan kecil", prevention: "Jaga kebersihan pribadi, hindari berbagi pakaian/handuk, cuci sprei rutin dengan air panas", type: "menular", severity: "ringan", transmission: "Kontak kulit langsung yang lama, berbagi pakaian/tempat tidur dengan penderita" },
    { name: "Diabetes", symptoms: "Sering haus, sering buang air kecil, kelelahan, luka sulit sembuh", prevention: "Pola makan sehat, olahraga teratur, jaga berat badan ideal, hindari gula berlebih", type: "tidak-menular", severity: "sedang" },
    { name: "Hipertensi", symptoms: "Sakit kepala, pusing, sesak napas, nyeri dada, penglihatan kabur", prevention: "Kurangi garam, olahraga rutin, kelola stres, hindari rokok dan alkohol", type: "tidak-menular", severity: "sedang" },
    { name: "Stroke", symptoms: "Kelemahan wajah/tangan, bicara tidak jelas, sakit kepala parah mendadak", prevention: "Kontrol tekanan darah, pola hidup sehat, hindari rokok, olahraga teratur", type: "tidak-menular", severity: "berat" },
    { name: "Jantung Koroner", symptoms: "Nyeri dada, sesak napas, kelelahan, jantung berdebar", prevention: "Diet rendah lemak, olahraga rutin, tidak merokok, kelola stres", type: "tidak-menular", severity: "berat" },
    { name: "Asma", symptoms: "Sesak napas, mengi, batuk (terutama malam), dada sesak", prevention: "Hindari pemicu (debu, asap), gunakan inhaler sesuai resep, jaga kebersihan", type: "tidak-menular", severity: "sedang" },
    { name: "Kanker", symptoms: "Bervariasi tergantung jenis (benjolan, penurunan berat badan, kelelahan)", prevention: "Pola hidup sehat, hindari rokok, deteksi dini, vaksinasi (HPV, Hepatitis B)", type: "tidak-menular", severity: "berat" },
    { name: "Osteoporosis", symptoms: "Tulang mudah patah, postur membungkuk, nyeri punggung", prevention: "Konsumsi kalsium & vitamin D, olahraga beban, hindari rokok & alkohol", type: "tidak-menular", severity: "sedang" },
    { name: "Obesitas", symptoms: "Kelebihan berat badan, kesulitan bernapas, nyeri sendi, kelelahan", prevention: "Pola makan seimbang, olahraga teratur, batasi kalori, hindari makanan olahan", type: "tidak-menular", severity: "sedang" },
    { name: "Gagal Ginjal", symptoms: "Kelelahan, bengkak kaki/tangan, urin berbusa, mual, sesak napas", prevention: "Kontrol diabetes & hipertensi, minum air cukup, hindari obat berlebihan", type: "tidak-menular", severity: "berat" },
    { name: "PPOK", symptoms: "Batuk kronis, sesak napas, mengi, produksi dahak berlebih", prevention: "Berhenti merokok, hindari polusi udara, vaksinasi flu & pneumonia", type: "tidak-menular", severity: "berat" },
    { name: "DM Tipe 2", symptoms: "Sering haus dan lapar, sering buang air kecil, penurunan berat badan, luka lambat sembuh", prevention: "Pola makan rendah gula, olahraga teratur, jaga berat badan, cek gula darah rutin", type: "tidak-menular", severity: "sedang" },
    { name: "Hiperuricemia", symptoms: "Nyeri sendi (terutama jempol kaki), bengkak, kemerahan, kaku sendi", prevention: "Batasi makanan tinggi purin (jeroan, seafood), minum air cukup, hindari alkohol", type: "tidak-menular", severity: "sedang" },
    { name: "Dislipidemia", symptoms: "Umumnya tanpa gejala, terdeteksi melalui tes darah (kolesterol tinggi)", prevention: "Diet rendah lemak jenuh, olahraga rutin, hindari makanan gorengan, cek kolesterol berkala", type: "tidak-menular", severity: "sedang" },
    { name: "CKD", symptoms: "Kelelahan, bengkak kaki/mata, urin berbusa, mual, tekanan darah tinggi", prevention: "Kontrol diabetes & hipertensi, minum air cukup, hindari obat nefrotoksik, diet rendah protein", type: "tidak-menular", severity: "berat" },
    { name: "Anemia", symptoms: "Kelelahan, pucat, pusing, sesak napas ringan, jantung berdebar", prevention: "Konsumsi makanan kaya zat besi, vitamin B12 dan asam folat, suplementasi jika perlu", type: "tidak-menular", severity: "ringan" },
    { name: "Gastritis", symptoms: "Nyeri ulu hati, mual, kembung, cepat kenyang, muntah", prevention: "Hindari makanan pedas/asam, makan teratur, kurangi stres, hindari alkohol dan NSAID", type: "tidak-menular", severity: "ringan" },
    { name: "Migrain", symptoms: "Sakit kepala berdenyut (satu sisi), mual, sensitif cahaya/suara, gangguan penglihatan", prevention: "Hindari pemicu (stress, kurang tidur, makanan tertentu), olahraga teratur, tidur cukup", type: "tidak-menular", severity: "ringan" },
    { name: "Alergi", symptoms: "Bersin, hidung gatal/tersumbat, mata berair, ruam kulit, gatal", prevention: "Hindari alergen (debu, serbuk sari, bulu hewan), jaga kebersihan rumah, gunakan antihistamin", type: "tidak-menular", severity: "ringan" },
    { name: "Insomnia", symptoms: "Sulit tidur, sering terbangun malam, bangun terlalu pagi, kelelahan siang hari", prevention: "Atur jadwal tidur teratur, hindari kafein/gadget sebelum tidur, relaksasi, olahraga teratur", type: "tidak-menular", severity: "ringan" },
    { name: "Dispepsia", symptoms: "Perut kembung, nyeri ulu hati, cepat kenyang, sendawa, mual", prevention: "Makan porsi kecil tapi sering, hindari makanan berlemak/pedas, kurangi stres, jangan berbaring setelah makan", type: "tidak-menular", severity: "ringan" },
  ];

  const pandemics = [
    { year: "1347-1351", name: "Black Death", deaths: "75-200 juta", description: "Wabah pes yang menyebar melalui kutu tikus, menghancurkan 30-60% populasi Eropa", link: "https://www.who.int/news-room/fact-sheets/detail/plague" },
    { year: "1918-1920", name: "Flu Spanyol", deaths: "50-100 juta", description: "Pandemi influenza H1N1 yang menyebar secara global setelah Perang Dunia I", link: "https://www.cdc.gov/flu/pandemic-resources/1918-commemoration/1918-pandemic-history.htm" },
    { year: "1957-1958", name: "Flu Asia", deaths: "1-4 juta", description: "Pandemi influenza H2N2 yang berasal dari Singapura", link: "https://www.cdc.gov/flu/pandemic-resources/1957-1958-pandemic.html" },
    { year: "1968-1969", name: "Flu Hong Kong", deaths: "1-4 juta", description: "Pandemi influenza H3N2 yang menjadi strain flu musiman dominan", link: "https://www.cdc.gov/flu/pandemic-resources/1968-pandemic.html" },
    { year: "2002-2004", name: "SARS", deaths: "774", description: "Wabah coronavirus pertama abad 21 dengan tingkat kematian ~10%", link: "https://www.who.int/health-topics/severe-acute-respiratory-syndrome" },
    { year: "2009-2010", name: "Flu Babi", deaths: "150-575 ribu", description: "Pandemi influenza H1N1 yang berasal dari Meksiko", link: "https://www.cdc.gov/flu/pandemic-resources/2009-h1n1-pandemic.html" },
    { year: "2014-2016", name: "Ebola", deaths: "11,325", description: "Wabah Ebola terbesar di Afrika Barat dengan tingkat kematian ~40%", link: "https://www.who.int/emergencies/situations/ebola-outbreak-2014-2016" },
    { year: "2019-Sekarang", name: "COVID-19", deaths: "6.9 juta+", description: "Pandemi coronavirus global dengan dampak kesehatan dan ekonomi besar", link: "https://www.who.int/emergencies/diseases/novel-coronavirus-2019" },
  ];

  const filteredDiseases = diseases.filter(disease => {
    const typeMatch = selectedType === 'semua' || disease.type === selectedType;
    const severityMatch = selectedSeverity === 'semua' || disease.severity === selectedSeverity;
    return typeMatch && severityMatch;
  });

  const severityConfig = {
    ringan: { bg: 'bg-green-50 text-green-700', activeBg: 'bg-green-600 text-white', label: 'Ringan' },
    sedang: { bg: 'bg-yellow-50 text-yellow-700', activeBg: 'bg-yellow-600 text-white', label: 'Sedang' },
    berat: { bg: 'bg-red-50 text-red-700', activeBg: 'bg-red-600 text-white', label: 'Berat' },
  };

  return (
    <Layout>
      {/* Header */}
      <section className="py-10 md:py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-700 mb-3">Informasi Penyakit</h1>
          <p className="text-slate-500 leading-relaxed">
            Informasi tentang berbagai penyakit menular dan tidak menular, gejalanya, dan cara pencegahannya.
          </p>
        </div>
      </section>

      {/* Filter */}
      <section className="bg-slate-50 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-2">Tipe Penyakit</p>
              <div className="flex flex-wrap gap-2">
                {(['semua', 'menular', 'tidak-menular'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedType === type ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-sky-300'
                    }`}
                  >
                    {type === 'semua' ? 'Semua' : type === 'menular' ? 'Menular' : 'Tidak Menular'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-2">Tingkat Keparahan</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSeverity('semua')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedSeverity === 'semua' ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-sky-300'
                  }`}
                >
                  Semua
                </button>
                {(['ringan', 'sedang', 'berat'] as const).map(sev => (
                  <button
                    key={sev}
                    onClick={() => setSelectedSeverity(sev)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedSeverity === sev ? severityConfig[sev].activeBg : severityConfig[sev].bg + ' border border-transparent hover:opacity-80'
                    }`}
                  >
                    {severityConfig[sev].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Menampilkan {filteredDiseases.length} dari {diseases.length} penyakit
          </p>
        </div>
      </section>

      {/* Disease Cards */}
      <section className="py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredDiseases.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDiseases.map((disease, index) => {
                const sev = severityConfig[disease.severity];
                return (
                  <article
                    key={index}
                    className="bg-white p-5 rounded-xl border border-slate-100 hover:border-sky-200 transition-colors cursor-pointer"
                    onClick={() => handleDiseaseClick(disease.name)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {disease.type === 'menular'
                        ? <Bug className="w-5 h-5 text-sky-500 flex-shrink-0" />
                        : <HeartPulse className="w-5 h-5 text-purple-500 flex-shrink-0" />
                      }
                      <h2 className="text-base font-semibold text-slate-700 leading-tight">{disease.name}</h2>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${sev.bg}`}>{sev.label}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${disease.type === 'menular' ? 'bg-sky-50 text-sky-700' : 'bg-purple-50 text-purple-700'}`}>
                        {disease.type === 'menular' ? 'Menular' : 'Tidak Menular'}
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Gejala</p>
                        <p className="text-slate-600 leading-relaxed">{disease.symptoms}</p>
                      </div>
                      {disease.transmission && (
                        <div>
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Cara Penularan</p>
                          <p className="text-slate-600 leading-relaxed flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            {disease.transmission}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Pencegahan</p>
                        <p className="text-slate-600 leading-relaxed">{disease.prevention}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-1">Tidak ada penyakit yang sesuai</h3>
              <p className="text-slate-400 text-sm">Coba ubah filter untuk melihat hasil lainnya</p>
            </div>
          )}
        </div>
      </section>

      {/* Pandemic Timeline */}
      <section className="bg-slate-50 py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-700 text-center mb-3">Sejarah Pandemi Mematikan</h2>
          <p className="text-slate-400 text-center max-w-lg mx-auto mb-10">Deretan pandemi yang pernah melanda dunia sepanjang sejarah</p>

          <div className="space-y-3">
            {pandemics.map((pandemic, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-slate-100 hover:border-sky-200 transition-colors cursor-pointer"
                onClick={() => setExpandedPandemic(expandedPandemic === index ? null : index)}
              >
                <div className="flex items-center gap-4 p-4 sm:p-5">
                  <span className="w-9 h-9 rounded-lg bg-sky-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-700">{pandemic.name}</h3>
                    <p className="text-xs text-slate-400">{pandemic.year}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-medium text-red-600">{pandemic.deaths} kematian</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${expandedPandemic === index ? 'rotate-90' : ''}`} />
                </div>

                {expandedPandemic === index && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 border-t border-slate-100 mt-0">
                    <div className="pt-3">
                      <p className="text-sm text-slate-500 leading-relaxed mb-2">{pandemic.description}</p>
                      <p className="text-sm font-medium text-red-600 mb-3 sm:hidden">Kematian: {pandemic.deaths}</p>
                      <a
                        href={pandemic.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-500 hover:text-sky-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Pelajari Lebih Lanjut <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Help */}
      <section className="py-10 md:py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4 p-5 sm:p-6 rounded-xl border border-sky-100 bg-sky-50">
            <MessageCircle className="w-6 h-6 text-sky-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Memerlukan Informasi Lebih Lanjut?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Jika Anda mencari informasi tentang penyakit lainnya atau ingin mengetahui lebih detail, jangan ragu untuk mengunjungi halaman <a href="/konsultasi" className="text-sky-500 hover:text-sky-600 font-medium underline">Konsultasi</a> untuk bertanya kepada chatbot AI kami.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Penyakit;