const QBIT_TORRENTS_INFOS_ENDPOINT = process.env.QBIT_TORRENTS_INFOS_ENDPOINT
const QBIT_LOGIN_ENDPOINT = process.env.QBIT_LOGIN_ENDPOINT

const QBIT_USERNAME = process.env.QBIT_USERNAME
const QBIT_PASSWORD = process.env.QBIT_PASSWORD

/**
 * Logs in a user by sending their credentials to the specified api/v2/auth.
 *
 * @param {string} username - The username of the user.
 * @param {string} password - The password of the user.
 */
const login = async (username, password) => {
    console.info(`${new Date().toLocaleDateString('fr')}: login`)
    const searchParams = new URLSearchParams()
    searchParams.append("username", username)
    searchParams.append("password", password)
    console.info("searchParams", searchParams)
    const loginHeaders = new Headers()
    loginHeaders.append("Content-Type", "application/x-www-form-urlencoded");

    const logionOptions = {
        method: "POST",
        headers: loginHeaders,
        body: searchParams,
        redirect: "follow"

    }
    const response = await fetch(`${QBIT_LOGIN_ENDPOINT}`, logionOptions);
    if (response.ok) {
        const cookies = response.headers.get('set-cookie');
        return { response, cookies };
    }
    throw new Error('Login failed');
};


/**
 * Get torrentInfos
 *
 * @param {string} cookies
 */
const getTorrentInfos = async (cookies) => {
    console.info(`${new Date().toLocaleDateString('fr')}: getTorrentInfos`)
    const headers = new Headers
    headers.append("Cookie", cookies);
    console.info("headers", headers)

    const options = {
        method: "GET",
        headers: headers,
    }
    const response = await fetch(`${QBIT_TORRENTS_INFOS_ENDPOINT}`, options)
    if (response.ok) {
        return await response.json()
    } else {
        throw Error("Get torrents infos failed")
    }
}

setInterval(async () => {
    const { cookies } = await login(QBIT_USERNAME, QBIT_PASSWORD)
    const torrentsInfos = await getTorrentInfos(cookies)
    console.info(torrentsInfos)
}, 5000)