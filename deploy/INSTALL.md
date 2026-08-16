# DecisionOS — On-Premise (Air-Gapped) Kurulum Kılavuzu

Bu paket DecisionOS'u internet bağlantısı olmayan bir kurumsal ağda,
tamamen müşterinin donanımında çalıştırır. Hiçbir veri şirket dışına çıkmaz:
veritabanı, dosya depolama, kimlik doğrulama ve dil modeli aynı sunucuda yaşar.

---

## 1. Donanım gereksinimleri

| Bileşen | Minimum | Önerilen |
| --- | --- | --- |
| CPU | 8 vCPU | 16 vCPU |
| RAM | 32 GB | 64 GB |
| Disk | 200 GB SSD | 500 GB NVMe |
| GPU | yok (CPU çıkarımı yavaş) | 1× NVIDIA A10 / L4 / RTX 4090 (24 GB) |
| OS | Ubuntu 22.04 / RHEL 9 | aynı |
| Yazılım | Docker Engine 24+, Docker Compose v2 | aynı |

GPU'suz kurulumda `AI_CHAT_MODEL` olarak daha küçük bir model seçin
(örn. `qwen2.5:7b-instruct`).

---

## 2. Bağlantılı makinede paket hazırlama

İnternete çıkabilen bir makinede, bu repoyu klonlayıp:

```bash
cd deploy
./scripts/offline-bundle.sh 1.0.0
```

Çıktı: `decisionos-offline-1.0.0.tar.gz` — tüm container imajları,
yerel LLM ağırlıkları, migration dosyaları ve kurulum scriptleri içinde.
Bu dosyayı USB/ onaylı transfer kanalıyla müşteri sunucusuna taşıyın.

---

## 3. Müşteri sunucusunda kurulum

```bash
tar xzf decisionos-offline-1.0.0.tar.gz
cd decisionos-offline-1.0.0
./scripts/install.sh
```

`install.sh` sırasıyla şunları yapar:

1. Container imajlarını `docker load` ile yükler
2. `scripts/generate-keys.sh` ile tüm gizli anahtarları üretir ve `.env` yazar
3. Yerel LLM ağırlıklarını `volumes/ollama` içine kopyalar
4. Stack'i ayağa kaldırır (`docker compose up -d`)
5. Tüm veritabanı migration'larını (bu sürümde 38 adet) sırayla ve idempotent uygular
6. Lisans durumunu kontrol eder

Kurulum bittiğinde uygulama `http://<sunucu-ip>:8080` adresinde çalışır.

### İlk yönetici kullanıcı

```bash
./scripts/create-admin.sh ceo@acme.local 'CokGucluParola!'
```

Giriş yaptıktan sonra ilk workspace onboarding ekranından oluşturulur.

---

## 4. Kuruluma özel ayarlar

`deploy/.env` içinde düzenlenmesi gerekenler:

| Değişken | Anlamı |
| --- | --- |
| `SITE_URL`, `API_EXTERNAL_URL` | Kurum içi hostname / reverse proxy adresi |
| `SMTP_HOST` | Kurum içi mail relay (boş bırakılırsa e-posta kapalı) |
| `DISABLE_SIGNUP` | `true` — kullanıcılar sadece davetle eklenir |
| `AI_CHAT_MODEL` | Yerel modelin adı |
| `ALLOW_OUTBOUND_INTERNET` | `false` — Gmail/Slack/Teams konnektörleri ve dış veri kaynakları kapanır |
| `AI_ALLOW_EXTERNAL` | `false` — AI çağrısı yerel ağ dışına giderse hata verir |
| `AI_ENABLED` | `false` yapılırsa tüm AI modülleri kapatılır |

Değişiklikten sonra: `docker compose --env-file ./.env up -d`

---

## 5. TLS

TLS'i kurumun mevcut yük dengeleyicisinde sonlandırın ve
`http://<host>:8080` (uygulama) ile `http://<host>:8000` (API) portlarına
yönlendirin. Alternatif olarak `deploy/nginx.conf` içine sertifika ekleyip
443'ü doğrudan açabilirsiniz.

---

## 6. Yedekleme

```bash
# Veritabanı
docker compose exec -T db pg_dump -U postgres postgres | gzip > backup-$(date +%F).sql.gz
# Dosyalar
tar czf storage-$(date +%F).tar.gz volumes/storage
```

Geri yükleme: stack'i durdurun, `volumes/db/data` klasörünü boşaltın,
stack'i başlatın ve dump'ı `psql` ile geri yükleyin.

---

## 7. Güncelleme

Yeni sürüm paketini açın ve:

```bash
docker load < images/decisionos-images.tar.gz
docker compose --env-file ./.env up -d
./scripts/migrate.sh   # yalnızca yeni migration'lar uygulanır
```

Veri kaybı olmaz; `schema_migrations` tablosu uygulanmışları atlar.

---

## 8. Sorun giderme

| Belirti | Kontrol |
| --- | --- |
| Uygulama açılıyor ama veri gelmiyor | `docker compose logs rest kong` — `ANON_KEY` ile `JWT_SECRET` uyumsuz olabilir, `generate-keys.sh`'yi tekrar çalıştırın ve app imajını yeniden build edin |
| AI cevabı gelmiyor | `docker compose logs functions ollama`; model indirilmiş mi: `docker compose exec ollama ollama list` |
| Giriş yapılamıyor | `docker compose logs auth`; `SITE_URL` ve `API_EXTERNAL_URL` doğru mu |
| Lisans uyarısı | `./scripts/license-activate.sh --status` |

Lisanslama için `LICENSING.md` dosyasına bakın.
