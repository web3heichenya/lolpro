import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './electron/services/db/migrations',
  schema: './electron/services/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: './.tmp-userdata/lolpro.db',
  },
})
