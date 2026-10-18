-- CreateEnum
CREATE TYPE "Crop" AS ENUM ('MAIZE', 'CASSAVA', 'YAM', 'RICE_PADDY', 'TOMATO', 'TILAPIA', 'CATFISH', 'EGGS_TRAY', 'PALM_OIL');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('KG', 'TRAY', 'LITRE');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('SIMULATED', 'LIVE');

-- CreateEnum
CREATE TYPE "Species" AS ENUM ('TILAPIA', 'CATFISH');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('NO_GROWTH', 'CHECK_NUMBERS', 'TOO_MUCH_FEED', 'SLOW_GROWTH', 'GOOD');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farms" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_ticks" (
    "id" TEXT NOT NULL,
    "crop" "Crop" NOT NULL,
    "date" DATE NOT NULL,
    "priceKobo" INTEGER NOT NULL,
    "unit" "Unit" NOT NULL,
    "source" "PriceSource" NOT NULL DEFAULT 'SIMULATED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_ticks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_snapshots" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "weather_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ponds" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "Species" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ponds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_prices" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "priceKobo" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "feed_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checks" (
    "id" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fishCount" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,
    "startG" INTEGER NOT NULL,
    "currentG" INTEGER NOT NULL,
    "feedKg" DOUBLE PRECISION NOT NULL,
    "status" "CheckStatus" NOT NULL,
    "fcr" DOUBLE PRECISION,
    "adgGPerDay" DOUBLE PRECISION NOT NULL,
    "feedCostPerKgGainKobo" INTEGER,
    "stockValueKobo" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "farms_userId_idx" ON "farms"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "price_ticks_crop_date_key" ON "price_ticks"("crop", "date");

-- CreateIndex
CREATE INDEX "weather_snapshots_farmId_fetchedAt_idx" ON "weather_snapshots"("farmId", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ponds_farmId_name_key" ON "ponds"("farmId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "feed_prices_farmId_key" ON "feed_prices"("farmId");

-- CreateIndex
CREATE INDEX "checks_pondId_date_idx" ON "checks"("pondId", "date");

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "farms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_snapshots" ADD CONSTRAINT "weather_snapshots_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ponds" ADD CONSTRAINT "ponds_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_prices" ADD CONSTRAINT "feed_prices_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checks" ADD CONSTRAINT "checks_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "ponds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
