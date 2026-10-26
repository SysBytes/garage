import fs from "fs";
import path from "path";
import { Product } from "@/types/product";
import sharp from "sharp";

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
export function extractProductBaseId(fileName: string): string {
	const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
	return nameWithoutExt.replace(/[-_]\d+$/, "");
}

/**
 * Genera un título limpio y legible a partir del ID del producto
 * Ejemplo: "arnes-black-pe" -> "Arnes Black Pe"
 */
export function formatDefaultTitle(id: string): string {
	return id
		.split(/[-_]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}

/**
 * Lee la carpeta /public/products/ y agrupa las imágenes por el ID base del producto.
 */
export async function scanAndGroupImages(): Promise<Record<string, string[]>> {
	if (!fs.existsSync(PRODUCTS_DIR)) {
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

	// Ordena las imágenes de forma natural/numérica
	for (const baseId in grouped) {
		grouped[baseId].sort((a, b) =>
			a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
		);
	}

	return grouped;
}

/**
 * Obtiene la lista de productos sincronizada con las imágenes del sistema de archivos.
 */
export async function getProducts(): Promise<Product[]> {
	const groupedImages = await scanAndGroupImages();
	let products: Product[] = [];

	if (!fs.existsSync(DATA_FILE_PATH)) {
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
		const fileData = await fs.promises.readFile(DATA_FILE_PATH, "utf-8");
		try {
			products = JSON.parse(fileData);
		} catch (parseError) {
			console.error("Error al parsear data.json, re-creando archivo:", parseError);
			products = [];
		}

		const productMap = new Map<string, Product>();
		for (const p of products) {
			productMap.set(p.id, p);
		}

		let hasChanges = false;

		for (const [id, images] of Object.entries(groupedImages)) {
			if (productMap.has(id)) {
				const existing = productMap.get(id)!;
				if (JSON.stringify(existing.images) !== JSON.stringify(images)) {
					existing.images = images;
					hasChanges = true;
				}
			} else {
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

		if (hasChanges) {
			await fs.promises.writeFile(
				DATA_FILE_PATH,
				JSON.stringify(products, null, 2),
				"utf-8"
			);
		}
	}

	return products;
}

/**
 * Guarda los productos en data.json.
 */
export async function saveProducts(updatedProducts: Product[]): Promise<Product[]> {
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

	return sanitizedProducts;
}

/**
 * Elimina un producto y sus archivos de imagen físicos en /public/products/
 */
export async function deleteProduct(productId: string): Promise<{ success: boolean; deletedImages: string[]; products: Product[] }> {
	const products = await getProducts();
	const productToDelete = products.find((p) => p.id === productId);

	if (!productToDelete) {
		throw new Error(`Producto con ID "${productId}" no encontrado.`);
	}

	const otherProducts = products.filter((p) => p.id !== productId);

	// Reunir imágenes usadas por otros productos para no borrar archivos compartidos
	const imagesUsedByOthers = new Set<string>();
	for (const p of otherProducts) {
		for (const img of p.images) {
			imagesUsedByOthers.add(img);
		}
	}

	const deletedImages: string[] = [];

	// Eliminar físicamente los archivos de imagen
	for (const img of productToDelete.images) {
		if (!imagesUsedByOthers.has(img)) {
			const filePath = path.join(PRODUCTS_DIR, img);
			if (fs.existsSync(filePath)) {
				try {
					await fs.promises.unlink(filePath);
					deletedImages.push(img);
				} catch (err) {
					console.error(`Error al eliminar archivo físico de imagen ${filePath}:`, err);
				}
			}
		}
	}

	await saveProducts(otherProducts);
	return { success: true, deletedImages, products: otherProducts };
}

/**
 * Elimina una imagen específica de un producto y borra el archivo físico si ningún otro producto la utiliza.
 */
export async function deleteProductImage(productId: string, imageName: string): Promise<{ success: boolean; products: Product[] }> {
	const products = await getProducts();
	const product = products.find((p) => p.id === productId);

	if (!product) {
		throw new Error(`Producto con ID "${productId}" no encontrado.`);
	}

	if (product.images.length <= 1) {
		throw new Error(
			`No es posible eliminar la única imagen de este producto. Si deseas retirar el producto, debes eliminar el producto completo.`
		);
	}

	product.images = product.images.filter((img) => img !== imageName);

	// Revisar si algún otro producto aún usa esta imagen
	const otherProducts = products.filter((p) => p.id !== productId);
	const isUsedByOthers = otherProducts.some((p) => p.images.includes(imageName));

	if (!isUsedByOthers) {
		const filePath = path.join(PRODUCTS_DIR, imageName);
		if (fs.existsSync(filePath)) {
			try {
				await fs.promises.unlink(filePath);
			} catch (err) {
				console.error(`Error al eliminar imagen física ${filePath}:`, err);
			}
		}
	}

	await saveProducts(products);
	return { success: true, products };
}

/**
 * Guarda archivos subidos físicamente en /public/products/ y los vincula a un producto existente o crea nuevos.
 */
export async function saveUploadedFiles(
	files: { name: string; buffer: Buffer }[],
	targetProductId?: string | null
): Promise<{ products: Product[]; uploadedFilenames: string[] }> {
	if (!fs.existsSync(PRODUCTS_DIR)) {
		await fs.promises.mkdir(PRODUCTS_DIR, { recursive: true });
	}

	const uploadedFilenames: string[] = [];

	for (const file of files) {
		const ext = path.extname(file.name).toLowerCase();
		const nameWithoutExt = path
			.basename(file.name, ext)
			.toLowerCase()
			.replace(/[^a-z0-9_-]/g, "_")
			.replace(/_+/g, "_");

		let finalName = `${nameWithoutExt}${ext}`;
		let counter = 1;
		let targetPath = path.join(PRODUCTS_DIR, finalName);

		// Si ya existe un archivo con ese nombre, asegurar nombre único
		while (fs.existsSync(targetPath)) {
			finalName = `${nameWithoutExt}_${counter}${ext}`;
			targetPath = path.join(PRODUCTS_DIR, finalName);
			counter++;
		}

		let finalBuffer = file.buffer;
		try {
			finalBuffer = await sharp(file.buffer)
				.rotate()
				.resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
				.toBuffer();
		} catch (sharpError) {
			console.warn("Could not optimize image with sharp, using original buffer:", sharpError);
		}

		await fs.promises.writeFile(targetPath, finalBuffer);
		uploadedFilenames.push(finalName);
	}

	const products = await getProducts();

	if (targetProductId) {
		// Asignar directamente al producto indicado
		let product = products.find((p) => p.id === targetProductId);
		if (!product) {
			product = {
				id: targetProductId,
				images: [],
				title: formatDefaultTitle(targetProductId),
				suggestedPrice: "",
				observation: "",
			};
			products.push(product);
		}

		for (const filename of uploadedFilenames) {
			if (!product.images.includes(filename)) {
				product.images.push(filename);
			}
		}
		product.images.sort((a, b) =>
			a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
		);
	} else {
		// Agrupar automáticamente por baseId o crear productos nuevos
		for (const filename of uploadedFilenames) {
			const baseId = extractProductBaseId(filename);
			let existing = products.find((p) => p.id === baseId);
			if (existing) {
				if (!existing.images.includes(filename)) {
					existing.images.push(filename);
					existing.images.sort((a, b) =>
						a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
					);
				}
			} else {
				const newProd: Product = {
					id: baseId,
					images: [filename],
					title: formatDefaultTitle(baseId),
					suggestedPrice: "",
					observation: "",
				};
				products.push(newProd);
			}
		}
	}

	await saveProducts(products);
	return { products, uploadedFilenames };
}
