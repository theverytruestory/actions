# Bash vs JavaScript Actions - Сравнение

## GITHUB_STEP_SUMMARY: Bash (текущая реализация)

```bash
echo "## ArgoCD App Status: ${{ inputs.argoapp }}" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "**Image**: \`${{ env.IMAGE_FULL }}\`" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo '```' >> $GITHUB_STEP_SUMMARY
cat /tmp/argocd-status.txt >> $GITHUB_STEP_SUMMARY
echo '```' >> $GITHUB_STEP_SUMMARY

# Или еще хуже с heredoc:
cat >> $GITHUB_STEP_SUMMARY <<EOF
## ✅ Deployment Successful

- **Image**: \`${IMAGE_FULL}\`
- **App**: ${argoapp}
- **Status**: Healthy

EOF
```

**Проблемы:**
- 😱 Множество `echo >> $GITHUB_STEP_SUMMARY`
- 🤮 Heredoc с экранированием backticks
- 😭 Сложно читать и поддерживать
- ⚠️ Легко забыть `>>` и перезаписать файл

---

## GITHUB_STEP_SUMMARY: JavaScript

```javascript
const core = require('@actions/core');

await core.summary
  .addHeading('✅ Deployment Successful', 2)
  .addRaw('')
  .addList([
    `**Image**: \`${imageFull}\``,
    `**App**: ${argoapp}`,
    `**Status**: Healthy`
  ])
  .addRaw('')
  .addHeading('ArgoCD App Status', 3)
  .addCodeBlock(appStatus, 'yaml')
  .write();
```

**Преимущества:**
- ✅ Читаемый fluent API
- ✅ Template literals без экранирования
- ✅ Типизированные методы
- ✅ Невозможно случайно перезаписать файл

---

## Полное сравнение

### Bash
```bash
- name: Get app status for summary
  if: always()
  shell: bash
  run: |
    echo "## ArgoCD App Status: ${{ inputs.argoapp }}" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY
    echo "**Image**: \`${{ env.IMAGE_FULL }}\`" >> $GITHUB_STEP_SUMMARY
    echo "" >> $GITHUB_STEP_SUMMARY

    argocd --core app get ${{ inputs.argoapp }} > /tmp/argocd-status.txt || true

    echo '```' >> $GITHUB_STEP_SUMMARY
    cat /tmp/argocd-status.txt >> $GITHUB_STEP_SUMMARY
    echo '```' >> $GITHUB_STEP_SUMMARY

- name: Rollback on failure
  if: failure()
  shell: bash
  run: |
    echo "🔄 Rolling back: unsetting kustomize-image"

    argocd --core app unset ${{ inputs.argoapp }} \
      --kustomize-image="${{ env.IMAGE_FULL }}"

    if argocd --core app wait ${{ inputs.argoapp }} --timeout 2m --health; then
      echo "✅ Rollback successful"
      echo "" >> $GITHUB_STEP_SUMMARY
      echo "## 🔄 Rollback Status" >> $GITHUB_STEP_SUMMARY
      echo "✅ Successfully rolled back to previous version" >> $GITHUB_STEP_SUMMARY
    else
      echo "❌ Rollback failed - manual intervention required!"
      echo "" >> $GITHUB_STEP_SUMMARY
      echo "## ⚠️ Rollback Failed" >> $GITHUB_STEP_SUMMARY
      echo "❌ Manual intervention required!" >> $GITHUB_STEP_SUMMARY
    fi

    exit 1
```

### JavaScript

```javascript
// Одна функция делает все
async function handleDeployment(argoapp, imageFull) {
  try {
    // Set image
    await exec.exec('argocd', ['--core', 'app', 'set', argoapp, '--kustomize-image', imageFull]);

    // Wait for health
    await exec.exec('argocd', ['--core', 'app', 'wait', argoapp, '--timeout', '2m', '--health']);

    // Get status
    const appStatus = await getAppStatus(argoapp);

    // Write summary - КРАСИВО!
    await core.summary
      .addHeading('✅ Deployment Successful', 2)
      .addRaw('')
      .addList([
        `**Image**: \`${imageFull}\``,
        `**App**: ${argoapp}`
      ])
      .addRaw('')
      .addCodeBlock(appStatus, 'yaml')
      .write();

    return { success: true };

  } catch (error) {
    // Rollback
    await exec.exec('argocd', ['--core', 'app', 'unset', argoapp, '--kustomize-image', imageFull]);

    const rollbackSuccess = await waitForHealth(argoapp);
    const appStatus = await getAppStatus(argoapp);

    // Write summary - ВСЕ ЕЩЕ КРАСИВО!
    await core.summary
      .addHeading('❌ Deployment Failed', 2)
      .addRaw('')
      .addList([`**Image**: \`${imageFull}\``, `**App**: ${argoapp}`])
      .addRaw('')
      .addCodeBlock(appStatus, 'yaml')
      .addRaw('')
      .addHeading(rollbackSuccess ? '🔄 Rollback Successful' : '⚠️ Rollback Failed', 3)
      .addRaw(rollbackSuccess
        ? '✅ Successfully rolled back to previous version'
        : '❌ Manual intervention required!')
      .write();

    throw error;
  }
}
```

---

## Другие преимущества JS

### 1. Переменные и константы
```javascript
// JS
const REGISTRY = core.getInput('registry') || 'registry.truestory.work';
const REPO = core.getInput('repo') || process.env.GITHUB_REPOSITORY.split('/')[1];
const IMAGE_FULL = `${REGISTRY}/${REPO}:${tag}`;
```

```bash
# Bash
REGISTRY="${{ inputs.registry }}"
[ -z "$REGISTRY" ] && REGISTRY="registry.truestory.work"
```

### 2. Обработка ошибок
```javascript
// JS
try {
  await doSomething();
} catch (error) {
  core.setFailed(`Failed: ${error.message}`);
}
```

```bash
# Bash
if ! do_something; then
  echo "Failed"
  exit 1
fi
```

### 3. Асинхронность
```javascript
// JS - параллельное выполнение
const [status1, status2] = await Promise.all([
  getAppStatus('app1'),
  getAppStatus('app2')
]);
```

### 4. Тестирование
```javascript
// JS - легко тестировать
const { handleDeployment } = require('./index');

test('deploys successfully', async () => {
  const result = await handleDeployment('myapp', 'image:tag');
  expect(result.success).toBe(true);
});
```

---

## Но есть минусы JS actions:

1. **Нужна сборка**
   - `npm install`
   - `npm run build` или `ncc build`
   - Коммитить `node_modules` или собранный `dist/`

2. **Зависимости**
   - `package.json`
   - `@actions/core`, `@actions/exec`, etc.

3. **action.yml другой**
   ```yaml
   runs:
     using: 'node20'
     main: 'dist/index.js'  # или 'index.js'
   ```

4. **Нужен Node.js runtime**
   - Но он всегда есть в GitHub runners

---

## Когда использовать что?

### Bash (composite)
✅ Простые действия с командами
✅ Обертки над CLI утилитами
✅ Быстрое прототипирование
✅ Не хочется возиться со сборкой

### JavaScript
✅ Сложная логика
✅ Много step summaries
✅ Работа с API
✅ Переиспользование кода
✅ Нужны тесты

---

## Вывод

Для `argo-set-image` с его множеством `GITHUB_STEP_SUMMARY` - **JavaScript был бы намного красивее**.

Но если не хочется возиться со сборкой и зависимостями - можно оставить bash, просто вынести summary в функции или использовать heredoc.