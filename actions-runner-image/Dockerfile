FROM ghcr.io/actions/actions-runner:latest

ENV DEBIAN_FRONTEND=noninteractive
USER root

COPY root-ca.pem /usr/local/share/ca-certificates/ttf-root-ca.crt
RUN update-ca-certificates

COPY version.json /tmp/version.json

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

RUN install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" |  tee /etc/apt/sources.list.d/docker.list > /dev/null

RUN apt-get update -y && apt-get install -y --no-install-recommends \
    zip \
    openssh-client \
    python3-jmespath \
    python3-pip \
    ansible \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin \
    nodejs \
    s3cmd \
    postgresql-client-16 \
    && rm -rf /var/lib/apt/lists/*

#RUN python3 -m pip install --break-system-packages kubernetes GitPython

RUN npm install -g npm@latest && \
    npm install -g yarn
#
RUN curl -sSL -o kctlver https://dl.k8s.io/release/stable.txt && \
    curl -sSL -o kubectl "https://dl.k8s.io/release/$(cat kctlver)/bin/linux/amd64/kubectl" && \
    install  -m 555 kubectl /usr/local/bin/kubectl && rm kubectl kctlver

RUN curl -sSL -o argover https://raw.githubusercontent.com/argoproj/argo-cd/stable/VERSION && \
    curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/download/v$(cat argover)/argocd-linux-amd64 && \
    install -m 555 argocd-linux-amd64 /usr/local/bin/argocd && rm argocd-linux-amd64 argover

RUN curl -sSL -o yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 && \
    install -m 555 yq /usr/local/bin/yq && rm yq

USER runner

ENTRYPOINT ["/bin/bash", "-c"]
CMD ["entrypoint.sh"]
