#!/bin/sh
# master.sh in.wav out.wav targetLUFS
I=$(ffmpeg -hide_banner -nostats -i "$1" -af loudnorm=print_format=json -f null - 2>&1 | grep '"input_i"' | sed 's/[^-0-9.]//g')
G=$(python3 -c "print(round($3 - ($I), 2))")
ffmpeg -hide_banner -loglevel error -y -i "$1" -af "volume=${G}dB,alimiter=limit=0.79:attack=4:release=80:level=disabled" -ar 48000 -c:a pcm_s16le "$2"
echo "$2: in=$I gain=$G -> $(ffmpeg -hide_banner -nostats -i "$2" -af loudnorm=print_format=json -f null - 2>&1 | grep -E '"input_(i|tp)"' | tr -d '\n\t ')"
