ECHO "[COMPILING]"
cd ..
uglifyjs jrouting.js -c -m -o jrouting.min.js
cd minify
node minify.js ../jrouting.min.js