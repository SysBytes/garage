import { NextRequest, NextResponse } from "next/server";
import { Product } from "@/types/product";
import { getProducts, saveProducts, deleteProduct, deleteProductImage } from "@/lib/products";

export const dynamic = "force-dynamic";

/**
 * GET: Obtiene la lista de productos agrupados y sincronizados.
 */
export async function GET() {
	try {
		const products = await getProducts();

		return NextResponse.json(products, {
			status: 200,
			headers: {
				"Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
			},
		});
	} catch (error) {
		console.error("Error en GET /api/products:", error);
		return NextResponse.json(
			{ error: "Error al leer o inicializar los productos", details: String(error) },
			{ status: 500 }
		);
	}
}

/**
 * POST / PUT: Sobrescribe permanentemente el archivo data.json con los cambios editados.
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const updatedProducts: Product[] = Array.isArray(body)
			? body
			: body.products;

		if (!Array.isArray(updatedProducts)) {
			return NextResponse.json(
				{ error: "El payload debe ser un array de productos o contener la propiedad 'products'." },
				{ status: 400 }
			);
		}

		const sanitizedProducts = await saveProducts(updatedProducts);

		return NextResponse.json({
			success: true,
			message: "Catálogo guardado exitosamente.",
			count: sanitizedProducts.length,
			products: sanitizedProducts,
		});
	} catch (error) {
		console.error("Error en POST /api/products:", error);
		return NextResponse.json(
			{ error: "Error al guardar los datos en data.json", details: String(error) },
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	return POST(request);
}

/**
 * DELETE: Elimina un producto y sus imágenes del disco, o una imagen puntual de un producto.
 */
export async function DELETE(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");
		const image = searchParams.get("image");

		if (!id) {
			return NextResponse.json(
				{ error: "Se requiere el parámetro 'id' del producto a eliminar." },
				{ status: 400 }
			);
		}

		if (image) {
			// Eliminar una imagen puntual del producto
			const result = await deleteProductImage(id, image);
			return NextResponse.json({
				success: true,
				message: `Imagen "${image}" eliminada del producto y del servidor.`,
				products: result.products,
			});
		} else {
			// Eliminar el producto completo y sus imágenes físicas
			const result = await deleteProduct(id);
			return NextResponse.json({
				success: true,
				message: `Producto "${id}" y sus ${result.deletedImages.length} imagen(es) fueron eliminados permanentemente.`,
				deletedImages: result.deletedImages,
				products: result.products,
			});
		}
	} catch (error) {
		console.error("Error en DELETE /api/products:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Error al eliminar producto o imagen" },
			{ status: 500 }
		);
	}
}
