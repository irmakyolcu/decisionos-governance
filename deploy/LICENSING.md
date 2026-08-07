# DecisionOS — Offline Lisans Aktivasyonu

Air-gapped kurulumlar internete çıkamadığı için lisans doğrulaması
**phone-home yapmadan**, kriptografik imza ile yerelde yapılır.

```text
  Satıcı (siz)                         Müşteri (air-gapped)
  ─────────────                        ─────────────────────
  Ed25519 özel anahtar                 generate-keys.sh
        │                                    │
        │                          DEPLOYMENT_ID üretilir
        │  ◄──── deployment id ──────────────┘
        │
  license-issue.sh
        │
        └──── imzalı lisans anahtarı ───►  license-activate.sh
                                                  │
                                          license-status fonksiyonu
                                          imzayı public key ile doğrular
```

---

## Bir kez: imza anahtar çifti (yalnızca satıcı)

```bash
cd deploy
./scripts/license-keygen.sh
```

- `license-signing-private.pem` — **asla dağıtılmaz**, kasada durur.
- Çıktıdaki public key her müşterinin `.env` dosyasına
  `DECISIONOS_LICENSE_PUBLIC_KEY` olarak yazılır.

---

## Her müşteri için: lisans üretimi

Müşteri kurulumda size `DEPLOYMENT_ID` gönderir. Siz:

```bash
./scripts/license-issue.sh \
  --customer "Acme A.S." \
  --deployment 3f9c1e... \
  --seats 250 \
  --expires 2027-12-31 \
  --features core,ai,api,connectors
```

Çıkan tek satırlık anahtarı müşteriye iletirsiniz.

### Özellik bayrakları

| Bayrak | Açtığı yetenek |
| --- | --- |
| `core` | Kararlar, toplantılar, onay akışları, audit ledger |
| `ai` | Risk analizi, Ask DecisionOS, özetleme, Decision Twin |
| `api` | REST API anahtarları ve dış veri kaynakları |
| `connectors` | Gmail / Slack / Teams / Takvim entegrasyonları |
| `compliance` | Uyum raporları ve anomali tespiti |

---

## Müşteri tarafında aktivasyon

```bash
./scripts/license-activate.sh <lisans-anahtari>
./scripts/license-activate.sh --status
```

Anahtar `.env` içine yazılır ve `functions` servisi yeniden başlatılır.
Uygulama içinde durum üst bantta görünür.

---

## Doğrulama kuralları

- **İmza**: Ed25519, WebCrypto ile yerelde doğrulanır. Ağ erişimi gerekmez.
- **Cihaz bağı**: `deployment_id` eşleşmezse anahtar reddedilir; bir müşterinin
  anahtarı başka kuruluma kopyalanamaz.
- **Süre**: Bitiş tarihinden sonra **14 gün ek süre** verilir; bu sürede
  uygulama çalışır ama kırmızı uyarı gösterir. Sonrasında lisanslı özellikler
  `402 license_invalid` döner, veriler her zaman okunabilir kalır.
- **Fail-safe**: `DECISIONOS_LICENSE_PUBLIC_KEY` boşsa (Lovable Cloud kurulumu)
  lisans katmanı devre dışıdır ve hiçbir şeyi engellemez.

---

## Kod tarafında kullanım

Lisansa bağlı bir edge function'ın başına:

```ts
import { requireFeature } from '../_shared/license.ts';

const blocked = await requireFeature('ai');
if (blocked) return blocked;
```

Arayüzde:

```tsx
const { hasFeature } = useLicense();
if (!hasFeature('connectors')) return <UpgradeNotice />;
```
