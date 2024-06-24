# replace /wasm/ with commitnumber/wasm/ in model-loader.ts
sed -i 's/\/wasm\//\/commitnumber\/wasm\//g' src/model-loader.ts

# replace style.css with commitnumber/style.css in index.html
sed -i 's/style.css/commitnumber\/style.css/g' src/index.html

