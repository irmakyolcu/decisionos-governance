# DecisionOS — Denetim ve Aşamalı Geliştirme Planı

## Denetim özeti

Mevcut tasarım, şirket verisi, oturumlar ve çalışan adresler korunacak; sıfırdan yeniden yapım yok. Ayrıntılı özellik denetimi, riskler ve kaynak referansları indirilebilir denetim raporunda yer alıyor.

- Canlı yapıda 62 tablo var; hepsinde satır bazlı erişim denetimi açık. Yönetici onaylı davet ve kayıt korumaları mevcut.
- Kendi hesabınızla 20 adres incelendi; 22 mevcut kontrol testi geçti. Bu, tüm yazma akışları veya harici bağlantıların doğrulandığı anlamına gelmez.
- **Doğrulanan hatalar:** `/index` 404; süreç sorumlularında eksik veri ilişkisi; yürütme kayıtlarında olmayan tarih alanıyla sıralama.
- **Kaynakta belirlenen eksikler:** tarayıcı dersleri ile API/rapor dersleri ayrı; CEO profili/geçmişi örnek veri; Intake sonucu kalıcı değil; süreç adımları JSON, proje-süreç yürütmesi ve görevler yok.
- **Simülasyonlar:** katalog bağlantısı ve yürütme/geri alma gerçek sağlayıcı işlemi değil. Sağlık puanlarının bir kısmı sabit.
- **Öncelikli riskler:** ayrıcalıklı rapor/AI/işleme yollarında rol-gizlilik farkları, kanıtsız AI kaynakları, eski kanıtları silen yeniden analiz, onay ve tenant ilişki tutarlılığı.
- Docker kurulum yolu yeni güvenlik/bildirim geçişlerini atlıyor; ilk yönetici hazırlığı ve genel ağ engeli ayrıca doğrulanmalı.

## Onay kapsamı

**Bu onay yalnızca Aşama 1'i uygulatır.** Aşamalar 2–5 sonraki kontrol noktalarıdır. Harici hizmetleri bağlamak, özel veriyi dışarı göndermek veya yıkıcı veri geçişi yapmak bu onayın kapsamında değildir.

## Aşama 1 — Güvenilirlik ve güvenlik

1. `/index` uyumluluğu, süreç sorumlu listesi ve yürütme kayıtlarının sıralamasını düzelt.
2. Gerçek/örnek/simüle/yapılandırılmamış durumları doğru göster; simülasyonun doğrulanmış dış eylem gibi sunulmasını önle.
3. Rapor, AI, belge işleme ve API yollarında sunucu rol/gizlilik kontrolünü tutarlılaştır; onay haklarını ve aynı şirket ilişkilerini doğrula.
4. İnsan kanıtını koruyan sürümlü analiz; kaynaksız öngörüleri gerçek kanıt/sonuçtan ayır; doğrulanmış kaynak işaretini modele bırakma.
5. Şirket değişiminde eski ekran verisini temizle; hata, yükleniyor ve boş durumlarını doğru göster.
6. Kurulumun uyguladığı geçişleri envanterle; ilk yönetici ve yeni güvenlik kurallarının kurulum eşitliği için güvenli düzeltmeleri belirle.

**Kabul koşulları:** üç sayfa hatası yeniden oluşmuyor; viewer/auditor yetkisiz yazma ve gizli rapor okuma testleri başarısız oluyor; yönetici/onaylayıcı izinli akışları çalışıyor; insan kanıtı yeniden analizde korunuyor; simülasyon gerçek sonuç sayılmıyor. Test verisi izole ortamda kullanılacak; geçerli şirket kayıtları silinmeyecek.

## Sonraki aşamalar — ayrı onay

### 2. Ortak şirket hafızası
Tarayıcı derslerini yedekleyip kontrollü aktar; ders ekranı/API/raporu aynı kalıcı kaynağa bağla. Mevcut twin/karar kayıtlarından CEO bağlamı oluştur; Intake talebi ve önerisini kaydet. Belge/not/ders/karar aramasını ve alıntı doğrulamasını birleştir.

### 3. Proje → Süreç → Adım → Görev
Tekrar kullanılabilir, sürümlü süreçleri projelere ata; adım/görev, sahip, termin, sıralı/paralel bağımlılık ve çoktan-çoğa karar/ders/kanıt bağlantılarını ekle.

### 4. Yönetilen iş akışı
Atomik ve tekrar çağrı korumalı geçişler; görev atama/gecikme/bloke akış bildirimleri; yükseltme, insan onayı ve her geçişte denetim. Karar onayı yürütme onayı yerine geçmez.

### 5. Yönetici zekası ve gerçek bağlantılar
Gerçek veri KPI'ları ve kaynaklı PDF raporları; yapılandırılmış e-posta teslimi ve zamanlayıcı; gerçek sağlayıcı adaptörleri/teslim kanıtları; izinli şirket becerisi test ve çalıştırma.

## Teknik ilişki tasarımı

- Şirket kökü `workspaces`; mevcut `projects`, `clients`, `processes`, `process_links` ve belge ilişkileri korunur.
- Önerilen ekler: `project_processes` (sürüme sabitlenmiş yürütme), `process_steps`, `process_step_runs`, `tasks` ve döngü kontrollü bağımlılıklar.
- Dersler için mevcut `knowledge_items` lesson kayıtları ortak kaynak; `memory_entries` ayrı amacı korunur. Yerel içerik kullanıcıya gösterilen aktarım ile korunur.
- Karar/ders/kanıt/risk ile süreç/adım arasında tipli bağ tabloları; aynı şirkete ait üst-alt ilişkiler ve üye sorumlular.
- `action_proposals`, `action_approvals`, `execution_records`, `notifications`, `audit_events` yeniden kullanılır. Görevler dış eylem onaylarıyla birleştirilmez.
- Yeni ilişkiler eklemeli geçişlerle kurulur; mevcut JSON silinmez. Yedek → aktarım → karşılaştırma → tek yazma kaynağı sırası uygulanır.
- Her yeni tablo için erişim izinleri ve şirket/gizlilik kuralları; ayrıcalıklı işlevlerde açık rol kontrolü. Level 2/3 ve bütçe-yükseltme kuralları sunucuda korunur.

## Hizmet ve veri riskleri

İç ilişkiler, görevler, bildirimler, onaylar, denetim ve PDF için yeni dış hizmet gerekmez. Mevcut AI erişimi kullanılabilir; özel verinin dış AI'ya gönderimi ayrıca yetkilendirilir.

Gmail/Slack/Calendar/Teams gerçek kullanıcı bağlantısı; harici API'ler gerektiğinde kimlik bilgisi; mesaj gönderimi yazma kapsamı; e-posta teslimi doğrulanmış gönderici; güncel ekonomik bilgi güvenilir kaynak gerektirir. Canlı sağlayıcı sağlığı ve Docker uçtan uca kurulumu henüz doğrulanmadı.

Eski kurulum SQL'inde kayıt silebilen temizlik var: yedek ve etki envanteri olmadan çalıştırılmayacak. Mevcut dersler, karar kanıtı, dosyalar, ekip üyelikleri ve davetler korunacak. Önceden açık demo/pilot teslim görevi onaylı alıcı/takvim beklemeye devam ediyor.
