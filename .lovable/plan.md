# DecisionOS — Bağlı Proje, Süreç, Adım ve Görev Akışı

## Amaç
Mevcut Projeler ve Süreçler sayfalarını gerçek görev yürütme akışına bağlamak. Kararlar, çıkarılan dersler, belgeler, riskler ve bildirimler aynı kayıtlara bağlı kalacak; ayrı bir görev yönetimi sistemi kurulmayacak.

## 1. Projeler ve süreçler
Mevcut durumda proje oluşturma/dosya ekleme, süreç sahibi, metin adımları ve süreçler arası bağlantılar var; görev yürütme, gerçek ilerleme ve adım tamamlanma kontrolleri henüz yok.

- Proje oluşturma ve düzenleme: hedef, yönetici, katılımcılar, durum, başlangıç/bitiş tarihleri ve fazlar.
- Bir projeye birden fazla süreç bağlama; mevcut süreç bağlantılarını ve dosyaları koruma.
- Süreç oluşturma/düzenleme: açıklama, sorumlu, departman, durum, giriş koşulları, tamamlanma ölçütleri ve onay gereksinimleri.
- Proje ilerlemesini gerçek adım/görev tamamlanmalarından hesaplama; boş proje için yanıltıcı tamamlanma yüzdesi göstermeme.

## 2. Dikey adım ve görev görünümü
- Adımları tek tek ekleme, düzenleme ve sürükleyerek sıralama; mevcut adım kimliklerini ve bağlantılarını koruma.
- Her adımda sorumlu, departman, katılımcılar, tarih, öncelik, durum, tamamlanma ölçütleri, görevler ve bekleyen onaylar.
- Görevlerde zorunlu üst adım, sorumlu kişi, tarih, öncelik ve durum.
- Sıralı veya paralel bağımlılıklar; döngüsel ve farklı şirkete ait bağlantıları reddetme. Görsel sıralama tek başına bağımlılığı değiştirmeyecek.
- Süreci baştan sona gösterme; engelli adımda nedeni ve sıradaki sorumlu kişiyi açıkça belirtme.
- Karar, ders, belge ve riskleri adımlara mevcut çift yönlü bağlantılar üzerinden bağlama.

## 3. Gerçek tamamlanma ve onay kuralları
- Zorunlu görev, önceki bağımlılık, giriş koşulu veya onay eksikse adımı tamamlatmama.
- Onay talepleri ve yetkili kişilerin kararları kalıcı kaydedilecek; stratejik karar onayı yürütme onayı yerine geçmeyecek.
- Adım/görev değişiklikleri ve tamamlanma geçmişi denetlenebilir olacak. Tamamlanmış işin kapsamı değişirse ilgili onaylar geçersizleştirilecek ve sonraki adımlar yeniden değerlendirilecek.
- İstemciden doğrudan durum değiştirme de aynı kurallara tabi olacak; yalnızca düğme gizlemekle yetinilmeyecek.

## 4. Atama, bildirim ve kalite hataları
- Görev atandığında sorumlu kişiye; devir gerektiren adım tamamlandığında sonraki sorumluya mevcut bildirim alanından bildirim.
- Süreç bazında atama, devir, onay talebi, gecikme hatırlatması ve yöneticiye yükseltme kuralları.
- Aynı olay için mükerrer bildirim üretmeme; uygulama içi oluşturulma ve okunma durumlarını gösterme. Harici e-posta/Slack teslimatı, mevcut gerçek bağlantı destekliyorsa ayrıca izlenecek; teslim edilmemiş mesaj gönderilmiş sayılmayacak.
- Kalite kontrolü başarısız olduğunda yapılandırılmış düzeltici görevi oluşturma/etkinleştirme, kalite sorumlusunu haberdar etme ve gerektiğinde sonraki üretim adımını bloke etme.

## Teknik yaklaşım
- Mevcut `projects`, `processes`, `process_links`, `record_links`, `notifications` ve denetim kayıtları temel alınacak.
- Adımların kalıcı görev ilişkileri için normalleştirilmiş kayıtlar eklenecek; mevcut JSON adımlarının kimlikleri korunarak taşınacak. Eski veri silinmeyecek; eski okuma yolları uyumluluk döneminde korunacak ve tek yetkili adım kaynağı kullanılacak.
- Fazlar, proje-süreç ilişkileri, adım/görev atamaları, bağımlılıklar, onaylar ve bildirim kuralları eklemeli veritabanı değişiklikleriyle kurulacak.
- Şirket izolasyonu ve gizli süreç izinleri tüm alt kayıtlara uygulanacak. Admin/approver yazma yetkileri korunacak; viewer/auditor salt okunur kalacak. Atanmış olmak tek başına ek yetki kazandırmayacak.
- Tamamlanma, onay ve devir işlemleri atomik ve sunucuda doğrulanan işlemler olacak; eşzamanlı güncellemeler ve tekrar istekler mükerrer sonuç üretmeyecek.
- Zamanlanmış hatırlatmalar gerçek bir zamanlayıcıyla çalıştırılacak; yalnızca sayfa açıkken işleyen hatırlatma tam otomatik olarak sunulmayacak.
- Yeni arayüz mevcut tasarım, geri gezinme ve Türkçe/İngilizce sözlüklerine uyacak; telefon ve bilgisayarda adımlar okunabilir olacak.

## Kabul testleri
1. Proje → faz → süreç → adımlar → atanan görev oluşturma; yenileme sonrası tüm ilişkilerin korunması.
2. Eksik zorunlu görev, onay ve bağımlılığın tamamlanmayı hem arayüzde hem sunucuda engellemesi.
3. Paralel adımların bağımsız ilerlemesi; sıralı adımın yalnızca ön koşulları sağlanınca açılması; döngülerin reddedilmesi.
4. Onay talebi, yetkili onay, değişiklik sonrası geçersizleşme ve gerçek ilerleme hesaplaması.
5. Atama/devir bildiriminin doğru kişide görünmesi, yeniden yüklemede kalması ve tekrar istekte çoğalmaması.
6. Kalite hatası → düzeltici görev → bildirim → bloke edilen sonraki adım → düzeltme sonrası devam.
7. Adım sıralama sonrası eski karar/ders bağlantılarının iki yönde çalışması.
8. Viewer/auditor yazma reddi, yetkisiz onay reddi, ikinci şirket ve gizli kayıtlara erişim reddi.
9. Türkçe/İngilizce, küçük ekran, mevcut hafıza/belge/bildirim regresyon testleri.

## Teslim sırası ve sınırlar
Önce kalıcı ilişkiler ve yetki/tamamlanma kuralları; ardından proje-süreç arayüzü; sonrasında onay, bildirim, hatırlatma ve kalite senaryosu; en son uçtan uca testler.

Testler ayrılmış TEST kayıtlarıyla yürütülecek. Çoklu şirket/rol testleri için izole hesaplar gerekir; mevcut üretim kullanıcılarının yetkileri değiştirilmeyecek. Harici iletişim sağlayıcısı veya izole kurulum gerektiren doğrulamalar, erişim yoksa açıkça bekleyen iş olarak belirtilecek.