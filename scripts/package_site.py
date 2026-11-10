"""Package only runtime files and browser-compatible media for GitHub Pages."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parent.parent
output = root / '_site'
if output.exists():
    shutil.rmtree(output)
output.mkdir()
for name in ['index.html', 'video.html', 'video.js', 'video-data.js', 'comments.js', 'github-comments.js', 'comments-ui.css', 'giscus-compose.css', 'giscus-read.css', '.nojekyll']:
    shutil.copy2(root / name, output / name)
for name in ['posters', 'teachers']:
    shutil.copytree(root / name, output / name, dirs_exist_ok=True)
(output / 'videos').mkdir(exist_ok=True)
for video in (root / 'videos').glob('*.mp4'):
    shutil.copy2(video, output / 'videos' / video.name)
print('Packaged static website into _site/.')
