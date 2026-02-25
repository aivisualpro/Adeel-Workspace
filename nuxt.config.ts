import tailwindcss from '@tailwindcss/vite'
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  spaLoadingTemplate: false,

  watch: ['~/app.config.ts'],

  css: ['~/assets/css/tailwind.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
    server: {
      watch: {
        usePolling: true,
        interval: 1000,
        ignored: ['**/node_modules/**', '**/.git/**'],
      },
    },
  },

  components: [
    {
      path: '~/components',
      extensions: ['.vue'],
    },
  ],

  modules: [
    'shadcn-nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    '@nuxt/fonts',
  ],

  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "~/components/ui"
     */
    componentDir: '~/components/ui',
  },

  colorMode: {
    classSuffix: '',
  },

  eslint: {
    config: {
      standalone: false,
    },
  },

  fonts: {
    defaults: {
      weights: [300, 400, 500, 600, 700, 800],
    },
  },

  routeRules: {
    '/components': { redirect: '/components/accordion' },
    '/settings': { redirect: '/settings/profile' },
  },

  imports: {
    dirs: [
      './lib',
    ],
  },

  runtimeConfig: {
    // Server-only keys (never exposed to the client)
    // Nuxt auto-maps NUXT_BIGQUERY_PROJECT_ID → runtimeConfig.bigquery.projectId
    bigquery: {
      projectId: '',
      dataset: '',
      clientEmail: '',
      privateKeyId: '',
      privateKey: '',
    },
    // NUXT_DRIVE_* → runtimeConfig.drive.*
    drive: {
      email: '',         // NUXT_DRIVE_EMAIL
      clientId: '',      // NUXT_DRIVE_CLIENT_ID
      clientSecret: '',  // NUXT_DRIVE_CLIENT_SECRET
      refreshToken: '',  // NUXT_DRIVE_REFRESH_TOKEN
    },
    // Public keys (exposed to the client browser)
    public: {
      driveEmail: '', // NUXT_PUBLIC_DRIVE_EMAIL
    },
  },

  compatibilityDate: '2024-12-14',
})
