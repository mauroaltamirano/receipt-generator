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

const BACKGROUNDS = [
  { value: 'plain',  label: 'Piano bianco' },
  { value: 'wood',   label: 'Legno' },
  { value: 'marble', label: 'Marmo' },
  { value: 'dark',   label: 'Piano scuro' },
  { value: 'kraft',  label: 'Carta kraft' },
]

const PAYMENT_METHODS = ['CONTANTI', 'BANCOMAT', 'CARTA DI CREDITO'] as const
const toast = useToast()

// ---- Form state ----
const form = ref(defaultData())

// ---- Constrained date state ----
const constrainedFrom = ref('')
const constrainedTo = ref('')
const showDatePanel = ref(false)

// ---- UI state ----
const downloading = ref(false)
const captureRef = ref<HTMLElement | null>(null)

// ---- Lifecycle ----
onMounted(() => {
  form.value = load()

  const now = new Date()
  constrainedTo.value = now.toISOString().split('T')[0]!
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  constrainedFrom.value = oneMonthAgo.toISOString().split('T')[0]!
})

watch(form, (v) => save(v), { deep: true })

// ---- Computed ----
const subtotal = computed(() =>
  form.value.products.reduce((s, p) => s + p.quantity * p.unitPrice, 0),
)
const taxAmount = computed(() => subtotal.value * form.value.taxRate / 100)
const total = computed(() => subtotal.value + taxAmount.value)

function fmt(n: number) {
  return `€${n.toFixed(2)}`
}

// ---- Store ----
function doRandomStore() {
  const s = randomStore()
  form.value.storeName = s.name
  form.value.storeAddress = s.address
  form.value.vatId = s.vatId
}

// ---- Receipt number ----
function doRandomReceiptNumber() {
  form.value.receiptNumber = randomReceiptNumber()
}

// ---- Time ----
function doRandomTime() {
  form.value.time = randomTime()
}

// ---- Date ----
function doFullRandomDate() {
  form.value.date = randomDateFull()
  showDatePanel.value = false
}

function doConstrainedRandomDate() {
  if (!constrainedFrom.value || !constrainedTo.value) return
  form.value.date = randomDateInRange(constrainedFrom.value, constrainedTo.value)
}

// ---- Products ----
function addProduct() {
  form.value.products.push(newProduct())
}

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

function randomizeProductName(product: Product) {
  product.name = randomProductName()
}

function randomizeProductQty(product: Product) {
  product.quantity = randomInt(1, 10)
}

function randomizeProductPrice(product: Product) {
  product.unitPrice = randomFloat(0.5, 50)
}

function randomizeAllNames() {
  form.value.products.forEach((p) => { p.name = randomProductName() })
}

function randomizeAllQty() {
  form.value.products.forEach((p) => { p.quantity = randomInt(1, 10) })
}

function randomizeAllPrices() {
  form.value.products.forEach((p) => { p.unitPrice = randomFloat(0.5, 50) })
}

// ---- Reset ----
function doReset() {
  clear()
  form.value = defaultData()
  showDatePanel.value = false
}

// ---- Download ----
async function downloadReceipt() {
  if (!captureRef.value) return
  downloading.value = true
  try {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(captureRef.value, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      logging: false,
    })
    const link = document.createElement('a')
    const num = form.value.receiptNumber || 'draft'
    const date = form.value.date || 'nodate'
    link.download = `receipt-${num}-${date}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast.add({
      title: 'Receipt downloaded!',
      description: link.download,
      color: 'success',
      icon: 'i-lucide-download',
    })
  } catch (err) {
    console.error(err)
    toast.add({
      title: 'Download failed',
      description: 'Please try again.',
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
  } finally {
    downloading.value = false
  }
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
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-rotate-ccw"
          size="sm"
          @click="doReset"
        >
          Reset
        </UButton>
      </div>
    </header>

    <!-- Main content -->
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
                <div class="flex gap-2">
                  <UInput
                    v-model="form.storeName"
                    class="flex-1"
                    placeholder="Enter store name"
                  />
                  <UButton
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-shuffle"
                    @click="doRandomStore"
                  >
                    Random
                  </UButton>
                </div>
              </UFormField>

              <UFormField label="Address">
                <UInput
                  v-model="form.storeAddress"
                  placeholder="Via Roma, 1 - 00100 Roma RM"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="VAT ID">
                <UInput
                  v-model="form.vatId"
                  placeholder="e.g. IT12345678901"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Tax Rate (%)">
                <UInputNumber
                  v-model="form.taxRate"
                  :min="0"
                  :max="100"
                  :step="1"
                  class="w-32"
                />
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
                <div class="flex gap-2">
                  <UInput
                    v-model="form.receiptNumber"
                    class="flex-1"
                    placeholder="e.g. 123456"
                  />
                  <UButton
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-hash"
                    @click="doRandomReceiptNumber"
                  >
                    Random
                  </UButton>
                </div>
              </UFormField>

              <UFormField label="Time">
                <div class="flex gap-2">
                  <UInput v-model="form.time" type="time" class="flex-1" />
                  <UButton
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-clock"
                    @click="doRandomTime"
                  >
                    Random
                  </UButton>
                </div>
              </UFormField>

              <UFormField label="Date">
                <div class="space-y-2">
                  <div class="flex flex-wrap gap-2">
                    <UInput v-model="form.date" type="date" class="flex-1 min-w-36" />
                    <UButton
                      color="neutral"
                      variant="outline"
                      icon="i-lucide-calendar-x-2"
                      @click="doFullRandomDate"
                    >
                      <span class="hidden sm:inline">Full </span>Random
                    </UButton>
                    <UButton
                      :color="showDatePanel ? 'primary' : 'neutral'"
                      :variant="showDatePanel ? 'soft' : 'outline'"
                      icon="i-lucide-calendar-range"
                      @click="showDatePanel = !showDatePanel"
                    >
                      <span class="hidden sm:inline">Constrained</span>
                      <span class="sm:hidden">Range</span>
                    </UButton>
                  </div>

                  <!-- Constrained date panel -->
                  <Transition
                    enter-active-class="transition-all duration-200 ease-out"
                    enter-from-class="opacity-0 -translate-y-1"
                    enter-to-class="opacity-100 translate-y-0"
                    leave-active-class="transition-all duration-150 ease-in"
                    leave-from-class="opacity-100 translate-y-0"
                    leave-to-class="opacity-0 -translate-y-1"
                  >
                    <div
                      v-if="showDatePanel"
                      class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50"
                    >
                      <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Pick a random date within a range:
                      </p>
                      <div class="flex flex-wrap gap-3 items-end">
                        <UFormField label="From" class="flex-1 min-w-32">
                          <UInput v-model="constrainedFrom" type="date" />
                        </UFormField>
                        <UFormField label="To" class="flex-1 min-w-32">
                          <UInput v-model="constrainedTo" type="date" />
                        </UFormField>
                        <UButton
                          color="primary"
                          icon="i-lucide-zap"
                          :disabled="
                            !constrainedFrom ||
                              !constrainedTo ||
                              constrainedFrom > constrainedTo
                          "
                          @click="doConstrainedRandomDate"
                        >
                          Generate
                        </UButton>
                      </div>
                    </div>
                  </Transition>
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
                  <UBadge
                    color="neutral"
                    variant="solid"
                    :label="String(form.products.length)"
                    size="sm"
                  />
                </div>
                <div class="flex gap-2">
                  <UButton
                    size="sm"
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-plus"
                    @click="addProduct"
                  >
                    Add
                  </UButton>
                  <UButton
                    size="sm"
                    color="primary"
                    variant="soft"
                    icon="i-lucide-sparkles"
                    @click="addRandomProduct"
                  >
                    Add Random
                  </UButton>
                </div>
              </div>
            </template>

            <!-- Bulk randomize toolbar -->
            <div
              v-if="form.products.length > 0"
              class="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800"
            >
              <span class="text-xs text-gray-400 dark:text-gray-500 font-medium">Randomize all:</span>
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                icon="i-lucide-tag"
                @click="randomizeAllNames"
              >
                Names
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                icon="i-lucide-hash"
                @click="randomizeAllQty"
              >
                Quantities
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                icon="i-lucide-coins"
                @click="randomizeAllPrices"
              >
                Prices
              </UButton>
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

                <!-- Mobile layout (< sm): card with 2 rows -->
                <div class="sm:hidden space-y-2 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div class="flex gap-2 items-center">
                    <UInput
                      v-model="product.name"
                      placeholder="Product name"
                      class="flex-1"
                      size="sm"
                    />
                    <UButton
                      size="sm"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-shuffle"
                      square
                      @click="randomizeProductName(product)"
                    />
                    <UButton
                      size="sm"
                      color="error"
                      variant="ghost"
                      icon="i-lucide-trash-2"
                      square
                      @click="removeProduct(product.id)"
                    />
                  </div>
                  <div class="flex gap-3">
                    <div class="flex-1 space-y-1">
                      <div class="text-xs text-gray-400 dark:text-gray-500">Qty</div>
                      <div class="flex gap-1">
                        <UInputNumber
                          v-model="product.quantity"
                          :min="1"
                          :max="9999"
                          :step="1"
                          :increment="false"
                          :decrement="false"
                          size="sm"
                          class="flex-1"
                        />
                        <UButton
                          size="sm"
                          color="neutral"
                          variant="ghost"
                          icon="i-lucide-dice-5"
                          square
                          @click="randomizeProductQty(product)"
                        />
                      </div>
                    </div>
                    <div class="flex-1 space-y-1">
                      <div class="text-xs text-gray-400 dark:text-gray-500">Unit Price</div>
                      <div class="flex gap-1">
                        <UInputNumber
                          v-model="product.unitPrice"
                          :min="0"
                          :step="0.01"
                          :increment="false"
                          :decrement="false"
                          :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
                          size="sm"
                          class="flex-1"
                        />
                        <UButton
                          size="sm"
                          color="neutral"
                          variant="ghost"
                          icon="i-lucide-dice-5"
                          square
                          @click="randomizeProductPrice(product)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Desktop layout (sm+): single-row grid -->
                <div
                  class="hidden sm:grid gap-2 items-center"
                  style="grid-template-columns: minmax(0,1fr) 100px 120px 64px"
                >
                  <div class="flex gap-1 min-w-0">
                    <UInput
                      v-model="product.name"
                      placeholder="Product name"
                      class="flex-1 min-w-0"
                      size="sm"
                    />
                    <UButton
                      size="sm"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-shuffle"
                      square
                      @click="randomizeProductName(product)"
                    />
                  </div>
                  <div class="flex gap-1 items-center">
                    <UInputNumber
                      v-model="product.quantity"
                      :min="1"
                      :max="9999"
                      :step="1"
                      :increment="false"
                      :decrement="false"
                      size="sm"
                      class="flex-1 min-w-0"
                    />
                    <UButton
                      size="sm"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-dice-5"
                      square
                      @click="randomizeProductQty(product)"
                    />
                  </div>
                  <div class="flex gap-1 items-center">
                    <UInputNumber
                      v-model="product.unitPrice"
                      :min="0"
                      :step="0.01"
                      :increment="false"
                      :decrement="false"
                      :format-options="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
                      size="sm"
                      class="flex-1 min-w-0"
                    />
                    <UButton
                      size="sm"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-dice-5"
                      square
                      @click="randomizeProductPrice(product)"
                    />
                  </div>
                  <div class="flex justify-end">
                    <UButton
                      size="sm"
                      color="error"
                      variant="ghost"
                      icon="i-lucide-trash-2"
                      square
                      @click="removeProduct(product.id)"
                    />
                  </div>
                </div>

              </div>

              <!-- Empty state -->
              <div
                v-if="form.products.length === 0"
                class="text-center py-10 text-gray-400 dark:text-gray-600"
              >
                <UIcon name="i-lucide-package-x" class="size-10 mb-2" />
                <p class="text-sm">No products yet — add one above</p>
              </div>
            </div>

            <!-- Totals footer -->
            <template v-if="form.products.length > 0" #footer>
              <div class="space-y-1.5 text-sm">
                <div class="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>{{ fmt(subtotal) }}</span>
                </div>
                <div class="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Tax ({{ form.taxRate }}%)</span>
                  <span>{{ fmt(taxAmount) }}</span>
                </div>
                <USeparator />
                <div class="flex justify-between font-bold text-gray-900 dark:text-white text-base">
                  <span>Total</span>
                  <span>{{ fmt(total) }}</span>
                </div>
              </div>
            </template>
          </UCard>
        </div>

        <!-- ===== RIGHT: Preview ===== -->
        <div class="lg:col-span-2">
          <div class="lg:sticky lg:top-20 space-y-4">
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

              <!-- Capture wrapper — html2canvas reads this element -->
              <div class="overflow-x-auto flex justify-center rounded-lg">
                <div
                  ref="captureRef"
                  style="display: inline-block; line-height: 0;"
                >
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

            <UButton
              block
              size="lg"
              icon="i-lucide-download"
              :loading="downloading"
              :disabled="downloading"
              @click="downloadReceipt"
            >
              Download PNG
            </UButton>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
