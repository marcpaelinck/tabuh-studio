// WordPress API

export type WpUserRecord = {
    ID: string
    user_login?: string
    user_nicename?: string
    user_email?: string
    user_registered?: string
    user_status?: string
    display_name: string
    roles: string[]
}

export type WpUserReturnValue = { logged_in: boolean; user: WpUserRecord; nonce: string } | undefined

export type WpDatabaseReturnValue = { success: boolean; result: any[]; nonce: string } | undefined
