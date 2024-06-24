if [ -z "$1" ]; then
  echo "Usage: sh replace.sh <replacement>"
  exit 1
fi

replacement=$1

# replace /wasm/ with commitnumber/wasm/ in model-loader.ts
sed -i.bak "s/\/wasm/$replacement\/wasm/g" src/model-loader.ts

# # replace styles.css with commitnumber/style.css in index.html
sed -i.bak "s/styles.css/$replacement\/styles.css/g" src/templates/index.html
