"""A small fal.ai queue client: submit a job, wait for it, fetch the result, download its files.

The key is not read here: this session's network proxy adds `Authorization: Key ...` to every request to
queue.fal.run. Elsewhere, set FAL_KEY and it is sent the same way.

Every job is written to disk as soon as it is submitted (gen/<name>.job.json), so an interrupted run picks
the same job back up instead of paying for it twice.
"""
import json
import os
import pathlib
import sys
import time

import requests

QUEUE = 'https://queue.fal.run'


def _headers():
    h = {'Content-Type': 'application/json', 'Accept': 'application/json'}
    k = os.environ.get('FAL_KEY')
    if k:
        h['Authorization'] = f'Key {k}'
    return h


def _get(url, **kw):
    for i in range(5):
        try:
            r = requests.get(url, headers=_headers(), timeout=90, **kw)
            if r.status_code >= 500:
                raise requests.HTTPError(f'{r.status_code} {r.text[:200]}')
            return r
        except (requests.ConnectionError, requests.Timeout, requests.HTTPError) as e:
            if i == 4:
                raise
            print(f'  (retry {i + 1}: {e})', flush=True)
            time.sleep(4 * (i + 1))


def submit(endpoint, args):
    r = requests.post(f'{QUEUE}/{endpoint}', headers=_headers(), data=json.dumps(args), timeout=90)
    if r.status_code >= 400:
        raise RuntimeError(f'submit {endpoint}: {r.status_code} {r.text[:500]}')
    return r.json()


def wait(job, every=6, timeout=3600):
    t0, last = time.time(), None
    while True:
        r = _get(job['status_url'])
        if r.status_code >= 400:
            raise RuntimeError(f'status: {r.status_code} {r.text[:500]}')
        st = r.json().get('status')
        if st != last:
            print(f'  {st} at {time.time() - t0:.0f} s', flush=True)
            last = st
        if st == 'COMPLETED':
            break
        if time.time() - t0 > timeout:
            raise TimeoutError(f'{job["request_id"]} still {st} after {timeout} s')
        time.sleep(every)
    r = _get(job['response_url'])
    out = r.json()
    if r.status_code >= 400 or (isinstance(out, dict) and 'detail' in out and not any(k in out for k in ('video', 'images'))):
        raise RuntimeError(f'result: {r.status_code} {json.dumps(out)[:800]}')
    return out


def download(url, path):
    path = pathlib.Path(path)
    tmp = path.with_suffix(path.suffix + '.part')
    with requests.get(url, stream=True, timeout=300) as r:
        r.raise_for_status()
        with open(tmp, 'wb') as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
    tmp.rename(path)
    return path


def run(name, endpoint, args, outdir):
    """Run one job (or resume it) and return its result; the job and the result are kept in outdir."""
    outdir = pathlib.Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    jf, rf = outdir / f'{name}.job.json', outdir / f'{name}.result.json'
    if rf.exists():
        return json.loads(rf.read_text())
    if jf.exists() and json.loads(jf.read_text()).get('args') == args:
        job = json.loads(jf.read_text())
        print(f'{name}: resuming {job["request_id"]}', flush=True)
    else:
        job = submit(endpoint, args)
        job.update(endpoint=endpoint, args=args, submitted=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()))
        jf.write_text(json.dumps(job, indent=1))
        print(f'{name}: submitted {job["request_id"]} to {endpoint}', flush=True)
    out = wait(job)
    rf.write_text(json.dumps(out, indent=1))
    return out


if __name__ == '__main__':
    # python3 fal.py <name> <endpoint> '<json args>' [outdir]
    name, endpoint, args = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
    print(json.dumps(run(name, endpoint, args, sys.argv[4] if len(sys.argv) > 4 else 'gen'), indent=1))
