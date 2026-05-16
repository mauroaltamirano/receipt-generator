export const PRESET_STORES = [
  { name: 'Supermercato Aurora', vatId: 'IT12345678901' },
  { name: 'Farmacia Centrale', vatId: 'IT98765432109' },
  { name: 'Bar Ristorante Il Sole', vatId: 'IT11223344556' },
  { name: 'Elettronica Futura', vatId: 'IT55667788990' },
  { name: 'Libreria del Centro', vatId: 'IT33445566778' },
  { name: 'Ottica Vision', vatId: 'IT77889900123' },
  { name: 'Tabaccheria Da Mario', vatId: 'IT44556677889' },
  { name: 'Abbigliamento Fashion', vatId: 'IT22334455667' },
  { name: 'Pasticceria Dolce Vita', vatId: 'IT66778899001' },
  { name: 'Cartoleria Express', vatId: 'IT88990011223' },
  { name: 'Macelleria Da Nino', vatId: 'IT99001122334' },
  { name: 'Fruttivendolo Bio', vatId: 'IT10111213141' },
  { name: 'Panificio Artigianale', vatId: 'IT15161718191' },
  { name: 'Ferramenta Brico', vatId: 'IT20212223242' },
  { name: 'Pizzeria Bella Napoli', vatId: 'IT25262728292' },
]

export const PRESET_PRODUCTS = [
  'Pane casereccio', 'Latte intero 1L', 'Uova fresche (6pz)', 'Burro 250g', 'Farina 00 1kg',
  'Acqua minerale 1,5L', 'Vino rosso 75cl', 'Pasta spaghetti 500g', 'Riso arborio 1kg',
  "Olio d'oliva 750ml", 'Yogurt naturale', 'Parmigiano Reggiano 200g',
  'Prosciutto cotto 100g', 'Mortadella 150g', 'Tonno in scatola 160g',
  'Biscotti frollini 400g', 'Succo di arancia 1L', 'Birra 33cl',
  'Detersivo piatti 500ml', 'Shampoo 250ml', 'Caffè macinato 250g',
  'Zucchero semolato 1kg', 'Sale fino 1kg', 'Pepe nero macinato', 'Pomodori pelati 400g',
  'Mozzarella fior di latte', 'Basilico fresco', 'Insalata mista', 'Pomodori datterini 500g',
  'Salmone affumicato 100g', 'Crema di nocciole 400g', 'Crackers 500g',
  'Passata di pomodoro 700g', 'Cioccolato fondente 100g', 'Prosciutto crudo 80g',
]

export function useRandom() {
  function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  function randomFloat(min: number, max: number, decimals = 2): number {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
  }

  function randomPick<T>(arr: T[]): T {
    return arr[randomInt(0, arr.length - 1)]!
  }

  function randomStore() {
    return randomPick(PRESET_STORES)
  }

  function randomProductName(): string {
    return randomPick(PRESET_PRODUCTS)
  }

  function randomReceiptNumber(): string {
    return String(randomInt(100000, 999999))
  }

  function randomDateInRange(from: string, to: string): string {
    const fromMs = new Date(from).getTime()
    const toMs = new Date(to).getTime()
    if (fromMs > toMs) return from
    return new Date(randomInt(fromMs, toMs)).toISOString().split('T')[0]!
  }

  function randomDateFull(): string {
    const to = new Date()
    const from = new Date(to.getFullYear() - 2, to.getMonth(), to.getDate())
    return randomDateInRange(
      from.toISOString().split('T')[0]!,
      to.toISOString().split('T')[0]!,
    )
  }

  return {
    randomInt,
    randomFloat,
    randomPick,
    randomStore,
    randomProductName,
    randomReceiptNumber,
    randomDateInRange,
    randomDateFull,
  }
}
