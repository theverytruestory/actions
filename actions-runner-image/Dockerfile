FROM summerwind/actions-runner-dind:ubuntu-22.04

ENV DEBIAN_FRONTEND=noninteractive

USER root

RUN apt-get update -y \
    && apt-get install -y software-properties-common \
    && add-apt-repository -y ppa:git-core/ppa \
    && apt-get update -y \
    && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    jq \
    sudo \
    unzip \
    zip \
    && rm -rf /var/lib/apt/lists/*


RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip -q awscliv2.zip && \
    ./aws/install && rm -rf awscliv2.zip aws

RUN curl -sSL -o /tmp/flux.tar.gz https://github.com/fluxcd/flux2/releases/download/v2.3.0/flux_2.3.0_linux_amd64.tar.gz  && \
    tar -C /tmp -xzf /tmp/flux.tar.gz &&  install -m 755 /tmp/flux /usr/local/bin &&  rm -f flux.tar.gz /tmp/flux

RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

USER runner