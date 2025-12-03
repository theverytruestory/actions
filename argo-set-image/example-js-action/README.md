# JavaScript Action Example

Это пример как выглядел бы `argo-set-image` action на JavaScript.

## Ключевые преимущества

### 1. Красивый GITHUB_STEP_SUMMARY

**Bash (текущее):**
```bash
echo "## Status" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "**Image**: \`${IMAGE}\`" >> $GITHUB_STEP_SUMMARY
```

**JavaScript:**
```javascript
await core.summary
  .addHeading('Status', 2)
  .addRaw('')
  .addList([`**Image**: \`${image}\``])
  .write();
```

### 2. Template Literals

**Bash:**
```bash
IMAGE="${REGISTRY}/${REPO}:${TAG}"
```

**JavaScript:**
```javascript
const image = `${registry}/${repo}:${tag}`;
```

### 3. Try/Catch вместо if/then

**Bash:**
```bash
if argocd app wait ...; then
  echo "Success"
else
  echo "Failed"
  exit 1
fi
```

**JavaScript:**
```javascript
try {
  await exec.exec('argocd', ['app', 'wait', ...]);
  console.log('Success');
} catch (error) {
  console.log('Failed');
  throw error;
}
```

## Структура JS action

```
example-js-action/
├── action.yml          # Описание action
├── package.json        # Зависимости
├── index.js           # Основной код
└── dist/              # Собранный код (после npm run build)
    └── index.js
```

## Как создать JS action

### 1. Установка зависимостей

```bash
npm init -y
npm install @actions/core @actions/exec
npm install --save-dev @vercel/ncc
```

### 2. package.json

```json
{
  "scripts": {
    "build": "ncc build index.js -o dist"
  },
  "dependencies": {
    "@actions/core": "^1.10.0",
    "@actions/exec": "^1.1.1"
  }
}
```

### 3. index.js

```javascript
const core = require('@actions/core');
const exec = require('@actions/exec');

async function run() {
  try {
    const tag = core.getInput('tag', { required: true });

    // Ваша логика здесь

    core.setOutput('status', 'success');
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
```

### 4. action.yml

```yaml
runs:
  using: 'node20'
  main: 'dist/index.js'
```

### 5. Сборка

```bash
npm run build
```

Коммитите `dist/` в git.

## Доступные методы @actions/core

### Inputs/Outputs
```javascript
const value = core.getInput('name');
const required = core.getInput('name', { required: true });
core.setOutput('name', 'value');
```

### Logging
```javascript
core.info('Info message');
core.warning('Warning message');
core.error('Error message');
core.debug('Debug message');
```

### Summary (КРАСИВО!)
```javascript
await core.summary
  .addHeading('Title', 2)           // ## Title
  .addRaw('raw markdown')
  .addCodeBlock('code', 'yaml')
  .addList(['item1', 'item2'])
  .addTable([
    [{data: 'Header1'}, {data: 'Header2'}],
    [{data: 'Cell1'}, {data: 'Cell2'}]
  ])
  .addQuote('Quote text')
  .addSeparator()
  .write();
```

### Environment
```javascript
core.exportVariable('VAR_NAME', 'value');
core.setSecret('password123');  // Маскирует в логах
```

### Annotations
```javascript
core.notice('Notice message');
core.warning('Warning', {
  file: 'app.js',
  startLine: 10,
  endLine: 15
});
```

## Запуск команд (@actions/exec)

```javascript
const exec = require('@actions/exec');

// Простой запуск
await exec.exec('argocd', ['app', 'get', 'myapp']);

// С захватом output
let output = '';
await exec.exec('argocd', ['app', 'get', 'myapp'], {
  listeners: {
    stdout: (data) => {
      output += data.toString();
    }
  }
});

// Проверка exit code
try {
  await exec.exec('some-command');
  console.log('Success');
} catch (error) {
  console.log('Failed with exit code:', error);
}
```

## Когда стоит использовать JS action?

✅ **Да:**
- Сложная логика
- Много работы с summary/annotations
- Нужна обработка JSON/YAML в коде
- Хотите тесты
- Работа с API

❌ **Нет:**
- Простая обертка над CLI
- Не хочется заморачиваться со сборкой
- Bash скрипт уже работает

## Минусы JS actions

1. **Нужна сборка**: `npm run build` перед коммитом
2. **Размер**: `dist/index.js` может быть большим (но один файл)
3. **node_modules**: Либо коммитить, либо собирать с `ncc`
4. **Сложнее для новичков**: Нужно знать Node.js

## Альтернатива: TypeScript

Еще лучше - TypeScript:

```typescript
import * as core from '@actions/core';
import * as exec from '@actions/exec';

interface DeploymentResult {
  success: boolean;
  appStatus: string;
}

async function deploy(
  argoapp: string,
  image: string
): Promise<DeploymentResult> {
  // Типизированный код
}
```

## Вывод

Для `argo-set-image` с множеством step summaries - **JS был бы красивее**.

Но если не хочется возиться:
- Можно оставить bash
- Вынести summary в heredoc
- Создать helper функции

Выбор за вами! 🚀