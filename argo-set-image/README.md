# ArgoCD Set Image Action

GitHub Action для безопасного деплоя Docker образов через ArgoCD с автоматическим откатом.

## Как это работает

1. ✅ Устанавливает `kustomize-image` параметр в ArgoCD (без коммита в Git)
2. ⏳ Ждет стабилизации приложения
3. ✅ Если стабилизировалось:
   - Коммитит изменение в `kustomization.yaml`
   - Обновляет `images[].newTag` для нужного образа
4. ❌ Если не стабилизировалось:
   - Откатывает изменения через `unset kustomize-image`
   - Проверяет что откат прошел успешно
   - Выводит статус в `GITHUB_STEP_SUMMARY`
   - Завершается с ошибкой

## Inputs

| Параметр | Обязательный | По умолчанию | Описание |
|----------|--------------|--------------|----------|
| `registry` | ❌ Нет | `registry.truestory.work` | Docker registry |
| `repo` | ❌ Нет | `github.event.repository.name` | Repository name (без registry) |
| `tag` | ✅ Да | - | Docker image tag (передается из docker-build-upload) |
| `argoapp` | ✅ Да | - | Имя ArgoCD приложения |
| `kustomization_path` | ❌ Нет | `kustomization.yaml` | Путь к kustomization.yaml файлу |
| `image_name` | ❌ Нет | `<registry>/<repo>` | Имя образа в kustomization.yaml (по умолчанию = полный путь) |
| `timeout` | ❌ Нет | `2m` | Таймаут ожидания стабилизации (например, `5m`, `300s`) |
| `git_user_name` | ❌ Нет | `github-actions[bot]` | Git user name для коммита |
| `git_user_email` | ❌ Нет | `github-actions[bot]@users.noreply.github.com` | Git user email для коммита |

## Outputs

| Параметр | Описание |
|----------|----------|
| `status` | Статус деплоя: `success` или `failed` |

## Требования

### 1. ArgoCD CLI

Action требует установленный `argocd` CLI в runner. Пример установки:

```yaml
- name: Install ArgoCD CLI
  run: |
    curl -sSL -o /usr/local/bin/argocd \
      https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
    chmod +x /usr/local/bin/argocd
```

### 2. yq

Для редактирования YAML файлов:

```yaml
- name: Install yq
  run: |
    wget -qO /usr/local/bin/yq \
      https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
    chmod +x /usr/local/bin/yq
```

### 3. Git права

Для коммита изменений нужен токен с правами на push:

```yaml
- name: Checkout
  uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}
```

### 4. KUBECONFIG

ArgoCD CLI работает в режиме `--core`, который требует доступ к Kubernetes:

```yaml
- name: Setup kubeconfig
  run: |
    mkdir -p ~/.kube
    echo "${{ secrets.KUBECONFIG }}" > ~/.kube/config
```

## Примеры использования

### Минимальный пример (с умолчаниями)

Если имя репозитория GitHub совпадает с именем в registry:

```yaml
- name: Deploy to ArgoCD
  uses: theverytruestory/actions/argo-set-image@main
  with:
    tag: main-a1b2c3d-2025-11-12  # Только tag обязателен!
    argoapp: myapp-prod
    # registry: registry.truestory.work (по умолчанию)
    # repo: myapp (из github.event.repository.name)
```

### Кастомное имя репозитория

```yaml
- name: Deploy to ArgoCD
  uses: theverytruestory/actions/argo-set-image@main
  with:
    repo: custom-name  # Без registry, только имя
    tag: main-a1b2c3d-2025-11-12
    argoapp: myapp-prod
    # Результат: registry.truestory.work/custom-name:main-a1b2c3d-2025-11-12
```

### Полный пример workflow (2 jobs)

```yaml
name: Build and Deploy

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

      - name: Setup kubeconfig
        run: |
          mkdir -p ~/.kube
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > ~/.kube/config

      - name: Install tools
        run: |
          curl -sSL -o /usr/local/bin/argocd \
            https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x /usr/local/bin/argocd
          wget -qO /usr/local/bin/yq \
            https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
          chmod +x /usr/local/bin/yq

      - name: Deploy to ArgoCD
        uses: theverytruestory/actions/argo-set-image@main
        with:
          tag: ${{ needs.build.outputs.TAG }}  # Только TAG из build job
          argoapp: myapp-prod
          kustomization_path: k0s/apps/myapp/kustomization.yaml
          # registry и repo используют умолчания
```

### Один job (упрощенный)

```yaml
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.PAT_TOKEN }}
          fetch-depth: 0

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

      - name: Build
        id: docker
        uses: theverytruestory/actions/docker-build-upload@main

      - name: Deploy
        uses: theverytruestory/actions/argo-set-image@main
        with:
          tag: ${{ steps.docker.outputs.TAG }}
          argoapp: myapp-prod
          kustomization_path: k0s/apps/myapp/kustomization.yaml
```

### С кастомным image_name

Если в `kustomization.yaml` имя образа отличается от repo:

```yaml
# kustomization.yaml
images:
  - name: myapp  # короткое имя
    newName: registry.truestory.work/myapp
    newTag: v1.0.0
```

```yaml
- uses: theverytruestory/actions/argo-set-image@main
  with:
    repo: registry.truestory.work/myapp
    tag: v1.0.1
    argoapp: myapp-prod
    image_name: myapp  # Указываем короткое имя
```

### С разными окружениями

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      # ... build steps ...

      - name: Deploy to staging
        uses: theverytruestory/actions/argo-set-image@main
        with:
          repo: ${{ steps.docker.outputs.REPO }}
          tag: ${{ steps.docker.outputs.TAG }}
          argoapp: myapp-staging
          kustomization_path: k0s/apps/myapp-staging/kustomization.yaml

  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      # ... build steps ...

      - name: Deploy to production
        uses: theverytruestory/actions/argo-set-image@main
        with:
          repo: ${{ steps.docker.outputs.REPO }}
          tag: ${{ steps.docker.outputs.TAG }}
          argoapp: myapp-prod
          kustomization_path: k0s/apps/myapp-prod/kustomization.yaml
          timeout: 15m  # Больше таймаут для прода
```

## Структура kustomization.yaml

Action ожидает что `kustomization.yaml` имеет секцию `images`:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

images:
  - name: registry.truestory.work/myapp
    newTag: main-abc123-2025-11-12

resources:
  - deployment.yaml
```

Action обновит `newTag` для образа с именем, совпадающим с `inputs.repo` (или `inputs.image_name`).

## Логика коммита

После успешного деплоя action создаст коммит вида:

```
chore: update myapp-prod image to main-abc123-2025-11-12

Image: registry.truestory.work/myapp:main-abc123-2025-11-12
ArgoCD app: myapp-prod

🤖 Generated by GitHub Actions
```

**Важно**: Этот коммит не повлияет на ArgoCD, т.к. образ уже применен через параметр `kustomize-image`.

## Откат при проблемах

Если приложение не стабилизировалось в течение `timeout`, action:

1. Выполнит `argocd app unset ... --kustomize-image`
2. Дождется возврата к предыдущему состоянию
3. Выведет статус в `GITHUB_STEP_SUMMARY`:

```
## ArgoCD App Status: myapp-prod

**Image**: `registry.truestory.work/myapp:bad-version`

[статус приложения]

## 🔄 Rollback Status
✅ Successfully rolled back to previous version
```

4. Завершится с ошибкой (exit code 1)

## Troubleshooting

### ArgoCD CLI не найден

```
❌ ERROR: argocd CLI not found
```

**Решение**: Установите ArgoCD CLI перед использованием action (см. раздел "Требования").

### yq не найден

```
❌ ERROR: yq not found (required for YAML editing)
```

**Решение**: Установите yq (см. раздел "Требования").

### Нет прав на push

```
remote: Permission to owner/repo.git denied
```

**Решение**: Используйте токен с правами на push:

```yaml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.PAT_TOKEN }}
```

### kustomization.yaml не найден

```
❌ ERROR: kustomization.yaml not found at path/to/file
```

**Решение**: Проверьте параметр `kustomization_path` и убедитесь что файл существует в репозитории.

### Образ не найден в kustomization.yaml

Если `yq` не нашел образ с нужным именем, файл не изменится.

**Решение**:
1. Проверьте что в `kustomization.yaml` есть секция `images`
2. Убедитесь что `name` совпадает с `inputs.repo` (или используйте `image_name`)

## Безопасность

### Secrets

**НЕ** передавайте чувствительные данные через inputs напрямую:

```yaml
# ❌ Плохо
- uses: theverytruestory/actions/argo-set-image@main
  with:
    repo: ${{ secrets.DOCKER_REGISTRY }}/myapp  # Может попасть в логи
```

```yaml
# ✅ Хорошо
- uses: theverytruestory/actions/argo-set-image@main
  with:
    repo: registry.truestory.work/myapp
```

### KUBECONFIG

Храните KUBECONFIG в secrets и настраивайте его перед использованием action.

## Лицензия

Внутренний action для theverytruestory организации.