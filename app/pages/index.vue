<script setup lang="ts">
import type { Product } from '~/composables/useReceiptStorage'

useHead({ title: 'Receipt Generator' })

const { load, save, clear, newProduct, defaultData } = useReceiptStorage()
const {
  randomStore,
  randomProductName,
  randomReceiptNumber,
  randomDateFull,
  randomDateInRange,
  randomTime,
  randomInt,
  randomFloat,
} = useRandom()
const toast = useToast()

const BACKGROUNDS = [
  { value: 'plain',  label: 'Piano bianco' },
  { value: 'wood',   label: 'Legno' },
  { value: 'marble', label: 'Marmo' },
  { value: 'dark',   label: 'Piano scuro' },
  { value: 'kraft',  label: 'Carta kraft' },
]

const PAYMENT_METHODS = ['CONTANTI', 'BANCOMAT', 'CARTA DI CREDITO'] as const

// ---- State ----
const form = ref(defaultData())
const downloading = ref(false)
const generating  = ref(false)
const batchCount  = ref(1)
const batchProgress = ref(0)

// ---- Refs ----
const captureRef = ref<HTMLElement | null>(null)
const batchRef   = ref<HTMLElement | null>(null)
// Drives the hidden off-screen renderer during batch generation
const batchData  = ref(defaultData())

// ---- Lifecycle ----
onMounted(() => {
  form.value = load()
  batchData.value = { ...form.value, randomize: { ...form.value.randomize } }
})

watch(form, (v) => save(v), { deep: true })

// ---- Computed ----
const subtotal  = computed(() => form.value.products.reduce((s, p) => s + p.quantity * p.unitPrice, 0))
const taxAmount = computed(() => subtotal.value * form.value.taxRate / 100)
const total     = computed(() => subtotal.value + taxAmount.value)

function fmt(n: number) { return `€${n.toFixed(2)}` }

// ---- Randomize handlers ----
// When a checkbox is toggled ON, immediately apply a sample value so the
// live preview updates. At generate time a FRESH value is always picked.

function applyRandomStore() {
  const s = randomStore()
  form.value.storeName    = s.name
  form.value.storeAddress = s.address
  form.value.vatId        = s.vatId
}

function applyRandomDate() {
  const r = form.value.randomize
  form.value.date = r.dateMode === 'range' && r.dateFrom && r.dateTo
    ? randomDateInRange(r.dateFrom, r.dateTo)
    : randomDateFull()
}

function onRandomStore(val: boolean)         { if (val) applyRandomStore() }
function onRandomReceiptNumber(val: boolean) { if (val) form.value.receiptNumber = randomReceiptNumber() }
function onRandomDate(val: boolean)          { if (val) applyRandomDate() }
function onRandomTime(val: boolean)          { if (val) form.value.time = randomTime() }
function onDateModeChange()                  { if (form.value.randomize.date) applyRandomDate() }

// ---- Products ----
function addProduct() { form.value.products.push(newProduct()) }

function addRandomProduct() {
  form.value.products.push({
    id: crypto.randomUUID(),
    name: randomProductName(),
    quantity: randomInt(1, 5),
    unitPrice: randomFloat(0.5, 30),
  })
}

function removeProduct(id: string) {
  form.value.products = form.value.products.filter((p) => p.id !== id)
  if (form.value.products.length === 0) addProduct()
}

function randomizeProductName(p: Product)  { p.name      = randomProductName() }
function randomizeProductQty(p: Product)   { p.quantity  = randomInt(1, 10) }
function randomizeProductPrice(p: Product) { p.unitPrice = randomFloat(0.5, 50) }

// ---- Reset ----
function doReset() {
  clear()
  form.value = defaultData()
}

// ---- Build one receipt's data (with randomization applied) ----
function buildReceiptData() {
  const r    = form.value.randomize
  const base = { ...form.value, products: form.value.products.map((p) => ({ ...p })) }

  if (r.store) {
    const s = randomStore()
    base.storeName    = s.name
    base.storeAddress = s.address
    base.vatId        = s.vatId
  }
  if (r.receiptNumber) base.receiptNumber = randomReceiptNumber()
  if (r.date) {
    base.date = r.dateMode === 'range' && r.dateFrom && r.dateTo
      ? randomDateInRange(r.dateFrom, r.dateTo)
      : randomDateFull()
  }
  if (r.time) base.time = randomTime()

  if (r.productCount) {
    const count = randomInt(r.productCountMin, r.productCountMax)
    const src   = form.value.products
    base.products = Array.from({ length: count }, () => {
      const tpl = src[randomInt(0, src.length - 1)]
      return {
        id:        crypto.randomUUID(),
        name:      r.productNames  ? randomProductName()      : (tpl?.name      ?? ''),
        quantity:  r.productQtys   ? randomInt(1, 10)         : (tpl?.quantity  ?? 1),
        unitPrice: r.productPrices ? randomFloat(0.5, 30)     : (tpl?.unitPrice ?? 0),
      }
    })
  } else {
    if (r.productNames)  base.products.forEach((p) => { p.name      = randomProductName() })
    if (r.productQtys)   base.products.forEach((p) => { p.quantity  = randomInt(1, 10) })
    if (r.productPrices) base.products.forEach((p) => { p.unitPrice = randomFloat(0.5, 30) })
  }

  return base
}

// ---- Capture helper ----
// html-to-image is used instead of html2canvas because html2canvas does not
// support the oklch() color function used by Tailwind v4 / Nuxt UI.
async function captureElement(el: HTMLElement): Promise<Blob> {
  const { toBlob } = await import('html-to-image')
  const blob = await toBlob(el, { pixelRatio: 2 })
  return blob!
}

// ---- Single PNG download (uses live preview) ----
async function downloadSingle() {
  if (!captureRef.value) return
  downloading.value = true
  try {
    const blob = await captureElement(captureRef.value)
    const a    = document.createElement('a')
    a.download = `receipt-${form.value.receiptNumber || 'draft'}-${form.value.date || 'nodate'}.png`
    a.href     = URL.createObjectURL(blob)
    a.click()
    URL.revokeObjectURL(a.href)
    toast.add({ title: 'Downloaded!', description: a.download, color: 'success', icon: 'i-lucide-download' })
  } catch (err) {
    console.error(err)
    toast.add({ title: 'Download failed', description: 'Please try again.', color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    downloading.value = false
  }
}

// ---- Batch ZIP generation (uses hidden off-screen renderer) ----
async function generateBatch() {
  if (!batchRef.value) return
  generating.value    = true
  batchProgress.value = 0
  try {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()

    for (let i = 0; i < batchCount.value; i++) {
      batchData.value = buildReceiptData()
      await nextTick()
      await new Promise((r) => requestAnimationFrame(r))

      const blob  = await captureElement(batchRef.value!)
      const num   = batchData.value.receiptNumber || String(i + 1)
      const date  = batchData.value.date || 'nodate'
      zip.file(`receipt-${String(i + 1).padStart(3, '0')}-${num}-${date}.png`, blob)
      batchProgress.value = (i + 1) / batchCount.value
    }

    const content = await zip.generateAsync({ type: 'blob' })
    const a       = document.createElement('a')
    a.download    = `receipts-${batchCount.value}-${new Date().toISOString().split('T')[0]}.zip`
    a.href        = URL.createObjectURL(content)
    a.click()
    URL.revokeObjectURL(a.href)
    toast.add({ title: `${batchCount.value} receipts generated!`, description: a.download, color: 'success', icon: 'i-lucide-package' })
  } catch (err) {
    console.error(err)
    toast.add({ title: 'Generation failed', description: 'Please try again.', color: 'error', icon: 'i-lucide-circle-x' })
  } finally {
    generating.value    = false
    batchProgress.value = 0
  }
}

function handleGenerate() {
  if (batchCount.value > 1) generateBatch()
  else downloadSingle()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Header -->
    <header class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
      <div class="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-receipt" class="text-primary-500 size-6" />
          <h1 class="text-lg font-bold text-gray-900 dark:text-white">Receipt Generator</h1>
        </div>
        <UButton color="neutral" variant="ghost" icon="i-lucide-rotate-ccw" size="sm" @click="doReset">
          Reset
        </UButton>
      </div>
    </header>

    <main class="max-w-screen-xl mx-auto px-4 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">

        <!-- ===== LEFT: Form ===== -->
        <div class="lg:col-span-3 space-y-4">

          <!-- Store Information -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-store" class="text-primary-500 size-4" />
                <span class="font-semibold text-sm">Store Information</span>
              </div>
            </template>
            <div class="space-y-4">

              <UFormField label="Store Name">
                <div class="flex gap-2 items-center">
                  <UInput v-model="form.storeName" :disabled="form.randomize.store" class="flex-1" placeholder="Enter store name" />
                  <label class="inline-flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
                    <UCheckbox v-model="form.randomize.store" @update:model-value="onRandomStore" />
                    <span class="text-xs text-gray-500 dark:text-gray-400">Random</span>
                  </label>
                </div>
              </UFormField>

              <UFormField label="Address">
                <UInput v-model="form.storeAddress" :disabled="form.randomize.store" class="w-full" placeholder="Via Roma, 1 - 00100 Roma RM" />
              </UFormField>

              <UFormField label="VAT ID">
                <UInput v-model="form.vatId" :disabled="form.randomize.store" class="w-full" placeholder="e.g. IT12345678901" />
              </UFormField>

              <UFormField label="Tax Rate (%)">
                <UInputNumber v-model="form.taxRate" :min="0" :max="100" :step="1" class="w-32" />
              </UFormField>
            </div>
          </UCard>

          <!-- Receipt Details -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-file-text" class="text-primary-500 size-4" />
                <span class="font-semibold text-sm">Receipt Details</span>
              </div>
            </template>
            <div class="space-y-4">

              <UFormField label="Receipt Number">
                <div class="flex gap-2 items-center">
                  <UInput v-model="form.receiptNumber" :disabled="form.randomize.receiptNumber" class="flex-1" placeholder="e.g. 123456" />
                  <label class="inline-flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
                    <UCheckbox v-model="form.randomize.receiptNumber" @update:model-value="onRandomReceiptNumber" />
                    <span class="text-xs text-gray-500 dark:text-gray-400">Random</span>
                  </label>
                </div>
              </UFormField>

              <UFormField label="Date">
                <div class="space-y-2">
                  <div class="flex gap-2 items-center">
                    <UInput v-model="form.date" type="date" :disabled="form.randomize.date" class="flex-1" />
                    <label class="inline-flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
                      <UCheckbox v-model="form.randomize.date" @update:model-value="onRandomDate" />
                      <span class="text-xs text-gray-500 dark:text-gray-400">Random</span>
                    </label>
                  </div>

                  <!-- Date randomize options -->
                  <Transition
                    enter-active-class="transition-all duration-200 ease-out"
                    enter-from-class="opacity-0 -translate-y-1"
                    enter-to-class="opacity-100 translate-y-0"
                    leave-active-class="transition-all duration-150 ease-in"
                    leave-from-class="opacity-100 translate-y-0"
                    leave-to-class="opacity-0 -translate-y-1"
                  >
                    <div
                      v-if="form.randomize.date"
                      class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50 space-y-3"
                    >
                      <div class="flex gap-4">
                        <label class="inline-flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            v-model="form.randomize.dateMode"
                            type="radio"
                            value="full"
                            class="accent-primary-500"
                            @change="onDateModeChange"
                          >
                          <span class="text-sm">Last 2 years</span>
                        </label>
                        <label class="inline-flex items-center gap-1.5 cursor-pointer select-none">
                          <input
                            v-model="form.randomize.dateMode"
                            type="radio"
                            value="range"
                            class="accent-primary-500"
                            @change="onDateModeChange"
                          >
                          <span class="text-sm">Date range</span>
                        </label>
                      </div>
                      <div v-if="form.randomize.dateMode === 'range'" class="flex flex-wrap gap-3">
                        <UFormField label="From" class="flex-1 min-w-32">
                          <UInput v-model="form.randomize.dateFrom" type="date" @change="onDateModeChange" />
                        </UFormField>
                        <UFormField label="To" class="flex-1 min-w-32">
                          <UInput v-model="form.randomize.dateTo" type="date" @change="onDateModeChange" />
                        </UFormField>
                      </div>
                    </div>
                  </Transition>
                </div>
              </UFormField>

              <UFormField label="Time">
                <div class="flex gap-2 items-center">
                  <UInput v-model="form.time" type="time" :disabled="form.randomize.time" class="flex-1" />
                  <label class="inline-flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
                    <UCheckbox v-model="form.randomize.time" @update:model-value="onRandomTime" />
                    <span class="text-xs text-gray-500 dark:text-gray-400">Random</span>
                  </label>
                </div>
              </UFormField>

              <UFormField label="Payment Method">
                <div class="flex gap-2 flex-wrap">
                  <UButton
                    v-for="method in PAYMENT_METHODS"
                    :key="method"
                    size="sm"
                    :color="form.paymentMethod === method ? 'primary' : 'neutral'"
                    :variant="form.paymentMethod === method ? 'solid' : 'outline'"
                    @click="form.paymentMethod = method"
                  >
                    {{ method }}
                  </UButton>
                </div>
              </UFormField>

              <UFormField v-if="form.paymentMethod === 'CONTANTI'" label="Cash Given (€)">
                <UInputNumber
                  v-model="form.cashGiven"
                  :min="0"
                  :step="0.50"
                  :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
                  class="w-40"
                />
              </UFormField>
            </div>
          </UCard>

          <!-- Products -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-package" class="text-primary-500 size-4" />
                  <span class="font-semibold text-sm">Products</span>
                  <UBadge color="neutral" variant="solid" :label="String(form.products.length)" size="sm" />
                </div>
                <div class="flex gap-2">
                  <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-plus" @click="addProduct">
                    Add
                  </UButton>
                  <UButton size="sm" color="primary" variant="soft" icon="i-lucide-sparkles" @click="addRandomProduct">
                    Add Random
                  </UButton>
                </div>
              </div>
            </template>

            <!-- Randomize-at-generation settings -->
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <span class="text-xs text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">At generation:</span>

              <label class="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <UCheckbox v-model="form.randomize.productCount" />
                <span class="text-xs">Count</span>
              </label>
              <div v-if="form.randomize.productCount" class="flex items-center gap-1">
                <UInputNumber v-model="form.randomize.productCountMin" :min="1" :max="20" size="sm" class="w-16" />
                <span class="text-xs text-gray-400">–</span>
                <UInputNumber v-model="form.randomize.productCountMax" :min="1" :max="20" size="sm" class="w-16" />
              </div>

              <label class="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <UCheckbox v-model="form.randomize.productNames" />
                <span class="text-xs">Names</span>
              </label>

              <label class="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <UCheckbox v-model="form.randomize.productQtys" />
                <span class="text-xs">Quantities</span>
              </label>

              <label class="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <UCheckbox v-model="form.randomize.productPrices" />
                <span class="text-xs">Prices</span>
              </label>
            </div>

            <!-- Column headers (desktop only) -->
            <div
              v-if="form.products.length > 0"
              class="hidden sm:grid gap-2 mb-1 px-1"
              style="grid-template-columns: minmax(0,1fr) 100px 120px 64px"
            >
              <span class="text-xs text-gray-400 dark:text-gray-500 font-medium">Name</span>
              <span class="text-xs text-gray-400 dark:text-gray-500 font-medium">Qty</span>
              <span class="text-xs text-gray-400 dark:text-gray-500 font-medium">Unit Price</span>
              <span />
            </div>

            <!-- Product rows -->
            <div class="space-y-2">
              <div v-for="product in form.products" :key="product.id">

                <!-- Mobile layout -->
                <div class="sm:hidden space-y-2 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div class="flex gap-2 items-center">
                    <UInput v-model="product.name" placeholder="Product name" class="flex-1" size="sm" />
                    <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-shuffle" square @click="randomizeProductName(product)" />
                    <UButton size="sm" color="error" variant="ghost" icon="i-lucide-trash-2" square @click="removeProduct(product.id)" />
                  </div>
                  <div class="flex gap-3">
                    <div class="flex-1 space-y-1">
                      <div class="text-xs text-gray-400 dark:text-gray-500">Qty</div>
                      <div class="flex gap-1">
                        <UInputNumber v-model="product.quantity" :min="1" :max="9999" :step="1" :increment="false" :decrement="false" size="sm" class="flex-1" />
                        <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-dice-5" square @click="randomizeProductQty(product)" />
                      </div>
                    </div>
                    <div class="flex-1 space-y-1">
                      <div class="text-xs text-gray-400 dark:text-gray-500">Unit Price</div>
                      <div class="flex gap-1">
                        <UInputNumber v-model="product.unitPrice" :min="0" :step="0.01" :increment="false" :decrement="false" :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }" size="sm" class="flex-1" />
                        <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-dice-5" square @click="randomizeProductPrice(product)" />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Desktop layout -->
                <div class="hidden sm:grid gap-2 items-center" style="grid-template-columns: minmax(0,1fr) 100px 120px 64px">
                  <div class="flex gap-1 min-w-0">
                    <UInput v-model="product.name" placeholder="Product name" class="flex-1 min-w-0" size="sm" />
                    <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-shuffle" square @click="randomizeProductName(product)" />
                  </div>
                  <div class="flex gap-1 items-center">
                    <UInputNumber v-model="product.quantity" :min="1" :max="9999" :step="1" :increment="false" :decrement="false" size="sm" class="flex-1 min-w-0" />
                    <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-dice-5" square @click="randomizeProductQty(product)" />
                  </div>
                  <div class="flex gap-1 items-center">
                    <UInputNumber v-model="product.unitPrice" :min="0" :step="0.01" :increment="false" :decrement="false" :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }" size="sm" class="flex-1 min-w-0" />
                    <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-dice-5" square @click="randomizeProductPrice(product)" />
                  </div>
                  <div class="flex justify-end">
                    <UButton size="sm" color="error" variant="ghost" icon="i-lucide-trash-2" square @click="removeProduct(product.id)" />
                  </div>
                </div>
              </div>

              <div v-if="form.products.length === 0" class="text-center py-10 text-gray-400 dark:text-gray-600">
                <UIcon name="i-lucide-package-x" class="size-10 mb-2" />
                <p class="text-sm">No products yet — add one above</p>
              </div>
            </div>

            <!-- Totals footer -->
            <template v-if="form.products.length > 0" #footer>
              <div class="space-y-1.5 text-sm">
                <div class="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Subtotal</span><span>{{ fmt(subtotal) }}</span>
                </div>
                <div class="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Tax ({{ form.taxRate }}%)</span><span>{{ fmt(taxAmount) }}</span>
                </div>
                <USeparator />
                <div class="flex justify-between font-bold text-gray-900 dark:text-white text-base">
                  <span>Total</span><span>{{ fmt(total) }}</span>
                </div>
              </div>
            </template>
          </UCard>
        </div>

        <!-- ===== RIGHT: Preview + Generate ===== -->
        <div class="lg:col-span-2">
          <div class="lg:sticky lg:top-20 space-y-4">

            <!-- Preview card -->
            <UCard>
              <template #header>
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-eye" class="text-primary-500 size-4" />
                    <span class="font-semibold text-sm">Preview</span>
                  </div>
                  <USelect
                    v-model="form.background"
                    :items="BACKGROUNDS"
                    value-key="value"
                    label-key="label"
                    size="sm"
                    class="w-36"
                    icon="i-lucide-image"
                  />
                </div>
              </template>

              <div class="overflow-x-auto flex justify-center rounded-lg">
                <div ref="captureRef" style="display:inline-block; line-height:0;">
                  <ReceiptPreview
                    :store-name="form.storeName"
                    :store-address="form.storeAddress"
                    :vat-id="form.vatId"
                    :receipt-number="form.receiptNumber"
                    :date="form.date"
                    :time="form.time"
                    :products="form.products"
                    :tax-rate="form.taxRate"
                    :payment-method="form.paymentMethod"
                    :cash-given="form.cashGiven"
                    :background="form.background"
                  />
                </div>
              </div>
            </UCard>

            <!-- Generate & Download card -->
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-layers" class="text-primary-500 size-4" />
                  <span class="font-semibold text-sm">Generate</span>
                </div>
              </template>

              <div class="space-y-4">
                <!-- Count -->
                <div class="flex items-center gap-3">
                  <UFormField label="How many" class="flex-1">
                    <div class="flex items-center gap-2">
                      <UInputNumber v-model="batchCount" :min="1" :max="50" :step="1" class="w-28" />
                      <span class="text-sm text-gray-500 dark:text-gray-400">
                        {{ batchCount > 1 ? 'receipts → ZIP' : 'receipt → PNG' }}
                      </span>
                    </div>
                  </UFormField>
                </div>

                <!-- Progress bar -->
                <div v-if="generating" class="space-y-1.5">
                  <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Generating…</span>
                    <span>{{ Math.round(batchProgress * batchCount) }} / {{ batchCount }}</span>
                  </div>
                  <div class="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      class="h-full bg-primary-500 rounded-full transition-all duration-300 ease-out"
                      :style="{ width: `${batchProgress * 100}%` }"
                    />
                  </div>
                </div>

                <!-- Button -->
                <UButton
                  block
                  size="lg"
                  :icon="batchCount > 1 ? 'i-lucide-archive' : 'i-lucide-download'"
                  :loading="downloading || generating"
                  :disabled="downloading || generating"
                  @click="handleGenerate"
                >
                  {{ batchCount > 1 ? `Download ${batchCount} receipts (ZIP)` : 'Download PNG' }}
                </UButton>
              </div>
            </UCard>

          </div>
        </div>

      </div>
    </main>
  </div>

  <!-- Hidden off-screen renderer — used during batch generation -->
  <div aria-hidden="true" style="position:fixed; left:-9999px; top:0; pointer-events:none;">
    <div ref="batchRef" style="display:inline-block; line-height:0;">
      <ReceiptPreview
        :store-name="batchData.storeName"
        :store-address="batchData.storeAddress"
        :vat-id="batchData.vatId"
        :receipt-number="batchData.receiptNumber"
        :date="batchData.date"
        :time="batchData.time"
        :products="batchData.products"
        :tax-rate="batchData.taxRate"
        :payment-method="batchData.paymentMethod"
        :cash-given="batchData.cashGiven"
        :background="batchData.background"
      />
    </div>
  </div>
</template>
