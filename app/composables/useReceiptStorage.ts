export interface Product {
  id: string
  name: string
  quantity: number
  unitPrice: number
}

export type PaymentMethod = 'CONTANTI' | 'BANCOMAT' | 'CARTA DI CREDITO'

export interface ReceiptFormData {
  storeName: string
  storeAddress: string
  vatId: string
  receiptNumber: string
  date: string
  time: string
  taxRate: number
  paymentMethod: PaymentMethod
  cashGiven: number
  background: string
  products: Product[]
}

const STORAGE_KEY = 'receipt-generator-v2'

export function useReceiptStorage() {
  function newProduct(): Product {
    return {
      id: crypto.randomUUID(),
      name: '',
      quantity: 1,
      unitPrice: 0,
    }
  }

  function defaultData(): ReceiptFormData {
    const now = new Date()
    return {
      storeName: '',
      storeAddress: '',
      vatId: '',
      receiptNumber: '',
      date: now.toISOString().split('T')[0]!,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      taxRate: 22,
      paymentMethod: 'CONTANTI',
      cashGiven: 0,
      background: 'plain',
      products: [newProduct()],
    }
  }

  function load(): ReceiptFormData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ReceiptFormData>
        const def = defaultData()
        return {
          ...def,
          ...parsed,
          products:
            Array.isArray(parsed.products) && parsed.products.length > 0
              ? parsed.products
              : def.products,
        }
      }
    } catch {}
    return defaultData()
  }

  function save(data: ReceiptFormData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {}
  }

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  return { load, save, clear, newProduct, defaultData }
}
