ECHO "[COMPILING]"
uglifyjs jrouting.js --quotes=1 -m -c -o jrouting.min.js
uglifyjs jrouting.jcomponent.js --quotes=1 -m -c -o jrouting.jcomponent.min.js