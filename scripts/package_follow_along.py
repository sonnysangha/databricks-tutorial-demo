"""Build the downloadable tutorial from an explicit file allowlist."""
import hashlib
import json
import shutil
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='papaeats-starter-') as temporary:
    kit = Path(temporary) / 'papaeats-starter'
    kit.mkdir()
    for name in ['README.md', 'config.example.json', 'configure.py']:
        shutil.copy2(ROOT / 'follow-along' / name, kit / name)
    tutorial = (ROOT / 'README.md').read_text()
    tutorial = tutorial.replace('](docs/images/', '](https://raw.githubusercontent.com/sonnysangha/databricks-tutorial-demo/main/docs/images/')
    tutorial = tutorial.replace('](prompts/genie-code.md)', '](prompts.md)')
    tutorial = tutorial.replace('](dist/papaeats-starter.zip)', '](https://github.com/sonnysangha/databricks-tutorial-demo/raw/refs/heads/main/dist/papaeats-starter.zip)')
    (kit / 'TUTORIAL.md').write_text(tutorial)
    (kit / 'docs').mkdir()
    setup = (ROOT / 'docs/SETUP.md').read_text()
    setup = setup.replace('](../README.md#', '](../TUTORIAL.md#')
    setup = setup.replace('](images/', '](https://raw.githubusercontent.com/sonnysangha/databricks-tutorial-demo/main/docs/images/')
    setup = setup.replace('](../prompts/genie-code.md)', '](../prompts.md)')
    (kit / 'docs/SETUP.md').write_text(setup)

    prompts = (ROOT / 'prompts/genie-code.md').read_text().replace('](../README.md)', '](TUTORIAL.md)')
    (kit / 'prompts.md').write_text(prompts)
    template = kit / 'template'
    for name in ['web', 'data', 'notebooks', 'mlflow', 'sql']:
        (template / name).mkdir(parents=True)
    for name in ['app', 'lib', 'tests']:
        shutil.copytree(ROOT / 'web' / name, template / 'web' / name)
    (template / 'web/public').mkdir()
    for name in ['package.json', 'package-lock.json', 'next.config.ts', 'postcss.config.mjs',
                 'tsconfig.json', 'eslint.config.mjs']:
        shutil.copy2(ROOT / 'web' / name, template / 'web' / name)
    for name in ['app_store_reviews.csv', 'google_play_reviews.csv', 'in_app_feedback.json', 'support_tickets.csv']:
        shutil.copy2(ROOT / 'data' / name, template / 'data' / name)
    for path in ['workflow/src/PapaEats Feedback Refresh.py', 'workflow/app-submissions/PapaEats App Feedback.py']:
        shutil.copy2(ROOT / path, template / 'notebooks' / Path(path).name)
    shutil.copy2(ROOT / 'workflow/mlflow/evaluate_saved_feedback.py', template / 'mlflow/evaluate_saved_feedback.py')
    for name in ['00_bootstrap.sql', '06_app_decisions.sql', '07_app_submissions.sql']:
        shutil.copy2(ROOT / 'sql' / name, template / 'sql' / name)
    shutil.copy2(ROOT / 'workflow/dashboard/dataset.sql', template / 'sql/dashboard.sql')
    manifest = []
    for file in sorted(kit.rglob('*')):
        if file.is_symlink():
            raise ValueError('Symlinks cannot be included in the starter.')
        if not file.is_file():
            continue
        if file.name.startswith('.env') or any(x in file.parts for x in ['node_modules', '.next', '__pycache__']):
            raise ValueError('Unexpected environment or cache file.')
        manifest.append({'path': str(file.relative_to(kit)), 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
    (kit / 'MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n')
    output = ROOT / 'dist'
    output.mkdir(exist_ok=True)
    archive = output / 'papaeats-starter.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for file in sorted(kit.rglob('*')):
            if file.is_file():
                z.write(file, str(file.relative_to(kit.parent)))
    print(f'Created {archive} ({len(manifest)} manifest entries).')
