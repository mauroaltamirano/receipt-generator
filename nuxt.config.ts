export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  future: { compatibilityVersion: 4 },
  modules: ['@nuxt/ui'],
  ssr: false,
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL ?? '/',
  },
})
