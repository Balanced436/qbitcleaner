## Qbitfixer

Qbitfixer is a script designed to monitor and restart a qBittorrent container automatically.

### Usage with Portainer

Follow these steps to set up Qbitfixer using Portainer:

#### Step 1: Create a Stack with the Following Docker Compose File

```yaml
services:
    qbitcleaner:
        container_name: qbitfixer
        image: said287/qbitfixer
        environment:
            QBIT_USERNAME: "${QBIT_USERNAME}" # qBittorrent username
            QBIT_PASSWORD: "${QBIT_PASSWORD}" # qBittorrent password
            QBIT_PORT: "${QBIT_PORT}"         # qBittorrent web UI port
            QBIT_IP: "${QBIT_IP}"             # qBittorrent IP address
            QBIT_TRACKER_STATUS: "${QBIT_TRACKER_STATUS}" # Tracker status to filter
            QBIT_POLLING_INTERVAL: "${QBIT_POLLING_INTERVAL}" # Polling interval in seconds
            QBIT_CONTAINER_NAME: "${QBIT_CONTAINER_NAME}" # Name of the qBittorrent container
            DISCORD_API_WEBHOOK: "${DISCORD_API_WEBHOOK}" # Discord webhook URL for notifications
        ports:
            - 8001:8001
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock
        restart: unless-stopped
```

#### Step 2: Prepare the Environment Variables File

Create an `.env` file with the following content and upload it to your stack:

```env
QBIT_USERNAME=           # Your qBittorrent username
QBIT_PASSWORD=           # Your qBittorrent password
QBIT_PORT=               # The port for the qBittorrent web UI
QBIT_IP=                 # The IP address of your qBittorrent instance
QBIT_TRACKER_STATUS=     # Tracker status to filter
QBIT_POLLING_INTERVAL=   # Polling interval in minutes
QBIT_CONTAINER_NAME=     # The name of your qBittorrent container
DISCORD_API_WEBHOOK=     # Discord webhook URL for notifications
```