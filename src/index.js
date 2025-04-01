const { exec } = require('child_process');

/**
 * Read environment variables
 */
const QBIT_PORT = process.env.QBIT_PORT;
const QBIT_IP = process.env.QBIT_IP;
const QBIT_TRACKER_STATUS = process.env.QBIT_TRACKER_STATUS.replaceAll(" ", "").split(",").map((state) => state.toUpperCase());
const QBIT_POLLING_INTERVAL = process.env.QBIT_POLLING_INTERVAL;
const QBIT_USERNAME = process.env.QBIT_USERNAME
const QBIT_PASSWORD = process.env.QBIT_PASSWORD
const QBIT_CONTAINER_NAME = process.env.QBIT_CONTAINER_NAME


/**
 * Check that env variables are provided
 */
const requiredEnvVars = {
    QBIT_IP: "the IP address of the qBittorrent instance",
    QBIT_PORT: "the port of the qBittorrent instance",
    QBIT_TRACKER_STATUS: "the tracker status to filter torrents",
    QBIT_POLLING_INTERVAL: "the polling interval in minutes",
    QBIT_USERNAME: "the username for qBittorrent authentication",
    QBIT_PASSWORD: "the password for qBittorrent authentication",
    QBIT_CONTAINER_NAME: "the qbit container name"
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

/**
 * Logs in a user by sending their credentials to the specified api/v2/auth.
 *
 * @param {string} username - The username of the user.
 * @param {string} password - The password of the user.
 */
const login = async (username, password) => {
    try {
        console.info(`${new Date().toLocaleString()}: Attempting to connect to ${QBIT_LOGIN_ENDPOINT} with provided credentials`);
        const searchParams = new URLSearchParams();
        searchParams.append("username", username);
        searchParams.append("password", password);
    
        const loginHeaders = new Headers();
        loginHeaders.append("Content-Type", "application/x-www-form-urlencoded");
    
        const logionOptions = {
            method: "POST",
            headers: loginHeaders,
            body: searchParams,
            redirect: "follow"
        };
    
        const response = await fetch(`${QBIT_LOGIN_ENDPOINT}`, logionOptions);
        if (response.ok) {
            const cookies = response.headers.get('set-cookie');
            if (!cookies) {
                throw new Error("INVALID_CREDENTIALS");
            }
            return { response, cookies };
        }
    } catch (error) {
        if (error.message === "INVALID_CREDENTIALS") {
            throw new Error(`${new Date().toLocaleString()}: Invalid credentials provided`);
        } else{
            throw new Error(`${new Date().toLocaleString()}: QBIT is not reachable`);
        } 
    }
};


/**
 * Get torrentInfos
 *
 * @param {string} cookies
 */
const getTorrentInfos = async (cookies) => {
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
        throw Error(`${new Date().toLocaleString()}: get torrents info failed`)
    }
}

const restartDockerContainer = ()=>{
    return new Promise((resolve, reject) => {
        exec(`docker restart ${QBIT_CONTAINER_NAME}`, (error, stdout, stderr) => {
            if (error) {
                resolve(1)
            } else {
                resolve(0)
            }
        });
    })

}

setInterval(async () => {
    try {
        const { cookies } = await login(QBIT_USERNAME, QBIT_PASSWORD)
        console.info(`${new Date().toLocaleString()}: Successfully connected as ${QBIT_USERNAME}`)
        const torrentsInfos = await getTorrentInfos(cookies);
        const filteredTorrents = torrentsInfos.filter((torrentInfo) => QBIT_TRACKER_STATUS.includes(torrentInfo.state.toUpperCase()))
        if (filteredTorrents.length > 0) {
            console.info(`${new Date().toLocaleString()}: Found ${filteredTorrents.length} Torrent(s) matching the specified tracker statuses.`)
            console.info(`${new Date().toLocaleString()}: ${filteredTorrents.map((torrent) => torrent.name)}`)
            console.info(`${new Date().toLocaleString()}: the container ${QBIT_CONTAINER_NAME} will restart`)
            const error = await restartDockerContainer()
            if (error) {
                throw Error(`${new Date().toLocaleString()}: Failed to restart the container ${QBIT_CONTAINER_NAME}`)
            }else {
                console.info(`${new Date().toLocaleString()}: Successfully restarted the container ${QBIT_CONTAINER_NAME}\n`)
            }
        } else{
            console.info(`${new Date().toLocaleString()}: No torrents matched the specified tracker statuses :(${QBIT_TRACKER_STATUS})\n`)
        }
    } catch (error) {
        console.error(`${error}\n`)
    }

}, QBIT_POLLING_INTERVAL * 5000)
