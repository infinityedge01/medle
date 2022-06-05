pyftsubset rounded-mplus-1c-regular.ttf \
  --output-file=rounded-mplus-1c-regular-subset.ttf \
  --unicodes=266a,266d,266e,266f,2714,2715
pyftsubset fa-solid-900.ttf \
  --output-file=fa-solid-900-subset.ttf \
  --unicodes=1f3b5,f013,f041,f04b,f04d,f0c8,f0d8,1f7e4,1f4c6,f141,f219,1f319,f55a,f56b
./fontforge -lang=ff -script /root/medle/medle/misc/icon-font/merge.ff
woff2_compress icons.ttf
rm rounded-mplus-1c-regular-subset.ttf fa-solid-900-subset.ttf icons.ttf
