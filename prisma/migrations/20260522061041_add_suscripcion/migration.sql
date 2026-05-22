-- CreateTable
CREATE TABLE "Suscripcion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "montoTotal" DECIMAL(65,30) NOT NULL,
    "diaCobro" INTEGER NOT NULL,
    "limiteUsuarios" INTEGER NOT NULL,
    "adminDiscordId" TEXT NOT NULL,
    "canalRecordatorio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiembroSuscripcion" (
    "id" SERIAL NOT NULL,
    "suscripcionId" INTEGER NOT NULL,
    "usuarioDiscordId" TEXT NOT NULL,
    "mesesAFavor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MiembroSuscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialPago" (
    "id" SERIAL NOT NULL,
    "miembroSuscripcionId" INTEGER NOT NULL,
    "montoPagado" DECIMAL(65,30) NOT NULL,
    "mesesCubiertos" INTEGER NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialPago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Suscripcion_nombre_key" ON "Suscripcion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "MiembroSuscripcion_suscripcionId_usuarioDiscordId_key" ON "MiembroSuscripcion"("suscripcionId", "usuarioDiscordId");

-- AddForeignKey
ALTER TABLE "MiembroSuscripcion" ADD CONSTRAINT "MiembroSuscripcion_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "Suscripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialPago" ADD CONSTRAINT "HistorialPago_miembroSuscripcionId_fkey" FOREIGN KEY ("miembroSuscripcionId") REFERENCES "MiembroSuscripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
