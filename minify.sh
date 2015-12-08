ECHO "[COMPILING]"
# uglifyjs jrouting.js -c -m -o jrouting.min.js
uglifyjs jrouting.js -c -o jrouting.min.js
total --minify jrouting.js