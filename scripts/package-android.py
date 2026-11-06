#!/usr/bin/env python3
"""Build a Firefox Android test extension. This does NOT sign it with Mozilla."""
import hashlib
import json
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
source = root / 'extension'
version = json.loads((source / 'manifest.json').read_text())['version']
output = Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root / 'dist' / f'assisticket-android-nightly-{version}.zip'
output.parent.mkdir(parents=True, exist_ok=True)
manifest = json.loads((source / 'manifest.json').read_text())
manifest['name'] = 'Assisticket — Android test'
manifest['background'] = {'scripts': ['background.js'], 'type': 'module'}
manifest['browser_specific_settings'] = {
    'gecko': {'id': 'assisticket@eliasripley.github.io', 'strict_min_version': '142.0', 'data_collection_permissions': {'required': ['none']}},
    'gecko_android': {'strict_min_version': '142.0'}
}
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(source.rglob('*')):
        if not path.is_file():
            continue
        name = path.relative_to(source).as_posix()
        data = json.dumps(manifest, indent=2).encode() if name == 'manifest.json' else path.read_bytes()
        archive.writestr(name, data)
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert json.loads(archive.read('manifest.json'))['browser_specific_settings']['gecko_android']
    assert 'index.html' in archive.namelist() and 'gwr.js' in archive.namelist()
print(output)
print('SHA256 ' + hashlib.sha256(output.read_bytes()).hexdigest())
