# syntax=docker/dockerfile:1.6

# Base image includes Playwright browsers and all required system deps
ARG BASE_IMAGE="node:20-bookworm"
FROM ${BASE_IMAGE} AS base

# Build metadata (can be overridden at build time)
ARG PROJECT_NAME="coordinated-app-cursor"
ARG IMAGE_VERSION="dev"
ARG BUILD_DATE
ARG GIT_COMMIT

# Expose metadata inside the image as environment variables
ENV IMAGE_PROJECT=${PROJECT_NAME} \
    IMAGE_VERSION=${IMAGE_VERSION} \
    IMAGE_BUILD_DATE=${BUILD_DATE} \
    IMAGE_GIT_COMMIT=${GIT_COMMIT}

# Expose the resolved base image at runtime for diagnostics
ARG BASE_IMAGE
ENV BASE_IMAGE_REF=${BASE_IMAGE}

# OCI labels for traceability
LABEL org.opencontainers.image.title="${PROJECT_NAME}" \
      org.opencontainers.image.version="${IMAGE_VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.source="https://github.com/EtherealVisions/coordinated-app"

# Avoid prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive \
    TZ=UTC \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8

# Workaround builder clock skew against repo Release timestamps
RUN printf 'Acquire::Check-Valid-Until "false";\nAcquire::Check-Date "false";\n' > /etc/apt/apt.conf.d/99-ignore-valid-until

# Install core dev tooling and utilities commonly used by Cursor background agents
# - git, git-lfs, openssh-client: git operations (including LFS) and SSH auth
# - curl, wget, ca-certificates, jq, unzip, zip: scripting utilities
# - python3, python3-pip, python3-venv: node-gyp / scripts / tooling
# - build-essential, pkg-config: native deps compilation
# - dumb-init: proper signal handling for long-running sessions
# - locales, tzdata: stable locale/timezone for deterministic rendering
# - ffmpeg: media handling during E2E tests
# - openssl: useful for Prisma and tooling
# - openjdk-17-jre-headless: WireMock standalone runtime
# - fonts: consistent cross-platform rendering for visual tests
RUN --mount=type=cache,target=/var/cache/apt \
    apt-get update -o Acquire::Check-Valid-Until=false && apt-get install -y --no-install-recommends \
    git git-lfs openssh-client \
    curl wget ca-certificates jq unzip zip \
    python3 python3-pip python3-venv \
    build-essential pkg-config \
    dumb-init \
    locales tzdata \
    ffmpeg \
    openssl \
    openjdk-17-jre-headless \
    fonts-dejavu fonts-liberation fonts-noto fonts-noto-cjk fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/* \
    && git lfs install \
    && locale-gen en_US.UTF-8

# Optional fallback: Install Playwright on non-MCR base images
ARG PLAYWRIGHT_INSTALL_FALLBACK=true
ARG PLAYWRIGHT_VERSION=1.53.1
RUN if [ "${PLAYWRIGHT_INSTALL_FALLBACK}" = "true" ]; then \
      apt-get update -o Acquire::Check-Valid-Until=false \
      && apt-get install -y --no-install-recommends gnupg \
      && rm -rf /var/lib/apt/lists/* \
      && npm config set fund false \
      && npm config set audit false \
      && npm i -g @playwright/test@${PLAYWRIGHT_VERSION} \
      && npx playwright install --with-deps chromium firefox webkit; \
    else \
      echo "Skipping Playwright fallback install (PLAYWRIGHT_INSTALL_FALLBACK=${PLAYWRIGHT_INSTALL_FALLBACK})"; \
    fi

# Install AWS CLI v2 (optional but often needed for CI-like tasks)
ARG AWSCLI_VERSION=2.17.44
RUN --mount=type=cache,target=/root/.cache \
    curl -sSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64-${AWSCLI_VERSION}.zip" -o /tmp/awscliv2.zip \
    && unzip -q /tmp/awscliv2.zip -d /tmp \
    && /tmp/aws/install \
    && rm -rf /tmp/aws /tmp/awscliv2.zip

# Install Google Chrome (amd64 only). On non-amd64 architectures, skip.
RUN if [ "$(dpkg --print-architecture)" = "amd64" ]; then \
      curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor | tee /usr/share/keyrings/google-chrome.gpg >/dev/null \
      && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list' \
      && apt-get update -o Acquire::Check-Valid-Until=false \
      && apt-get install -y --no-install-recommends google-chrome-stable \
      && rm -rf /var/lib/apt/lists/*; \
    else \
      echo "Skipping Google Chrome install on $(dpkg --print-architecture)"; \
    fi

# Install Microsoft Edge (amd64 only). On non-amd64 architectures, skip.
RUN if [ "$(dpkg --print-architecture)" = "amd64" ]; then \
      curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | tee /usr/share/keyrings/microsoft.gpg >/dev/null \
      && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/repos/edge stable main" > /etc/apt/sources.list.d/microsoft-edge.list' \
      && apt-get update -o Acquire::Check-Valid-Until=false \
      && apt-get install -y --no-install-recommends microsoft-edge-stable \
      && rm -rf /var/lib/apt/lists/*; \
    else \
      echo "Skipping Microsoft Edge install on $(dpkg --print-architecture)"; \
    fi

# Make Chrome discoverable for tools like Loki
ENV CHROME_PATH=/usr/bin/google-chrome-stable \
    CHROME_BIN=/usr/bin/google-chrome-stable

# Make Edge discoverable for tools
ENV EDGE_PATH=/usr/bin/microsoft-edge-stable \
    EDGE_BIN=/usr/bin/microsoft-edge-stable

# WireMock standalone (Java) for HTTP API mocking
ARG WIREMOCK_VERSION=3.8.0
RUN mkdir -p /opt/wiremock \
    && curl -fsSL "https://repo1.maven.org/maven2/org/wiremock/wiremock-standalone/${WIREMOCK_VERSION}/wiremock-standalone-${WIREMOCK_VERSION}.jar" -o /opt/wiremock/wiremock-standalone.jar \
    && printf '#!/usr/bin/env bash\nexec java -jar /opt/wiremock/wiremock-standalone.jar "$@"\n' > /usr/local/bin/wiremock \
    && chmod +x /usr/local/bin/wiremock

ENV WIREMOCK_PORT=9090

# Node package management: use corepack to pin pnpm to repo's version
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Match repo's packageManager (pnpm@9.x)
ARG PNPM_VERSION=9.1.0
RUN corepack prepare pnpm@${PNPM_VERSION} --activate

# Vercel CLI for deployments, env pulls, and logs
ARG VERCEL_CLI_VERSION=latest
RUN npm install -g vercel@${VERCEL_CLI_VERSION} \
    && vercel --version

# Phase.dev CLI for secrets management
# Install Phase CLI for fetching secrets from Phase.dev
RUN curl -fsSL https://pkg.phase.dev/install.sh | bash \
    && mv /root/.phase/bin/phase /usr/local/bin/phase \
    && chmod +x /usr/local/bin/phase \
    && phase --version || echo "Phase CLI installed"

# Set workdir where the project will be mounted by Cursor
WORKDIR /workspace

# Create non-root user matching Playwright defaults, ensure permissions
# Ensure 'pwuser' exists when not using the Playwright base image
USER root
RUN if ! id -u pwuser >/dev/null 2>&1; then \
      groupadd -g 1001 pwuser && useradd -m -u 1001 -g 1001 pwuser; \
    fi \
    && mkdir -p /workspace \
    && chown -R 1001:1001 /workspace

# Install a simple helper to print image metadata and key tool versions
RUN <<'SHELL'
set -eu
cat >/usr/local/bin/image-info <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

echo "----- Image Info -----"
printf "Project:      %s\n" "${IMAGE_PROJECT:-unknown}"
printf "Version:      %s\n" "${IMAGE_VERSION:-unknown}"
printf "Build date:   %s\n" "${IMAGE_BUILD_DATE:-unknown}"
printf "Git commit:   %s\n" "${IMAGE_GIT_COMMIT:-unknown}"
printf "Base image:   %s\n" "${BASE_IMAGE_REF:-unknown}"
echo
echo "----- Tool Versions -----"
if command -v node >/dev/null 2>&1; then echo "Node:         $(node --version)"; fi
if command -v pnpm >/dev/null 2>&1; then echo "pnpm:         $(pnpm --version)"; fi
if command -v playwright >/dev/null 2>&1; then echo "Playwright:   $(playwright --version)"; fi
if command -v aws >/dev/null 2>&1; then echo "AWS CLI:      $(aws --version 2>&1)"; fi
if command -v phase >/dev/null 2>&1; then echo "Phase CLI:    $(phase --version 2>&1 | head -1)"; fi
if command -v google-chrome-stable >/dev/null 2>&1; then echo "Chrome:       $(google-chrome-stable --version)"; \
elif command -v google-chrome >/dev/null 2>&1; then echo "Chrome:       $(google-chrome --version)"; \
else echo "Chrome:       not installed"; fi
if command -v microsoft-edge-stable >/dev/null 2>&1; then echo "Edge:         $(microsoft-edge-stable --version)"; \
else echo "Edge:         not installed"; fi
EOF
chmod +x /usr/local/bin/image-info
SHELL
USER pwuser

# Recommended environment for Playwright and Next.js dev
ENV NODE_ENV=development \
    PLAYWRIGHT_BROWSERS_PATH=0 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    TURBO_TELEMETRY_DISABLED=1

# Phase.dev environment variables (set via launch template or runtime)
# These should be injected at container launch, not baked into the image:
# - PHASE_SERVICE_TOKEN: The Phase.dev service token (pss_service:v2:...)
# - PHASE_ENV: Optional environment override (development/staging/production)
# - PHASE_DEBUG: Optional debug flag (true/false)

# Default command keeps container alive for background agents
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["bash", "-lc", "sleep infinity"]
