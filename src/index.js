const QBIT_TORRENTS_INFOS_ENDPOINT = process.env.QBIT_TORRENTS_INFOS_ENDPOINT
const QBIT_LOGIN_ENDPOINT = process.env.QBIT_LOGIN_ENDPOINT

const QBIT_USERNAME = process.env.QBIT_USERNAME
const QBIT_PASSWORD = process.env.QBIT_PASSWORD

const searchParams = new URLSearchParams()
searchParams.append("username",QBIT_USERNAME)
searchParams.append("password",QBIT_PASSWORD)
console.info("searchParams",searchParams)
const loginHeaders = new Headers()
loginHeaders.append("Content-Type", "application/x-www-form-urlencoded");

const logionOptions = {
    method: "POST",
    headers: loginHeaders,
    body: searchParams,
    redirect: "follow"

}

const login = async (options) => {
    const response = await fetch(`${QBIT_LOGIN_ENDPOINT}`, options);
    if (response.ok) {
        const cookies = response.headers.get('set-cookie');
        return { response, cookies };
    }
    throw new Error('Login failed');
};


setInterval(async ()=>{
    await login(logionOptions)
},5000)