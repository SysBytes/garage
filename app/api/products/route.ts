import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Product } from "@/types/product";

const PRODUCTS_DIR = path.join(process.cwd(), "public", "products");
const DATA_FILE_PATH = path.join(process.cwd(), "data.json");

// Formatos de imagen válidos soportados
const IMAGE_EXTENSION_REGEX = /\.(jpe?g|png|webp|avif|gif)$/i;

/**
 * Extrae la base del nombre del archivo eliminando la extensión y el sufijo numérico final.
 * Ejemplos:
 *  - "arnes-black-pe-1.jpg" -> "arnes-black-pe"
 *  - "tank-sl77-blue-2.png" -> "tank-sl77-blue"
 *  - "headbands.jpg"        -> "headbands"
 */
function extractProductBaseId(fileName: string): string {
	const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
	// Remueve guion o guion bajo seguido de número al final (ej. -1, -02, _1)
	return nameWithoutExt.replace(/[-_]\d+$/, "");
}

/**
 * Genera un título limpio y legible a partir del ID del producto
 * Ejemplo: "arnes-black-pe" -> "Arnes Black Pe"
 */
function formatDefaultTitle(id: string): string {
	return id
		.split(/[-_]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}

/**
 * Lee la carpeta /public/products/ y agrupa las imágenes por el ID base del producto.
 */
async function scanAndGroupImages(): Promise<Record<string, string[]>> {
	if (!fs.existsSync(PRODUCTS_DIR)) {
		// Si la carpeta no existe, la crea para evitar errores
		await fs.promises.mkdir(PRODUCTS_DIR, { recursive: true });
		return {};
	}

	const entries = await fs.promises.readdir(PRODUCTS_DIR, { withFileTypes: true });
	const imageFiles = entries
		.filter((entry) => entry.isFile() && IMAGE_EXTENSION_REGEX.test(entry.name))
		.map((entry) => entry.name);

	const grouped: Record<string, string[]> = {};

	for (const file of imageFiles) {
		const baseId = extractProductBaseId(file);
		if (!grouped[baseId]) {
			grouped[baseId] = [];
		}
		grouped[baseId].push(file);
	}

	// Ordena las imágenes de forma natural/numérica (ej. index 1 antes de index 2 y 10)
	for (const baseId in grouped) {
		grouped[baseId].sort((a, b) =>
			a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
		);
	}

	return grouped;
}

/**
 * GET: Obtiene la lista de productos agrupados.
 * Si data.json no existe, lo crea a partir del escaneo de /public/products/.
 * Si ya existe, sincroniza las imágenes y añade nuevos productos preservando datos editados.
 */
export async function GET() {
	try {
		const groupedImages = await scanAndGroupImages();
		let products: Product[] = [];

		if (!fs.existsSync(DATA_FILE_PATH)) {
			// 1. Inicialización: crear data.json desde cero con las imágenes encontradas
			products = Object.keys(groupedImages).map((id) => ({
				id,
				images: groupedImages[id],
				title: formatDefaultTitle(id),
				suggestedPrice: "",
				observation: "",
			}));

			await fs.promises.writeFile(
				DATA_FILE_PATH,
				JSON.stringify(products, null, 2),
				"utf-8"
			);
		} else {
			// 2. data.json ya existe: leemos y sincronizamos con el sistema de archivos
			const fileData = await fs.promises.readFile(DATA_FILE_PATH, "utf-8");
			try {
				products = JSON.parse(fileData);
			} catch (parseError) {
				console.error("Error al parsear data.json, re-creando archivo:", parseError);
				products = [];
			}

			// Mapa para acceso rápido a los productos existentes
			const productMap = new Map<string, Product>();
			for (const p of products) {
				productMap.set(p.id, p);
			}

			let hasChanges = false;

			// Actualizar imágenes y agregar nuevos productos detectados en /public/products
			for (const [id, images] of Object.entries(groupedImages)) {
				if (productMap.has(id)) {
					const existing = productMap.get(id)!;
					// Si la lista de imágenes cambió en el disco, la actualizamos
					if (JSON.stringify(existing.images) !== JSON.stringify(images)) {
						existing.images = images;
						hasChanges = true;
					}
				} else {
					// Producto nuevo detectado en la carpeta
					const newProduct: Product = {
						id,
						images,
						title: formatDefaultTitle(id),
						suggestedPrice: "",
						observation: "",
					};
					products.push(newProduct);
					productMap.set(id, newProduct);
					hasChanges = true;
				}
			}

			// Si hubo sincronización de nuevas imágenes o productos, guardar en data.json
			if (hasChanges) {
				await fs.promises.writeFile(
					DATA_FILE_PATH,
					JSON.stringify(products, null, 2),
					"utf-8"
				);
			}
		}

		return NextResponse.json(products, {
			status: 200,
			headers: {
				"Cache-Control": "no-store, max-age=0",
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

		// Aseguramos estructura correcta de cada producto
		const sanitizedProducts: Product[] = updatedProducts.map((p) => ({
			id: String(p.id || ""),
			images: Array.isArray(p.images) ? p.images : [],
			title: String(p.title || ""),
			suggestedPrice: p.suggestedPrice ?? "",
			observation: String(p.observation || ""),
		}));

		await fs.promises.writeFile(
			DATA_FILE_PATH,
			JSON.stringify(sanitizedProducts, null, 2),
			"utf-8"
		);

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

// Soporte también para método PUT
export async function PUT(request: NextRequest) {
	return POST(request);
}
