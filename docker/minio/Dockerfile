FROM chainguard/minio-client:latest AS mc
FROM alpine:latest
COPY --from=mc /usr/bin/mc /usr/bin/mc
RUN apk add --no-cache curl

ENTRYPOINT ["/bin/sh"]

