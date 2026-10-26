import { getProducts } from "@/lib/products";
import CatalogClient from "./components/CatalogClient";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
	const products = await getProducts();
	return <CatalogClient initialProducts={products} />;
}
