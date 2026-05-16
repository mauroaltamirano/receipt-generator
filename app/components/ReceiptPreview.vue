<script setup lang="ts">
import type { Product, PaymentMethod } from '~/composables/useReceiptStorage'

const props = defineProps<{
  storeName: string
  storeAddress: string
  vatId: string
  receiptNumber: string
  date: string
  time: string
  products: Product[]
  taxRate: number
  paymentMethod: PaymentMethod
  cashGiven: number
  background: string
}>()

const subtotal = computed(() =>
  props.products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0),
)
const taxAmount = computed(() => subtotal.value * props.taxRate / 100)
const total = computed(() => subtotal.value + taxAmount.value)
const change = computed(() => Math.max(0, props.cashGiven - total.value))
const showChange = computed(() => props.paymentMethod === 'CONTANTI' && props.cashGiven > 0)

const operatorNum = computed(() => {
  const seed = parseInt(props.receiptNumber || '1') % 9 + 1
  return String(seed).padStart(3, '0')
})

const cashierNum = computed(() => {
  const seed = parseInt(props.receiptNumber || '1') % 4 + 1
  return String(seed).padStart(2, '0')
})

function fmt(n: number): string {
  return n.toFixed(2).replace('.', ',') + ' €'
}

function fmtDate(d: string): string {
  if (!d) return '--/--/----'
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return d
  }
}

const BACKGROUNDS: Record<string, string> = {
  plain:  'background:#e8e8e5; padding:40px 28px;',
  wood:   'background:#8B5E2D; background-image:repeating-linear-gradient(90deg,rgba(0,0,0,0.07) 0,rgba(0,0,0,0) 3px,rgba(255,255,255,0.04) 5px,rgba(0,0,0,0.05) 8px),repeating-linear-gradient(175deg,rgba(255,200,100,0.15) 0,rgba(0,0,0,0.1) 60px); padding:40px 28px;',
  marble: 'background:#f4f2ef; background-image:linear-gradient(135deg,rgba(180,175,170,0.3) 0,transparent 40%,rgba(160,155,150,0.2) 60%,transparent 100%),repeating-linear-gradient(80deg,rgba(140,130,120,0.06) 0,rgba(140,130,120,0) 8px); padding:40px 28px;',
  dark:   'background:#1e1e1e; padding:40px 28px;',
  kraft:  'background:#b8945a; background-image:repeating-linear-gradient(45deg,rgba(0,0,0,0.05) 0,rgba(0,0,0,0) 3px,rgba(255,255,255,0.04) 5px); padding:40px 28px;',
}

const bgStyle = computed(() => BACKGROUNDS[props.background] ?? BACKGROUNDS['plain']!)

// Barcode: generate bars from receipt number
const barcodeSegments = computed(() => {
  const seed = (props.receiptNumber || '123456').padEnd(12, '0')
  const bars: { width: number; dark: boolean }[] = []
  bars.push({ width: 2, dark: true }, { width: 2, dark: false })
  for (let i = 0; i < seed.length; i++) {
    const d = parseInt(seed[i]!) || 0
    bars.push({ width: 1 + (d % 3), dark: true })
    bars.push({ width: 1 + ((d + 3) % 4), dark: false })
  }
  bars.push({ width: 2, dark: true }, { width: 1, dark: false }, { width: 2, dark: true })
  return bars
})

// ── Paper noise / aging effects ──────────────────────────────────────────────
// Consistent per-receipt values seeded from the receipt number.
function sr(seed: number, n: number): number {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453
  return x - Math.floor(x)
}

const noiseSeed = computed(() => {
  const n = parseInt((props.receiptNumber || '').replace(/\D/g, '') || '0')
  return n || 42
})

// Slight tilt: -1.6° … +1.6°
const rotation = computed(() => (sr(noiseSeed.value, 0) * 3.2 - 1.6).toFixed(2))

// Paper tint: slight yellowish aging
const paperBg = computed(() => {
  const y = Math.floor(sr(noiseSeed.value, 9) * 10)
  return `rgb(255,${254 - y},${249 - y * 2})`
})

// Fold 1 – always present
const fold1Y  = computed(() => (sr(noiseSeed.value, 1) * 32 + 20).toFixed(1))   // 20–52 %
const fold1Op = computed(() => (sr(noiseSeed.value, 2) * 0.25 + 0.12).toFixed(2)) // 0.12–0.37

// Fold 2 – appears ~60 % of the time
const fold2Y    = computed(() => (sr(noiseSeed.value, 3) * 20 + 62).toFixed(1))  // 62–82 %
const fold2Op   = computed(() => (sr(noiseSeed.value, 6) * 0.18 + 0.08).toFixed(2))
const showFold2 = computed(() => sr(noiseSeed.value, 4) > 0.40)

// Shadow side: which corners cast a slightly longer shadow (paper not flat)
const shadowBias = computed(() => {
  const rot = parseFloat(rotation.value)
  const x = rot * 1.5
  const y = sr(noiseSeed.value, 7) * 6 + 2
  return `${x.toFixed(1)}px ${y.toFixed(1)}px 22px rgba(0,0,0,0.28), 0 1px 4px rgba(0,0,0,0.14)`
})
</script>

<template>
  <div :style="bgStyle">
    <!-- Receipt paper -->
    <div
      :style="{
        fontFamily: '\'Courier New\', Courier, monospace',
        background: paperBg,
        color: '#1a1a1a',
        width: '340px',
        boxSizing: 'border-box',
        lineHeight: '1.5',
        boxShadow: shadowBias,
        position: 'relative',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center top',
        overflow: 'hidden',
      }"
    >
      <!-- Top tear edge -->
      <div
        style="
          height: 10px;
          background: repeating-linear-gradient(
            90deg,
            transparent 0, transparent 6px,
            #e0ddd6 6px, #e0ddd6 10px
          );
          border-bottom: 1px dashed #bbb;
        "
      />

      <div style="padding: 16px 20px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 12px;">
          <div style="font-size: 9px; letter-spacing: 2px; color: #666; margin-bottom: 6px;">
            ★ DOCUMENTO COMMERCIALE ★
          </div>
          <div
            style="
              font-size: 17px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 2px;
              line-height: 1.3;
              word-break: break-word;
            "
          >
            {{ storeName || 'NOME NEGOZIO' }}
          </div>
          <div style="font-size: 10px; color: #555; margin-top: 3px; line-height: 1.4;">
            {{ storeAddress || 'Via Esempio, 1 - 00100 Roma RM' }}
          </div>
          <div style="font-size: 10px; color: #555; margin-top: 2px;">
            P.IVA: {{ vatId || 'IT00000000000' }}
          </div>
        </div>

        <div style="border-top: 1px dashed #999; margin: 0 0 10px;" />

        <!-- Receipt meta -->
        <div style="font-size: 10px; margin-bottom: 10px; color: #333;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span>N. DOCUMENTO</span>
            <span style="font-weight:700;">{{ receiptNumber || '------' }}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span>DATA</span>
            <span>{{ fmtDate(date) }}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span>ORA</span>
            <span>{{ time || '--:--' }}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>CASSA {{ cashierNum }} / OP. {{ operatorNum }}</span>
            <span />
          </div>
        </div>

        <div style="border-top: 1px dashed #999; margin: 0 0 8px;" />

        <!-- Products table -->
        <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:4px;">
          <thead>
            <tr style="color:#555; border-bottom:1px solid #ddd;">
              <th style="text-align:left; padding-bottom:4px; font-weight:700; font-size:9px;">DESCRIZIONE</th>
              <th style="text-align:center; padding-bottom:4px; font-weight:700; font-size:9px; width:30px;">Q.</th>
              <th style="text-align:right; padding-bottom:4px; font-weight:700; font-size:9px; width:54px;">P.UNIT.</th>
              <th style="text-align:right; padding-bottom:4px; font-weight:700; font-size:9px; width:54px;">TOT.</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="product in products"
              :key="product.id"
            >
              <td style="padding:2px 4px 2px 0; word-break:break-word; max-width:130px; font-size:10px; line-height:1.3;">
                {{ product.name || '—' }}
              </td>
              <td style="text-align:center; padding:2px 2px; white-space:nowrap; font-size:10px;">
                {{ product.quantity }}
              </td>
              <td style="text-align:right; padding:2px 2px; white-space:nowrap; font-size:10px;">
                {{ (product.unitPrice).toFixed(2).replace('.', ',') }}
              </td>
              <td style="text-align:right; padding:2px 0; white-space:nowrap; font-size:10px; font-weight:600;">
                {{ (product.quantity * product.unitPrice).toFixed(2).replace('.', ',') }}
              </td>
            </tr>
            <tr v-if="products.length === 0">
              <td colspan="4" style="text-align:center; color:#aaa; padding:8px 0; font-style:italic; font-size:10px;">
                Nessun prodotto
              </td>
            </tr>
          </tbody>
        </table>

        <div style="border-top: 1px dashed #999; margin: 6px 0;" />

        <!-- Totals -->
        <div style="font-size:10px; color:#333;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span>SUBTOTALE</span>
            <span>{{ fmt(subtotal) }}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span>IVA {{ taxRate }}%</span>
            <span>{{ fmt(taxAmount) }}</span>
          </div>
        </div>

        <div
          style="
            border-top: 2px solid #1a1a1a;
            border-bottom: 2px solid #1a1a1a;
            margin: 4px 0 8px;
            padding: 5px 0;
            display:flex;
            justify-content:space-between;
            font-weight:700;
            font-size:16px;
          "
        >
          <span>TOTALE EUR</span>
          <span>{{ fmt(total) }}</span>
        </div>

        <!-- Payment section -->
        <div style="font-size:10px; color:#333; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span style="font-weight:700;">{{ paymentMethod }}</span>
            <span>{{ showChange ? fmt(cashGiven) : fmt(total) }}</span>
          </div>
          <div v-if="showChange" style="display:flex; justify-content:space-between;">
            <span>RESTO</span>
            <span>{{ fmt(change) }}</span>
          </div>
        </div>

        <div style="border-top: 1px dashed #999; margin: 0 0 10px;" />

        <!-- Footer text -->
        <div style="text-align:center; font-size:9px; color:#666; line-height:2; margin-bottom:10px;">
          <div style="letter-spacing:1px;">GRAZIE PER LA VISITA!</div>
          <div>Arrivederci e a presto</div>
          <div style="font-size:8px; color:#aaa; margin-top:2px;">Documento non fiscale</div>
        </div>

        <!-- Barcode -->
        <div style="display:flex; justify-content:center; margin-bottom:6px;">
          <div style="display:flex; align-items:stretch; height:36px; gap:0;">
            <div
              v-for="(bar, i) in barcodeSegments"
              :key="i"
              :style="{
                width: bar.width + 'px',
                background: bar.dark ? '#1a1a1a' : paperBg,
                flexShrink: '0',
              }"
            />
          </div>
        </div>
        <div style="text-align:center; font-size:8px; color:#888; letter-spacing:3px;">
          {{ receiptNumber ? receiptNumber.padStart(13, '0') : '0000000000000' }}
        </div>
      </div>

      <!-- Bottom tear edge -->
      <div
        style="
          height: 10px;
          background: repeating-linear-gradient(
            90deg,
            transparent 0, transparent 6px,
            #e0ddd6 6px, #e0ddd6 10px
          );
          border-top: 1px dashed #bbb;
        "
      />

      <!-- ── Noise / aging overlays (pointer-events:none, on top of content) ── -->

      <!-- Fine paper grain -->
      <div
        style="
          position:absolute; inset:0; pointer-events:none;
          background-image: radial-gradient(rgba(0,0,0,0.028) 1px, transparent 1px);
          background-size: 3px 3px;
        "
      />

      <!-- Edge vignette – simulates darkening toward the edges from handling -->
      <div
        style="
          position:absolute; inset:0; pointer-events:none;
          background:
            linear-gradient(to right,  rgba(0,0,0,0.04) 0%, transparent 8%, transparent 92%, rgba(0,0,0,0.05) 100%),
            linear-gradient(to bottom, rgba(0,0,0,0.03) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.06) 100%);
        "
      />

      <!-- Fold crease 1 -->
      <div
        :style="{
          position: 'absolute',
          left: '0',
          right: '0',
          top: fold1Y + '%',
          pointerEvents: 'none',
        }"
      >
        <!-- shadow above the crease -->
        <div
          :style="{
            height: '12px',
            marginTop: '-12px',
            background: `linear-gradient(to top, rgba(0,0,0,${fold1Op}), transparent)`,
          }"
        />
        <!-- bright crease line (peak of the fold reflects light) -->
        <div
          style="
            height: 1px;
            background: linear-gradient(90deg, transparent 3%, rgba(255,255,255,0.9) 18%, rgba(255,255,255,0.75) 82%, transparent 97%);
          "
        />
        <!-- shadow below the crease -->
        <div
          :style="{
            height: '10px',
            background: `linear-gradient(to bottom, rgba(0,0,0,${fold1Op}), transparent)`,
          }"
        />
      </div>

      <!-- Fold crease 2 (occasional) -->
      <div
        v-if="showFold2"
        :style="{
          position: 'absolute',
          left: '0',
          right: '0',
          top: fold2Y + '%',
          pointerEvents: 'none',
        }"
      >
        <div
          :style="{
            height: '8px',
            marginTop: '-8px',
            background: `linear-gradient(to top, rgba(0,0,0,${fold2Op}), transparent)`,
          }"
        />
        <div
          style="
            height: 1px;
            background: linear-gradient(90deg, transparent 8%, rgba(255,255,255,0.7) 28%, rgba(255,255,255,0.55) 72%, transparent 92%);
          "
        />
        <div
          :style="{
            height: '7px',
            background: `linear-gradient(to bottom, rgba(0,0,0,${fold2Op}), transparent)`,
          }"
        />
      </div>
    </div>
  </div>
</template>
