# Trusted provisioning context: this Dockerfile plus the reviewed package.json
# and pnpm-lock.yaml only. No application source or package-manager hooks.
ARG NODE_IMAGE=docker.io/library/node@sha256:aca79828f8a4afc627f189387c965625bcc419233946210a3b9522d90a59b5c6
FROM docker.io/library/python@sha256:2784af835b90070d9d37d3aa5aa01a3e825d88436b0d58f7776d2cdcb6780f9e AS python-toolchain
FROM ${NODE_IMAGE}
COPY --from=python-toolchain /usr/local/ /usr/local/

USER root
ENV DEBIAN_FRONTEND=noninteractive
RUN /sbin/ldconfig \
    && /usr/local/bin/python3 -c "import sys, ssl, bz2, lzma, sqlite3, ctypes; assert sys.version_info[:2] == (3, 13)" \
    && if ! command -v git >/dev/null; then \
      apt-get update && apt-get install --no-install-recommends -y python3 git \
      && rm -rf /var/lib/apt/lists/*; \
    fi \
    && node --version | grep -E '^v24\.' \
    && python3 --version \
    && git --version \
    && npm install --global --ignore-scripts --no-audit --no-fund pnpm@9.10.0 \
    && test "$(pnpm --version)" = '9.10.0'

WORKDIR /opt/seed
COPY package.json pnpm-lock.yaml ./
RUN env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/tmp/provision-home \
      TMPDIR=/tmp CI=1 npm_config_ignore_scripts=true \
      pnpm install --frozen-lockfile --ignore-scripts --ignore-pnpmfile \
      --store-dir=/tmp/pnpm-store --reporter=append-only \
    && test -f node_modules/jsdom/lib/api.js \
    && test -f node_modules/esbuild/lib/main.js \
    && test -x node_modules/.pnpm/@esbuild+linux-x64@*/node_modules/@esbuild/linux-x64/bin/esbuild \
    && rm -rf /tmp/pnpm-store /tmp/provision-home /root/.npm /root/.cache \
    && mkdir -p /scratch \
    && chmod 1777 /scratch

# Runtime container starts only this trusted idle process. The reviewed
# controller invokes the isolation probe and tests with an empty environment.
WORKDIR /scratch
USER 65534:65534
ENTRYPOINT ["/usr/bin/env", "-i", "PATH=/usr/bin:/bin", "/usr/bin/sleep", "infinity"]
