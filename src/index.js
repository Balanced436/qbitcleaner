const { exec } = require('child_process');

/**
 * Read environment variables
 */
const QBIT_PORT = process.env.QBIT_PORT;
const QBIT_IP = process.env.QBIT_IP;
const QBIT_TRACKER_STATUS = process.env.QBIT_TRACKER_STATUS.replaceAll(" ", "").split(",").map((state) => state.toUpperCase());
const QBIT_POLLING_INTERVAL = process.env.QBIT_POLLING_INTERVAL;
const QBIT_USERNAME = process.env.QBIT_USERNAME;
const QBIT_PASSWORD = process.env.QBIT_PASSWORD;
const QBIT_CONTAINER_NAME = process.env.QBIT_CONTAINER_NAME;
const DISCORD_API_WEBHOOK = process.env.DISCORD_API_WEBHOOK;
const QBIT_EXCLUDE_TAG = process.env.QBIT_EXCLUDE_TAG ? process.env.QBIT_EXCLUDE_TAG.replaceAll(" ", "").split(",").map((tag) => tag.toUpperCase()) : [''];

console.info("QBIT_PORT:", QBIT_PORT);
console.info("QBIT_IP:", QBIT_IP);
console.info("QBIT_TRACKER_STATUS:", QBIT_TRACKER_STATUS);
console.info("QBIT_POLLING_INTERVAL:", QBIT_POLLING_INTERVAL);
console.info("QBIT_USERNAME:", QBIT_USERNAME);
console.info("QBIT_PASSWORD:", "*****");
console.info("QBIT_CONTAINER_NAME:", QBIT_CONTAINER_NAME);
console.info("DISCORD_API_WEBHOOK:", DISCORD_API_WEBHOOK);
console.info("QBIT_EXCLUDE_TAG:", QBIT_EXCLUDE_TAG);

const RED = 16711680
const GREEN = 5763719

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
        } else {
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
        throw Error(`${new Date().toLocaleString()}: Get torrents info failed`)
    }
}

const restartDockerContainer = () => {
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

const sendMessageToDiscord = async (message, url, color) => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const raw = JSON.stringify({
        "embeds": [
            {
                "description": message,
                "color": color
            }
        ]
    });

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
    };


    try {
        const response = await fetch(url, requestOptions)
        if (!response.status === 204) {
            throw Error("NOT_VALID")
        }
        return response.status

    } catch (error) {
        throw Error(`${new Date().toLocaleString()}: An error occurred while sending a message to Discord: ${error.message}`);
    }

}

setInterval(async () => {
    try {
        const { cookies } = await login(QBIT_USERNAME, QBIT_PASSWORD)
        console.info(`${new Date().toLocaleString()}: Successfully connected as ${QBIT_USERNAME}`)
        const torrentsInfos = await getTorrentInfos(cookies);
        const filteredTorrents = torrentsInfos.filter((torrentInfo) =>
            QBIT_TRACKER_STATUS.includes(torrentInfo.state.toUpperCase()) &&
            !(QBIT_EXCLUDE_TAG &&
                QBIT_EXCLUDE_TAG.some((tag) =>
                    torrentInfo.tags.replaceAll(" ", "").split(",").map((torrentTag) => torrentTag.toUpperCase()).includes(tag)
                )
            )
        );
        if (filteredTorrents.length > 0) {
            console.info(`${new Date().toLocaleString()}: Excluded tags ${QBIT_EXCLUDE_TAG}`)
            console.info(`${new Date().toLocaleString()}: Found ${filteredTorrents.length} Torrent(s) matching the specified tracker statuses.`)
            console.info(`${new Date().toLocaleString()}: ${filteredTorrents.map((torrent) => torrent.name)}`)
            console.info(`${new Date().toLocaleString()}: the container ${QBIT_CONTAINER_NAME} will restart`)

            // send messages to discord
            if (DISCORD_API_WEBHOOK) {
                try {
                    console.info(`${new Date().toLocaleString()}: Trying to send a notification to discord\n`)
                    const formattedTorrents = filteredTorrents.map((torrent) => `**Name:** ${torrent.name}\n**Hash:** ${torrent.hash}\n**State:** ${torrent.state}\n**Tags:** ${torrent.tags ? torrent.tags : "No tags"}\n`).join("\n")
                    await sendMessageToDiscord(`**Blocked torrents detected on qBittorrent instance ${QBIT_IP}**:\n ${formattedTorrents}`, DISCORD_API_WEBHOOK, RED)
                    console.info(`${new Date().toLocaleString()}: Successfully notified Discord\n`)
                } catch (error) {
                    console.error(`${error}\n`)
                }
            }
            // try to restart docker container
            const error = await restartDockerContainer()
            if (error) {
                await sendMessageToDiscord(`Failed to restart ${QBIT_CONTAINER_NAME} on ${QBIT_IP}`, DISCORD_API_WEBHOOK, RED)
                throw Error(`${new Date().toLocaleString()}: Failed to restart the container ${QBIT_CONTAINER_NAME}`)
            } else {
                await sendMessageToDiscord(`Successfully restarted ${QBIT_CONTAINER_NAME} on ${QBIT_IP}`, DISCORD_API_WEBHOOK, GREEN)
                console.info(`${new Date().toLocaleString()}: Successfully restarted the container ${QBIT_CONTAINER_NAME}\n`)
            }
        } else {
            console.info(`${new Date().toLocaleString()}: No torrents matched the specified tracker statuses :(${QBIT_TRACKER_STATUS})\n`)
        }
    } catch (error) {
        console.error(`${error}\n`)
    }

}, QBIT_POLLING_INTERVAL * 1000 * 60)
