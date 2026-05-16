<script setup lang="ts">
import type { Product } from '~/composables/useReceiptStorage'

const props = defineProps<{
  storeName: string
  vatId: string
  receiptNumber: string
  date: string
  products: Product[]
  taxRate: number
}>()

const subtotal = computed(() =>
  props.products.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0),
)
const taxAmount = computed(() => subtotal.value * props.taxRate / 100)
const total = computed(() => subtotal.value + taxAmount.value)

function fmt(n: number): string {
  return `€${n.toFixed(2)}`
}

function fmtDate(d: string): string {
  if (!d) return '—'
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
</script>

<template>
  <div
    style="
      font-family: 'Courier New', Courier, monospace;
      background: #ffffff;
      color: #1a1a1a;
      width: 380px;
      padding: 28px 24px;
      box-sizing: border-box;
      line-height: 1.4;
    "
  >
    <!-- Store header -->
    <div style="text-align: center; margin-bottom: 18px;">
      <div
        style="
          font-size: 20px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 3px;
          line-height: 1.3;
          word-break: break-word;
        "
      >
        {{ storeName || 'NOME NEGOZIO' }}
      </div>
      <div style="font-size: 12px; margin-top: 6px; color: #444;">
        P.IVA: {{ vatId || '———————————' }}
      </div>
    </div>

    <div style="border-top: 1px dashed #666; margin: 0 0 14px;" />

    <!-- Receipt meta -->
    <div style="font-size: 12px; margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>Scontrino n.</span>
        <span style="font-weight: 700;">{{ receiptNumber || '------' }}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Data</span>
        <span>{{ fmtDate(date) }}</span>
      </div>
    </div>

    <div style="border-top: 1px dashed #666; margin: 0 0 10px;" />

    <!-- Products table -->
    <table
      style="
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        margin-bottom: 2px;
      "
    >
      <thead>
        <tr style="color: #555;">
          <th style="text-align: left; padding-bottom: 6px; font-weight: 700;">DESCRIZIONE</th>
          <th style="text-align: right; padding-bottom: 6px; padding-right: 6px; font-weight: 700;">QTÀ</th>
          <th style="text-align: right; padding-bottom: 6px; padding-right: 6px; font-weight: 700;">P.UNIT.</th>
          <th style="text-align: right; padding-bottom: 6px; font-weight: 700;">TOTALE</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="product in products"
          :key="product.id"
          style="font-size: 12px;"
        >
          <td style="padding-bottom: 4px; padding-right: 4px; word-break: break-word; max-width: 160px;">
            {{ product.name || '—' }}
          </td>
          <td style="text-align: right; padding-bottom: 4px; padding-right: 6px; white-space: nowrap;">
            {{ product.quantity }}x
          </td>
          <td style="text-align: right; padding-bottom: 4px; padding-right: 6px; white-space: nowrap;">
            {{ fmt(product.unitPrice) }}
          </td>
          <td style="text-align: right; padding-bottom: 4px; white-space: nowrap;">
            {{ fmt(product.quantity * product.unitPrice) }}
          </td>
        </tr>
        <tr v-if="products.length === 0">
          <td
            colspan="4"
            style="
              text-align: center;
              color: #999;
              padding: 10px 0;
              font-style: italic;
              font-size: 12px;
            "
          >
            Nessun prodotto
          </td>
        </tr>
      </tbody>
    </table>

    <div style="border-top: 1px dashed #666; margin: 10px 0;" />

    <!-- Totals -->
    <div style="font-size: 12px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>Subtotale</span>
        <span>{{ fmt(subtotal) }}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>IVA {{ taxRate }}%</span>
        <span>{{ fmt(taxAmount) }}</span>
      </div>
    </div>

    <div
      style="
        border-top: 2px solid #1a1a1a;
        margin: 10px 0 0;
        padding-top: 8px;
        display: flex;
        justify-content: space-between;
        font-weight: 700;
        font-size: 18px;
      "
    >
      <span>TOTALE</span>
      <span>{{ fmt(total) }}</span>
    </div>

    <div style="border-top: 1px dashed #666; margin: 18px 0 14px;" />

    <!-- Footer -->
    <div style="text-align: center; font-size: 11px; color: #666; line-height: 1.8;">
      <div>Grazie per la visita!</div>
      <div style="font-size: 10px;">Documento non fiscale</div>
    </div>
  </div>
</template>
