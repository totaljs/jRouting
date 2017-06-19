ECHO "[COMPILING]"
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )
cd $DIR
uglifyjs jrouting.js --config-file minify.json -o jrouting.min.js
uglifyjs jrouting.jcomponent.js --config-file minify.json -o jrouting.jcomponent.min.js