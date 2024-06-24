# replace /wasm/ with commitnumber/wasm/ in all files in the current directory

for file in *; do
    if [ -f "$file" ]; then
        sed -i 's/\/wasm\//\/'"$1"'\/wasm\//g' "$file"
    fi
done

# replace styles.css with commitnumber/styles.css in all files in the current directory

for file in *; do
    if [ -f "$file" ]; then
        sed -i 's/styles.css/'"$1"'/styles.css/g' "$file"
    fi
done
