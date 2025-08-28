declare namespace NodeJS {
  interface ProcessEnv {
    ASPERO_API_BASE?: string
    ASPERO_API_HOME_PATH?: string
    ASPERO_API_BEARER?: string
    ASPERO_X_USER_ID?: string
    ASPERO_X_PRODUCT_ID?: string
    ASPERO_CHANNEL?: string
    ASPERO_X_USER_CATEGORY?: string
    ASPERO_DEVICE_PLATFORM?: string
    ASPERO_X_PIN_TOKEN?: string

    NEXT_PUBLIC_SUPABASE_URL?: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
  }
}
