#!/usr/bin/env python3
"""Publish the prototype to GitHub Pages:  python _deploy.py   (python _deploy.py --dry  builds without pushing)

Builds the shareable folder (_share/site) and pushes it as ONE commit to the deploy repository. Only the built files
live there — what any visitor of the site can download anyway; the sources and their history stay in this private
repository. Every publish replaces the previous commit, so nothing old remains in the history of the public one.
The deploy commits are signed with the GitHub no-reply address: a public repository must not show a private e-mail.

The deploy repository publishes its branch itself (Settings → Pages → «Deploy from a branch» → main, / (root)).
After the push the script waits until the live site answers with the new version (version.txt = the source commit).
"""
import os
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
PAGES_USER = 'd1mocha'
PAGES_NAME = 'sg-prototype'  # the public repository GitHub Pages serves
PAGES_REPO = f'https://github.com/{PAGES_USER}/{PAGES_NAME}.git'
PAGES_URL = f'https://{PAGES_USER}.github.io/{PAGES_NAME}/'
IDENTITY = ['-c', f'user.name={PAGES_USER}', '-c', f'user.email={PAGES_USER}@users.noreply.github.com']


def run(*cmd, cwd=HERE):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode:
        sys.exit(f"failed: {' '.join(cmd)}\n{r.stdout}{r.stderr}")
    return r.stdout.strip()


def live_version():
    try:
        with urllib.request.urlopen(f'{PAGES_URL}version.txt?t={int(time.time())}', timeout=15) as r:
            return r.read().decode('utf-8', 'replace').strip()
    except Exception:
        return None


def main():
    if run('git', 'status', '--porcelain'):
        sys.exit('Commit the sources first: the published site must match a commit.')
    sha = run('git', 'rev-parse', '--short', 'HEAD')
    print(run(sys.executable, '_build.py', '--share'))
    site = os.path.join(HERE, '_share', 'site')
    with open(os.path.join(site, 'version.txt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(sha + '\n')
    run('git', 'init', '-q', '-b', 'main', cwd=site)
    run('git', 'add', '-A', cwd=site)
    run('git', *IDENTITY, 'commit', '-q', '-m', f'Site build from {sha}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>', cwd=site)
    files = len(run('git', 'ls-files', cwd=site).splitlines())
    if '--dry' in sys.argv:
        print(f'dry run: {files} files committed locally from {sha}, nothing pushed')
        return
    run('git', 'push', '-f', PAGES_REPO, 'main', cwd=site)
    print(f'pushed {sha} ({files} files); waiting for {PAGES_URL}')
    for _ in range(30):  # GitHub Pages usually needs about a minute
        if live_version() == sha:
            print(f'live: {PAGES_URL} serves {sha}')
            return
        time.sleep(8)
    sys.exit(f'pushed, but {PAGES_URL} does not serve {sha} yet — check the repository: Actions and Settings → Pages')


if __name__ == '__main__':
    main()
