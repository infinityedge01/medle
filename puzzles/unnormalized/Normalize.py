import os
PathIn = "/root/medle/medle/puzzles/unnormalized/"
PathOut = "/root/medle/medle/puzzles/reveal/"
for file in os.listdir(PathIn):
   if file.endswith("mp3"):
       os.system("ffmpeg-normalize " + PathIn + file + " -c:a libmp3lame -ar 44100 -vn -sn -mn -ext mp3 -of " + PathOut);