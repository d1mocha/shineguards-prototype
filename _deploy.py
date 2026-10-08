#!/usr/bin/env python3
"""Publish the prototype to GitHub Pages:  python _deploy.py   (python _deploy.py --dry  builds without pushing)

Builds the shareable folder (_share/site) and pushes it as ONE commit to the deploy repository. Only the built files
live there — what any visitor of the site can download anyway; the sources and their history stay in this private
repository. Every publish replaces the previous commit, so nothing old remains in the history of the public one.
The deploy commits are signed with the GitHub no-reply address: a public repository must not show a private e-mail.
"""
import os
import subprocess
import sys

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


def main():
    if run('git', 'status', '--porcelain'):
        sys.exit('Commit the sources first: the published site must match a commit.')
    sha = run('git', 'rev-parse', '--short', 'HEAD')
    print(run(sys.executable, '_build.py', '--share'))
    site = os.path.join(HERE, '_share', 'site')
    run('git', 'init', '-q', '-b', 'main', cwd=site)
    run('git', 'add', '-A', cwd=site)
    run('git', *IDENTITY, 'commit', '-q', '-m', f'Site build from {sha}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>', cwd=site)
    files = len(run('git', 'ls-files', cwd=site).splitlines())
    if '--dry' in sys.argv:
        print(f'dry run: {files} files committed locally from {sha}, nothing pushed')
        return
    run('git', 'push', '-f', PAGES_REPO, 'main', cwd=site)
    print(f'published {sha} ({files} files) -> {PAGES_URL}')


if __name__ == '__main__':
    main()
