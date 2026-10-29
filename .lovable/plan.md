# DecisionOS — Bilgi, Kanıt ve Karar Hafızası

## Mevcut durum

Kararlar, dosyalar, önemli notlar, kanıtlar ve karar sonuçları kalıcı kayıtlara sahip; çalışan bölümler korunacak.

Eksikler: Çıkarılan Dersler tarayıcıda tutuluyor, Karar Hafızası örnek kararları gösteriyor; arama belge içeriğini ve notları kapsamıyor. Karar/ders/belge ilişkileri ortak ve çift yönlü değil. DOCX/XLSX içerik çıkarımı ve kalıcı hata takibi tamamlanmamış.

## Yapılacaklar

### 1. Ortak şirket hafızası
- Çıkarılan Dersler ekranını kalıcı bilgi kayıtlarına bağla; kaynak, açıklama, öneri, gözlenen sonuç, kategori ve etki alanlarıyla oluşturma/düzenleme sağla.
- Eski tarayıcı derslerini silmeden, inceleyerek aktarılabilir yap. Örnek karar bağlantılarını gerçek kararlarla otomatik eşleştirme; kullanıcıdan yeniden seçim iste.
- Karar Hafızası'nı gerçek ve erişim izni olan kararlara bağla; mevcut oluşturma/düzenleme/kanıt/sonuç ekranlarını yeniden kullan.
- Eksik karar tarihi, sorumlu, gerekçe ve beklenen sonuç alanlarını ekle. Gerçek sonuçları mevcut sonuç kayıtlarından göster; onaylanmış karar kilidini koru.

### 2. Dosya ve kanıt yönetimi
- Mevcut dosya ekranına düzenleme, kategori, metadata, yükleyen/sorumlu, kaynak, tarih, işlem durumu ve erişim bilgilerini ekle.
- PDF, DOCX, TXT, CSV ve XLSX için uygun içerik çıkarımı sağla. Diğer dosyaları yalnızca gerçekten desteklenen ölçüde işle; desteklenmeyen dosyayı başarılı sayma.
- Orijinal dosyaları özel depolamada koru; dosya türünü, içeriğini ve boyutunu yükleme ve işleme tarafında doğrula. Mevcut depolama sınırlarını aşma.
- İşleniyor/başarısız/inceleme gerekiyor/tamamlandı durumlarını, hata nedenini ve tekrar denemeleri kalıcı tut; tekrar denemede mükerrer bilgi kaydı oluşturma.
- Özel dosyayı dış AI hizmetine gönderen çıkarım için açık izin iste; metin ve Office çıkarımını mümkün olduğunca dış hizmet kullanmadan yap.

### 3. Çift yönlü ilişkiler
- Karar, ders, dosya/kanıt, not, müşteri, proje, süreç ve adımlar arasında açık ilişkiler oluştur; şirket kökü mevcut çalışma alanı olacak.
- İlgili kayıtları her iki ekranda tıklanabilir göster. Bağlantı kaldırmak asıl dosyayı/kaydı silmesin.
- Mevcut süreç adımlarını silmeden kararlı kimliklerle ilişkilendirilebilir yap; yeni görev veya süreç yürütme sistemi kurma.
- Farklı şirket, erişilemeyen veya bulunmayan uç kayıtlara bağlantıları sunucuda reddet.

### 4. Arama ve denetim
- Ana aramayı kararlar, gerekçeler, toplantılar, AI değerlendirme notları, dosya başlıkları/çıkarılmış içerik, dersler, notlar, müşteriler ve projelere genişlet.
- Sonuçları ilgili kayda aç; yükleniyor/boş/hata durumlarını göster. Şirket değişiminde eski sonuçları temizle.
- Mevcut değiştirilemez defterde karar oluşturma/değiştirme/onay, ders değişiklikleri, dosya yükleme/işleme, erişim değişiklikleri, bağlantılar ve süreç geçişleri için güvenilir olay üret.
- Denetim kayıtlarından belge ve ek referanslarını açılabilir yap; referansı görmek dosyaya erişim yetkisi sağlamasın. Aktör, tarih ve olay ayrıntıları korunsun.

## Güvenlik ve görünüm

Mevcut yönetici/onaylayıcı yazma yetkileri ve izinli istisnalar korunacak; görüntüleyici/denetçi salt okunur kalacak. Yetkiler kayıt işlemleri, arama, bağlantılar ve dosya erişiminde uygulanacak. Şirket sınırları ve gizlilik korunacak. Yeni metinler Türkçe/İngilizce olacak; kullanıcı içeriği çevrilmeyecek.

## Teknik yaklaşım

- `decisions`, `decision_evidence`, `decision_outcomes`, `uploaded_documents`, `knowledge_items`, `company_notes`, `note_attachments`, `processes` ve `audit_events` yeniden kullanılacak; `memory_entries` ayrı amacını koruyacak.
- Derslerin ortak kaynağı mevcut `knowledge_items` ders kayıtları olacak; gereken yapılandırılmış alanlar eklemeli değişikliklerle sağlanacak.
- Tipli, çalışma alanı kapsamlı bağlantılar; uç kayıt varlığı/görünürlüğü/şirket kontrolü uygulanacak. Adım kimlikleri mevcut JSON korunarak eklenecek.
- Arama çağıran kullanıcının kayıt izinleriyle çalışacak; ayrıcalıklı geniş okumadan sonra tarayıcıda filtreleme yapılmayacak.
- Gerekli izinler, erişim kuralları ve olay üretimi birlikte uygulanacak. Kurulum paketleri yeni değişiklikleri içerecek.
- Mevcut şirket kayıtları silinmeyecek; rakip hafıza kaynakları oluşturulmayacak.

## Kabul testleri

1. Belge yükleme, orijinali indirme, içerik arama, işlem durumu ve denetim olayı; hatalı/desteklenmeyen dosya ve tekrar deneme.
2. Elle karar oluşturma/düzenleme, yeniden yüklemede alanların korunması ve onaylı karar kilidi.
3. Ders oluşturma/düzenleme, yenileme ve başka yetkili oturumda aynı kalıcı kaydın görünmesi.
4. Ders–karar–belge ve proje/süreç/adım ilişkilerini iki yönde açma; bağlantı kaldırıldığında asıl kayıtların korunması.
5. Gerçek kayıt/belge içeriğini arama; yetkisiz/gizli ve farklı şirket sonuçlarının görünmemesi.
6. Denetim aktörü/tarihi/değişiklikleri/belge referansı ve geçmişi değiştirme girişiminin reddi.

Kalıcı, açıkça test olarak işaretlenmiş kayıtlar kullanılacak; mevcut şirket verisi değiştirilmeyecek. Çoklu rol/şirket testleri izole ortamda yapılacak; ortam sağlanamazsa doğrulanmayan testler açıkça belirtilecek. Dış AI izni yoksa o çıkarım yolu tamamlandı olarak sunulmayacak.

## Kapsam dışında

Yeni görev/yürütme sistemi, CEO profilinin yeniden kurulması, harici platform bağlantıları ve önceki plandaki diğer aşamalar bu onaya dahil değildir.