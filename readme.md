
### Usage with Portainer
```yaml
services:
    qbitcleaner:
        container_name: qbitcleaner
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

