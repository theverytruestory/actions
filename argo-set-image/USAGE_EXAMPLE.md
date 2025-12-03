# Пример использования с умолчаниями

## Типичный случай

Если у вас:
- Registry: `registry.truestory.work`
- Имя репозитория в GitHub совпадает с именем в registry
- Используете стандартный `kustomization.yaml`

То достаточно передать **только TAG**:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      TAG: ${{ steps.docker.outputs.TAG }}
    steps:
      - uses: actions/checkout@v4

      - name: Build
        id: docker
        uses: theverytruestory/actions/docker-build-upload@main
        # Выходные переменные:
        # - REPO: registry.truestory.work/myapp
        # - TAG: main-abc123-2025-11-12

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.PAT_TOKEN }}

      - name: Setup tools
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
          tag: ${{ needs.build.outputs.TAG }}  # ← Только TAG!
          argoapp: myapp-prod
          kustomization_path: k0s/apps/myapp/kustomization.yaml
```

## Как это работает

### 1. docker-build-upload генерирует:
- `REPO`: `registry.truestory.work/myapp` (из `registry` + `github.event.repository.name`)
- `TAG`: `main-abc123-2025-11-12` (из `branch` + `sha` + `date`)

### 2. argo-set-image использует умолчания:
- `registry`: `registry.truestory.work` (умолчание)
- `repo`: `myapp` (из `github.event.repository.name`)
- Собирает полный путь: `registry.truestory.work/myapp:main-abc123-2025-11-12`

### 3. Результат - одинаковый образ

**docker-build-upload** собрал:
```
registry.truestory.work/myapp:main-abc123-2025-11-12
```

**argo-set-image** применяет:
```
registry.truestory.work/myapp:main-abc123-2025-11-12
```

✅ Совпадает!

## Когда нужно передавать repo явно

Если имя в registry отличается от имени репозитория GitHub:

```yaml
# GitHub репозиторий: my-awesome-service
# Registry образ: service

jobs:
  build:
    outputs:
      TAG: ${{ steps.docker.outputs.TAG }}
    steps:
      - name: Build
        id: docker
        uses: theverytruestory/actions/docker-build-upload@main
        with:
          repo: service  # ← Явно указываем

  deploy:
    needs: build
    steps:
      - name: Deploy
        uses: theverytruestory/actions/argo-set-image@main
        with:
          repo: service  # ← Должно совпадать!
          tag: ${{ needs.build.outputs.TAG }}
          argoapp: service-prod
```

## Передача outputs между jobs

**ВАЖНО:** Для передачи TAG из build в deploy нужно:

1. Объявить outputs на уровне job:
```yaml
jobs:
  build:
    outputs:
      TAG: ${{ steps.docker.outputs.TAG }}  # ← Обязательно!
```

2. Использовать через needs:
```yaml
  deploy:
    needs: build
    steps:
      - uses: theverytruestory/actions/argo-set-image@main
        with:
          tag: ${{ needs.build.outputs.TAG }}  # ← Через needs!
```

## Структура kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

images:
  - name: registry.truestory.work/myapp  # ← Полный путь
    newTag: main-abc123-2025-11-12       # ← Это обновится

resources:
  - deployment.yaml
  - service.yaml
```

Action найдет образ по `name: registry.truestory.work/myapp` и обновит `newTag`.
