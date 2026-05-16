export interface Product {
  id: string
  name: string
  quantity: number
  unitPrice: number
}

export interface ReceiptFormData {
  storeName: string
  vatId: string
  receiptNumber: string
  date: string
  taxRate: number
  products: Product[]
}

const STORAGE_KEY = 'receipt-generator-v1'

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
    return {
      storeName: '',
      vatId: '',
      receiptNumber: '',
      date: new Date().toISOString().split('T')[0]!,
      taxRate: 22,
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
