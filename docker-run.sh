docker run \
    -p 7080:7080 \
    --env-file "$(pwd)"/.env \
    --mount type=bind,source="$(pwd)"/.keys,target=/usr/src/app/.keys,readonly \
    -d lachee/webhook-publisher