export interface DraftLine {
  id: string;
  name: string;
  quantity: number;
  price: number | null;
  product_id: string | null;
  isNew: boolean;
  /** true while a brand-new product's qty/price are still being typed in */
  pending: boolean;
}

export function createLine(
  name: string,
  quantity: number,
  price: number | null,
  productId: string | null,
): DraftLine {
  const isNew = !productId;
  return {
    id: crypto.randomUUID(),
    name,
    quantity,
    price,
    product_id: productId,
    isNew,
    // new products start in the "write the details" state
    pending: isNew,
  };
}
