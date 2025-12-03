// Пример части argo-set-image action на JavaScript
// Показывает как работать с GITHUB_STEP_SUMMARY красиво

const core = require('@actions/core');
const exec = require('@actions/exec');

async function run() {
  try {
    // Получаем inputs
    const tag = core.getInput('tag', { required: true });
    const argoapp = core.getInput('argoapp', { required: true });
    const registry = core.getInput('registry') || 'registry.truestory.work';
    const repo = core.getInput('repo') || process.env.GITHUB_REPOSITORY.split('/')[1];

    // Собираем образ
    const imageFullPath = `${registry}/${repo}`;
    const imageFull = `${imageFullPath}:${tag}`;

    console.log(`Deploying: ${imageFull}`);

    // Set kustomize-image
    await exec.exec('argocd', [
      '--core', 'app', 'set', argoapp,
      '--kustomize-image', imageFull
    ]);

    // Wait for app to become healthy
    let success = false;
    try {
      await exec.exec('argocd', [
        '--core', 'app', 'wait', argoapp,
        '--timeout', '2m',
        '--health'
      ]);
      success = true;
    } catch (error) {
      success = false;
    }

    // Get app status
    let appStatus = '';
    await exec.exec('argocd', ['--core', 'app', 'get', argoapp], {
      listeners: {
        stdout: (data) => { appStatus += data.toString(); }
      }
    });

    // ✨ ВОТ ТУТ КРАСОТА! Template literals для markdown
    if (success) {
      await core.summary
        .addHeading('✅ Deployment Successful', 2)
        .addRaw('')  // Пустая строка
        .addList([
          `**Image**: \`${imageFull}\``,
          `**App**: ${argoapp}`,
          `**Status**: Healthy and Synced`
        ])
        .addRaw('')
        .addHeading('ArgoCD App Status', 3)
        .addCodeBlock(appStatus, 'yaml')
        .write();

      core.setOutput('status', 'success');

    } else {
      // Rollback
      await exec.exec('argocd', [
        '--core', 'app', 'unset', argoapp,
        '--kustomize-image', imageFull
      ]);

      await core.summary
        .addHeading('❌ Deployment Failed', 2)
        .addRaw('')
        .addList([
          `**Image**: \`${imageFull}\``,
          `**App**: ${argoapp}`,
          `**Status**: Failed to stabilize`
        ])
        .addRaw('')
        .addHeading('ArgoCD App Status', 3)
        .addCodeBlock(appStatus, 'yaml')
        .addRaw('')
        .addHeading('🔄 Rollback Status', 3)
        .addRaw('✅ Successfully rolled back to previous version')
        .write();

      core.setOutput('status', 'failed');
      core.setFailed('App failed to stabilize');
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
