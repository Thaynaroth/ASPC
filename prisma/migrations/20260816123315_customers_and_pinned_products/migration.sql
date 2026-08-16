-- AlterTable
ALTER TABLE "products" ADD COLUMN     "is_pinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_shop_id_phone_idx" ON "customers"("shop_id", "phone");

-- CreateIndex
CREATE INDEX "customers_shop_id_deleted_at_idx" ON "customers"("shop_id", "deleted_at");

-- CreateIndex
CREATE INDEX "products_shop_id_is_pinned_idx" ON "products"("shop_id", "is_pinned");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
