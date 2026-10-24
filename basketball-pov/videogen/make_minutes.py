"""Build a minutes-long AI-generated video from videogen/shots.json: one 8-second generation per shot (same character
and style text in every prompt so the skeleton stays the same across clips), then every clip normalised to 720x1280 at
30 fps with stereo audio (silence where a clip has none) and joined in order with hard cuts.

The generator is whatever video-generation CLI is installed where this runs, given as a command template with
{description} {ratio} {resolution} {duration} {output} placeholders, e.g. the plugin's:
  python3 videogen/make_minutes.py --gen 'python3 /app/.agents/plugins/video_generation/scripts/video_generation_tool.py generate --description {description} --ratio {ratio} --resolution {resolution} --duration {duration} --output {output}'
Clips already generated are kept (re-run to resume). Output: videogen/out/<title>.mp4
"""
import argparse, json, os, shlex, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe: return exe
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def has_audio(ff, path):
    r = subprocess.run([ff, '-hide_banner', '-i', path], capture_output=True, text=True)
    return 'Audio:' in r.stderr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gen', required=True, help='generator command template (see the docstring)')
    ap.add_argument('--shots', default=os.path.join(HERE, 'shots.json'))
    ap.add_argument('--out', default=os.path.join(HERE, 'out'))
    a = ap.parse_args()
    spec = json.load(open(a.shots)); os.makedirs(a.out, exist_ok=True)
    ff, clips = ffmpeg(), []
    for s in spec['shots']:
        raw = os.path.join(a.out, s['name'] + '.mp4')
        if not os.path.exists(raw):
            desc = f"{spec['style']} {s['action']}"
            cmd = a.gen.format(description=shlex.quote(desc), ratio=shlex.quote(spec['ratio']), resolution=shlex.quote(spec['resolution']),
                               duration=spec['duration'], output=shlex.quote(raw))
            print('generating', s['name'], flush=True)
            if subprocess.run(cmd, shell=True).returncode != 0 or not os.path.exists(raw):
                sys.exit(f'generation failed for {s["name"]}; fix and re-run (finished clips are kept)')
        norm = os.path.join(a.out, s['name'] + '_n.mp4')
        inputs = ['-i', raw] if has_audio(ff, raw) else ['-i', raw, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']
        subprocess.run([ff, '-y', '-loglevel', 'error', *inputs, '-map', '0:v:0', '-map', '0:a:0' if has_audio(ff, raw) else '1:a:0', '-shortest',
                        '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p',
                        '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-c:a', 'aac', '-ar', '48000', '-ac', '2', norm], check=True)
        clips.append(norm)
    lst = os.path.join(a.out, 'list.txt')
    open(lst, 'w').write(''.join(f"file '{c}'\n" for c in clips))
    final = os.path.join(a.out, spec['title'].lower().replace(' ', '_') + '.mp4')
    subprocess.run([ff, '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', final], check=True)
    print('wrote', final, f"({len(clips) * spec['duration']} s)")


if __name__ == '__main__':
    main()
