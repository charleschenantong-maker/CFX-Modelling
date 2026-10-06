import subprocess

diff = subprocess.check_output(['git', 'diff', '-U0', 'content/']).decode('utf-8', errors='ignore')
added_lines = [line[1:] for line in diff.splitlines() if line.startswith('+') and not line.startswith('+++')]
bad_backticks = [l for l in added_lines if '`' in l]
bad_interpolations = [l for l in added_lines if '${' in l]
bad_tabs = [l for l in added_lines if '\t' in l]

print('Total added lines:', len(added_lines))
print('Added lines with backtick:', len(bad_backticks))
print('Added lines with interpolation:', len(bad_interpolations))
print('Added lines with tab:', len(bad_tabs))

if bad_backticks:
    for l in bad_backticks:
        print('  Bad backtick:', l)
if bad_interpolations:
    for l in bad_interpolations:
        print('  Bad interpolation:', l)
if bad_tabs:
    for l in bad_tabs:
        print('  Bad tab:', l)

if not bad_backticks and not bad_interpolations and not bad_tabs:
    print('ALL CHECKS PERFECT! No backticks, no interpolations, no tabs.')
