import os
PathIn = "H:\\VSCodeFiles\\test\\puzzles\\unnormalized\\"
PathOut = "H:\\VSCodeFiles\\test\\puzzles\\reveal\\"
for file in os.listdir(PathIn):
   if file.endswith("mp3"):
       os.system("ffmpeg-normalize " + PathIn + file + " -c:a libmp3lame -ar 44100 -vn -sn -mn -ext mp3 -of " + PathOut);