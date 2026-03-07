-- CreateEnum
CREATE TYPE "EstadoCredito" AS ENUM ('BLOQUEADO', 'AL_DIA', 'CON_DEUDA');

-- CreateEnum
CREATE TYPE "EstadoPartida" AS ENUM ('ABIERTO', 'VENCIDO', 'PAGADO');

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "kunnr" VARCHAR(10) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "rut" VARCHAR(20) NOT NULL,
    "condicion_pago" VARCHAR(20) NOT NULL DEFAULT 'CONT',
    "estado_credito" "EstadoCredito" NOT NULL DEFAULT 'AL_DIA',
    "credito_asignado" INTEGER NOT NULL DEFAULT 0,
    "credito_utilizado" INTEGER NOT NULL DEFAULT 0,
    "sucursal" VARCHAR(10) NOT NULL DEFAULT 'D190',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materiales" (
    "id" SERIAL NOT NULL,
    "matnr" VARCHAR(18) NOT NULL,
    "descripcion" VARCHAR(200) NOT NULL,
    "precio_unitario" INTEGER NOT NULL,
    "unidad_medida" VARCHAR(5) NOT NULL DEFAULT 'UN',
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "id" SERIAL NOT NULL,
    "matnr" VARCHAR(18) NOT NULL,
    "centro" VARCHAR(10) NOT NULL,
    "almacen" VARCHAR(10) NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partidas_abiertas" (
    "id" SERIAL NOT NULL,
    "belnr" VARCHAR(10) NOT NULL,
    "kunnr" VARCHAR(10) NOT NULL,
    "clase_doc" VARCHAR(5) NOT NULL DEFAULT 'FV',
    "fecha_doc" TIMESTAMP(3) NOT NULL,
    "fecha_venc" TIMESTAMP(3) NOT NULL,
    "importe" INTEGER NOT NULL,
    "estado" "EstadoPartida" NOT NULL DEFAULT 'ABIERTO',
    "dias_mora" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "partidas_abiertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_venta" (
    "id" SERIAL NOT NULL,
    "vbeln" VARCHAR(10) NOT NULL,
    "kunnr" VARCHAR(10) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo_doc" VARCHAR(10) NOT NULL DEFAULT 'ZPOS',
    "canal" VARCHAR(50) NOT NULL DEFAULT 'Venta Meson',
    "estado" VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    "total" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pedidos_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_posicion" (
    "id" SERIAL NOT NULL,
    "vbeln" VARCHAR(10) NOT NULL,
    "matnr" VARCHAR(18) NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "pedidos_posicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobros" (
    "id" SERIAL NOT NULL,
    "belnr" VARCHAR(10) NOT NULL,
    "kunnr" VARCHAR(10) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" INTEGER NOT NULL,
    "medio_pago" VARCHAR(30) NOT NULL DEFAULT 'EFECTIVO',
    "clase_doc" VARCHAR(5) NOT NULL DEFAULT 'W',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cobros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_kunnr_key" ON "clientes"("kunnr");

-- CreateIndex
CREATE UNIQUE INDEX "materiales_matnr_key" ON "materiales"("matnr");

-- CreateIndex
CREATE UNIQUE INDEX "stock_matnr_centro_almacen_key" ON "stock"("matnr", "centro", "almacen");

-- CreateIndex
CREATE UNIQUE INDEX "partidas_abiertas_belnr_key" ON "partidas_abiertas"("belnr");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_venta_vbeln_key" ON "pedidos_venta"("vbeln");

-- CreateIndex
CREATE UNIQUE INDEX "cobros_belnr_key" ON "cobros"("belnr");

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_matnr_fkey" FOREIGN KEY ("matnr") REFERENCES "materiales"("matnr") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_posicion" ADD CONSTRAINT "pedidos_posicion_vbeln_fkey" FOREIGN KEY ("vbeln") REFERENCES "pedidos_venta"("vbeln") ON DELETE RESTRICT ON UPDATE CASCADE;
