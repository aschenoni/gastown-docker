# gastown-docker: self-contained Dockerfile that clones and builds Gas Town.
# Adds openssh-client, ttyd, tmux mouse scrolling, and the ttyd-mayor wrapper.
FROM docker/sandbox-templates:claude-code

ARG GO_VERSION=1.25.6
ARG GASTOWN_REPO=https://github.com/steveyegge/gastown.git
ARG GASTOWN_REF=main

USER root

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    sqlite3 \
    tmux \
    curl \
    ripgrep \
    zsh \
    gh \
    netcat-openbsd \
    openssh-client \
    tini \
    ttyd \
    vim \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# Install Go from official tarball (apt golang-go is too old)
RUN ARCH=$(dpkg --print-architecture) && \
    curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-${ARCH}.tar.gz" | tar -C /usr/local -xz
ENV PATH="/app/gastown:/usr/local/go/bin:/home/agent/go/bin:${PATH}"

# Install beads (bd) and dolt
RUN curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash
RUN curl -fsSL https://github.com/dolthub/dolt/releases/latest/download/install.sh | bash

# Set up directories
RUN mkdir -p /app /gt && chown agent:agent /app /gt

# Environment setup for bash and zsh
RUN echo 'export PATH="/app/gastown:$PATH"' >> /etc/profile.d/gastown.sh && \
    echo 'export PATH="/app/gastown:$PATH"' >> /etc/zsh/zshenv
RUN echo 'export COLORTERM="truecolor"' >> /etc/profile.d/colorterm.sh && \
    echo 'export COLORTERM="truecolor"' >> /etc/zsh/zshenv
RUN echo 'export TERM="xterm-256color"' >> /etc/profile.d/term.sh && \
    echo 'export TERM="xterm-256color"' >> /etc/zsh/zshenv

# Tmux config: mouse scroll + large history for browser terminals
RUN printf 'set -g history-limit 50000\nset -g mouse on\n' > /root/.tmux.conf && \
    cp /root/.tmux.conf /home/agent/.tmux.conf && chown agent:agent /home/agent/.tmux.conf

# Root-owned wrapper that fixes SSH socket perms then drops to agent
COPY docker-entrypoint-wrapper.sh /app/docker-entrypoint-wrapper.sh
RUN chmod 755 /app/docker-entrypoint-wrapper.sh

USER agent

# Clone and build Gas Town
RUN git clone --depth 1 --branch ${GASTOWN_REF} ${GASTOWN_REPO} /app/gastown && \
    cd /app/gastown && make build

# Copy our entrypoint and ttyd wrapper
COPY --chown=agent:agent docker-entrypoint.sh /app/docker-entrypoint.sh
COPY --chown=agent:agent ttyd-mayor.sh /app/ttyd-mayor.sh
RUN chmod +x /app/docker-entrypoint.sh /app/ttyd-mayor.sh

WORKDIR /gt

ENTRYPOINT ["tini", "--", "/app/docker-entrypoint-wrapper.sh"]
CMD ["sleep", "infinity"]
