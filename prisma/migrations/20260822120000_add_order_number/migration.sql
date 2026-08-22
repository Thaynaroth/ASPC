-- AlterTable
ALTER TABLE "orders" ADD COLUMN "order_number" VARCHAR(32);

-- CreateIndex
CREATE INDEX "orders_shop_id_order_number_idx" ON "orders"("shop_id", "order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_shop_id_order_number_key" ON "orders"("shop_id", "order_number");
