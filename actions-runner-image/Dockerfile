FROM summerwind/actions-runner-dind:ubuntu-22.04

ENV DEBIAN_FRONTEND=noninteractive

USER root


sudo chmod a+r /etc/apt/keyrings/docker.asc

RUN apt-get update -y \
    && apt-get install -y software-properties-common \
    && add-apt-repository -y ppa:git-core/ppa \
    && add-apt-repository -y ppa:ansible/ansible \
    && apt-get update -y \
    && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    jq \
    sudo \
    unzip \
    zip \
    openssh-client \
    python3-jmespath \
    ansible

RUN install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

RUN apt-get update -y && apt-get install -y --no-install-recommends \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*


RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip -q awscliv2.zip && \
    ./aws/install && rm -rf awscliv2.zip aws

RUN curl -sSL -o /tmp/flux.tar.gz https://github.com/fluxcd/flux2/releases/download/v2.3.0/flux_2.3.0_linux_amd64.tar.gz  && \
    tar -C /tmp -xzf /tmp/flux.tar.gz &&  install -m 755 /tmp/flux /usr/local/bin &&  rm -f flux.tar.gz /tmp/flux

RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

USER runner
