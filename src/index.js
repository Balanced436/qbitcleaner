const { exec } = require('child_process');

/**
 * Read environment variables
 */
const QBIT_PORT = process.env.QBIT_PORT;
const QBIT_IP = process.env.QBIT_IP;
const QBIT_TRACKER_STATUS = process.env.QBIT_TRACKER_STATUS.replaceAll(" ","").split(",").map((state)=>state.toUpperCase());
const QBIT_POLLING_INTERVAL = process.env.QBIT_POLLING_INTERVAL;
const QBIT_USERNAME = process.env.QBIT_USERNAME
const QBIT_PASSWORD = process.env.QBIT_PASSWORD


/**
 * Check that env variables are provided
 */
const requiredEnvVars = {
    QBIT_IP: "the IP address of the qBittorrent instance",
    QBIT_PORT: "the port of the qBittorrent instance",
    QBIT_TRACKER_STATUS: "the tracker status to filter torrents",
    QBIT_POLLING_INTERVAL: "the polling interval in minutes",
    QBIT_USERNAME: "the username for qBittorrent authentication",
    QBIT_PASSWORD: "the password for qBittorrent authentication"
};

/**
 * Notify about missing environment variables
 */
for (const [key, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key}. Please set it to ${description}.`);
        process.exit(1);
    }
}

const QBIT_TORRENTS_INFOS_ENDPOINT = `http://${QBIT_IP}:${QBIT_PORT}/api/v2/torrents/info`
const QBIT_LOGIN_ENDPOINT = `http://${QBIT_IP}:${QBIT_PORT}/api/v2/auth/login`

console.info("QBIT_TORRENTS_INFOS_ENDPOINT", QBIT_TORRENTS_INFOS_ENDPOINT)
console.info("QBIT_LOGIN_ENDPOINT", QBIT_LOGIN_ENDPOINT)

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
    const torrentsInfos = await getTorrentInfos(cookies);

    if (!Array.isArray(torrentsInfos)) {
        throw new Error("Expected torrentsInfos to be an array");
    }

    const filteredTorrents = torrentsInfos.filter((torrentInfo)=>QBIT_TRACKER_STATUS.includes(torrentInfo.state.toUpperCase()))
    if (filteredTorrents.length > 0){
        exec('docker restart qbittorrent', (error, stdout, stderr) => {
            if (error) {
              console.error(`exec error: ${error}`);
              return;
            }
            console.log(`stdout: ${stdout}`);
            console.error(`stderr: ${stderr}`);
          });
    }
    console.info(filteredTorrents.map((torrent)=>torrent.name))
}, QBIT_POLLING_INTERVAL * 1000)
