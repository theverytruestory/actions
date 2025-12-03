# Quick Start - ArgoCD Set Image Action

## Минимальный пример (с умолчаниями)

```yaml
- uses: theverytruestory/actions/argo-set-image@main
  with:
    tag: main-abc123-2025-11-12  # Только TAG обязателен!
    argoapp: myapp-prod
    # registry: registry.truestory.work (умолчание)
    # repo: <github.event.repository.name> (умолчание)
```

## Подготовка runner

```yaml
# 1. Checkout с правами на push
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.PAT_TOKEN }}

# 2. Setup kubeconfig
- run: |
    mkdir -p ~/.kube
    echo "${{ secrets.KUBECONFIG }}" | base64 -d > ~/.kube/config

# 3. Install ArgoCD CLI
- run: |
    curl -sSL -o /usr/local/bin/argocd \
      https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
    chmod +x /usr/local/bin/argocd

# 4. Install yq
- run: |
    wget -qO /usr/local/bin/yq \
      https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
    chmod +x /usr/local/bin/yq
```

## Полный workflow (2 jobs - рекомендуется)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      TAG: ${{ steps.docker.outputs.TAG }}
    steps:
      - uses: actions/checkout@v4

      - name: Build and push
        id: docker
        uses: theverytruestory/actions/docker-build-upload@main

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.PAT_TOKEN }}

      - name: Setup
        run: |
          mkdir -p ~/.kube
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > ~/.kube/config
          curl -sSL -o /usr/local/bin/argocd \
            https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x /usr/local/bin/argocd
          wget -qO /usr/local/bin/yq \
            https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
          chmod +x /usr/local/bin/yq

      - name: Deploy
        uses: theverytruestory/actions/argo-set-image@main
        with:
          tag: ${{ needs.build.outputs.TAG }}  # Из outputs предыдущего job
          argoapp: myapp-prod
          kustomization_path: k0s/apps/myapp/kustomization.yaml
```

## Требуемые secrets

```bash
# GitHub repository secrets:
PAT_TOKEN      # Personal Access Token с правами на push
KUBECONFIG     # Base64-encoded kubeconfig файл
```

Создание KUBECONFIG secret:
```bash
cat ~/.kube/config | base64 -w 0
# Скопируйте вывод в GitHub Secrets
```

## Что делает action

1. ✅ `argocd app set <app> --kustomize-image=<image>`
2. ⏳ Ждет здоровья приложения (по умолчанию 2 минуты)
3. ✅ Коммитит изменения в `kustomization.yaml`
4. ❌ Или откатывает через `argocd app unset` если не стабилизировалось

## Параметры

### Обязательные
- `tag` - Docker image tag (передается из docker-build-upload)
- `argoapp` - ArgoCD application name

### Опциональные (умолчания)
- `registry` (default: `registry.truestory.work`)
- `repo` (default: `github.event.repository.name`)
- `kustomization_path` (default: `kustomization.yaml`)
- `timeout` (default: `2m`)
- `image_name` (default: `<registry>/<repo>`)

## Структура kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

images:
  - name: registry.truestory.work/myapp
    newTag: main-abc123-2025-11-12  # <-- Это будет обновлено

resources:
  - deployment.yaml
```

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| `argocd CLI not found` | Установите ArgoCD CLI (см. setup выше) |
| `yq not found` | Установите yq (см. setup выше) |
| `Permission denied` | Используйте PAT_TOKEN в checkout |
| `kustomization.yaml not found` | Проверьте `kustomization_path` |
| `App failed to stabilize` | Проверьте логи pod'ов, увеличьте `timeout` |

## Проверка локально

```bash
# Проверить что ArgoCD видит приложение
argocd --core app get myapp-prod

# Проверить текущий образ
argocd --core app get myapp-prod -o yaml | grep image:

# Установить образ вручную
argocd --core app set myapp-prod \
  --kustomize-image=registry.truestory.work/myapp:test-tag

# Откатить
argocd --core app unset myapp-prod \
  --kustomize-image=registry.truestory.work/myapp:test-tag
```