-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "canalSuscripciones" TEXT;

-- CreateTable
CREATE TABLE "PermisoSuscripcion" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "comando" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "PermisoSuscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermisoSuscripcion_guildId_comando_roleId_key" ON "PermisoSuscripcion"("guildId", "comando", "roleId");

-- AddForeignKey
ALTER TABLE "PermisoSuscripcion" ADD CONSTRAINT "PermisoSuscripcion_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
