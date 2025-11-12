FROM node:20-alpine

WORKDIR /app

# Verificar si existe package.json, si no, crear uno básico
RUN if [ ! -f package.json ]; then \
    echo '{"name":"dashboard","version":"1.0.0","type":"module","scripts":{"dev":"vite","build":"vite build","preview":"vite preview"},"dependencies":{"react":"^18.2.0","react-dom":"^18.2.0"},"devDependencies":{"@vitejs/plugin-react":"^4.2.1","vite":"^5.0.0"}}' > package.json; \
    fi

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

