export const PRESET_STORES = [
  { name: 'Supermercato Aurora', vatId: 'IT12345678901', address: 'Via Roma, 14 - 20121 Milano MI' },
  { name: 'Farmacia Centrale', vatId: 'IT98765432109', address: 'Corso Italia, 3 - 00185 Roma RM' },
  { name: 'Bar Ristorante Il Sole', vatId: 'IT11223344556', address: 'Piazza Garibaldi, 8 - 80142 Napoli NA' },
  { name: 'Elettronica Futura', vatId: 'IT55667788990', address: 'Via Nazionale, 55 - 50123 Firenze FI' },
  { name: 'Libreria del Centro', vatId: 'IT33445566778', address: 'Via Mazzini, 22 - 40121 Bologna BO' },
  { name: 'Ottica Vision', vatId: 'IT77889900123', address: 'Corso Vittorio, 17 - 10121 Torino TO' },
  { name: 'Tabaccheria Da Mario', vatId: 'IT44556677889', address: 'Via Cavour, 6 - 16121 Genova GE' },
  { name: 'Abbigliamento Fashion', vatId: 'IT22334455667', address: 'Galleria Umberto, 2 - 80132 Napoli NA' },
  { name: 'Pasticceria Dolce Vita', vatId: 'IT66778899001', address: 'Via dei Fori, 9 - 00186 Roma RM' },
  { name: 'Cartoleria Express', vatId: 'IT88990011223', address: 'Via Torino, 38 - 20123 Milano MI' },
  { name: 'Macelleria Da Nino', vatId: 'IT99001122334', address: 'Via Mercato, 11 - 50122 Firenze FI' },
  { name: 'Fruttivendolo Bio', vatId: 'IT10111213141', address: 'Via Verde, 5 - 40139 Bologna BO' },
  { name: 'Panificio Artigianale', vatId: 'IT15161718191', address: 'Vicolo del Pane, 2 - 16100 Genova GE' },
  { name: 'Ferramenta Brico', vatId: 'IT20212223242', address: 'Via Industriale, 88 - 10040 Torino TO' },
  { name: 'Pizzeria Bella Napoli', vatId: 'IT25262728292', address: 'Via Tribunali, 120 - 80138 Napoli NA' },
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

  function randomTime(): string {
    const h = randomInt(8, 20)
    const m = randomInt(0, 59)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
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
    randomTime,
  }
}
