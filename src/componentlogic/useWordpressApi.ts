import _ from 'lodash'
import { useEffect, useState } from 'react'
import type { WordPressApiType } from '../components/contexts'
import type { UUID } from '../typing/types'

// Will be passed by the Tabu Studio WordPress plugin
interface WpApiSettings {
    root: string
    nonce: string
}
declare const wpApiSettings: WpApiSettings

export function useWordpressApi(): WordPressApiType {
    const apiRootURL = 'https://tabuh-studio.local/wp-json'

    var [wpTabuhSettings, setWpTabuhSettings] = useState<WpApiSettings>(wpApiSettings)

    useEffect(() => {
        console.log(`NEW TABUHSETTINGS: ${JSON.stringify(wpTabuhSettings)}`)
    }, [wpTabuhSettings])

    type ApiFunction = 'user_login' | 'user_logout' | 'user_info' | 'db_score_save' | 'db_score_get' | 'db_score_list'
    type Method = 'GET' | 'POST'
    interface FunctionProperties {
        endpoint: string
        method: Method
        nonce: boolean
    }

    const apiMethod: Record<ApiFunction, FunctionProperties> = {
        user_login: { endpoint: 'user/login', method: 'POST', nonce: true },
        user_logout: { endpoint: 'user/logout', method: 'GET', nonce: true },
        user_info: { endpoint: 'user/info', method: 'GET', nonce: true },
        db_score_save: { endpoint: 'db/score/save', method: 'POST', nonce: true },
        db_score_get: { endpoint: 'db/score/get', method: 'GET', nonce: true },
        db_score_list: { endpoint: 'db/score/list', method: 'GET', nonce: true }
    }

    // Generic function for a call to the tabuhstudio WordPress plugin API
    async function apiCall(func: ApiFunction, body?: object, nonce?: string) {
        const callparameters: RequestInit = { method: apiMethod[func].method }
        callparameters.credentials = 'same-origin'
        var headers: HeadersInit = {}
        const params: URLSearchParams = new URLSearchParams()
        var url = apiRootURL + '/tabuhstudio/v1/' + apiMethod[func].endpoint

        if (apiMethod[func].nonce) {
            headers['X-WP-Nonce'] = nonce || wpTabuhSettings.nonce
            callparameters.credentials = 'same-origin'
        }
        if (body) {
            if (apiMethod[func].method == 'POST') {
                // For POST calls, parameters are passed through the body
                headers['Content-Type'] = 'application/json'
                callparameters['body'] = JSON.stringify(body)
            } else {
                // For GET calls, parameters are passed as URL search parameters
                console.log(`BODY=${JSON.stringify(body)}`)
                _.toPairs(body).forEach(([name, value]) => params.append(name, value))
                url += `?${params}`
            }
        }
        callparameters.headers = headers

        // The actual call to the WP API
        console.log(`REQUEST=${apiMethod[func].endpoint} ${JSON.stringify(callparameters)}`)
        const jsonResponse = await fetch(url, callparameters).then((result) => {
            console.log(result)
            return result.json()
        })

        // Store the new nonce value as a state variable, so that it can be used with the next query.
        // The nonce value changes when the user signs in or out.
        if ('nonce' in jsonResponse && jsonResponse.nonce) {
            console.log(`setting tabuh settings: ${JSON.stringify(wpTabuhSettings)}`)
            setWpTabuhSettings({ ...wpTabuhSettings, ...{ nonce: jsonResponse.nonce as string } })
        }

        console.log(`${func} RESPONSE=${JSON.stringify(jsonResponse)}`)
        return jsonResponse
    }

    // USER FUNCTIONS

    async function login(username: string, password: string) {
        return await apiCall('user_login', { username: username, password: password })
    }

    async function logout(refreshNonce?: boolean) {
        return await apiCall('user_logout', undefined)
    }

    async function getUser(refreshNonce?: boolean) {
        return await apiCall('user_info', undefined)
    }

    // DATABASE FUNCTIONS

    async function saveScore(uuid: UUID, title: string, json: string) {
        return await apiCall('db_score_save', { uuid: uuid, title: title, notation: json })
    }

    async function getScore(uuid: UUID) {
        return await apiCall('db_score_get', { uuid: uuid })
    }

    async function getScoreList() {
        return await apiCall('db_score_list')
    }

    return { user: { login, logout, getUser }, database: { saveScore, getScore, getScoreList } }
}
