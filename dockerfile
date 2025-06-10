# Use uma imagem base, por exemplo, Node.js para um aplicativo Node.js
FROM node:20-alpine 

# Defina o diretório de trabalho dentro do container
WORKDIR /app

# Copie package.json e package-lock.json (ou yarn.lock)
# Isso é importante para que o Docker possa usar o cache de camada para npm install
COPY package*.json ./

# Instale as dependências
RUN npm install

# *** NOVO PASSO: Executar o comando de build ***
# Este comando criará a pasta 'dist' com os arquivos JS transpilados/compilados
# Substitua 'npm run build' pelo comando real do seu package.json se for diferente
RUN npm run build

# Copie o restante do código da sua aplicação (se houver arquivos que não sejam do build)
# Note: Se todos os seus arquivos essenciais estiverem dentro de 'dist' após o build,
# e você só precisar deles, você pode otimizar o COPY. Mas por agora, mantenha assim.
COPY . .

# (Opcional, mas recomendado para Prisma, se aplicável)
# RUN npx prisma generate

# Exponha a porta que sua aplicação usa
EXPOSE 7000

# Comando para iniciar sua aplicação
# Certifique-se de que este comando reflete exatamente o que está no seu package.json
# que é 'node dist/main.js'
CMD ["node", "dist/main.js"]