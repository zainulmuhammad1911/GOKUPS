# Image produksi PDPSI (Next.js mode standalone). Data rilis dibaca dari data/releases saat berjalan.
# Bangun: docker build -t pdpsi .   Jalankan: docker run -p 3000:3000 pdpsi
FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:26-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S pdpsi && adduser -S pdpsi -G pdpsi
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER pdpsi
EXPOSE 3000
CMD ["node", "server.js"]
