import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const PRODUCTS_DIR = path.join(process.cwd(), "public", "products");

const MIME_TYPES: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
	".avif": "image/avif",
	".gif": "image/gif",
	".svg": "image/svg+xml",
};

/**
 * Endpoint dinámico para servir imágenes de /products/ en producción y desarrollo.
 * Next.js en producción solo sirve estáticamente los archivos que existían al momento
 * del 'next build'. Esta ruta permite servir archivos agregados dinámicamente en tiempo
 * de ejecución y además resuelve discrepancias comunes de nombres (espacios vs guiones bajos).
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: { filename: string | string[] } }
) {
	try {
		const rawParam = Array.isArray(params.filename)
			? params.filename.join("/")
			: params.filename;

		if (!rawParam) {
			return new NextResponse("Filename is required", { status: 400 });
		}

		let decoded = rawParam;
		try {
			decoded = decodeURIComponent(rawParam);
		} catch {
			// Si falla decode, usar raw
		}

		// Evitar Directory Traversal
		const safeBase = path.basename(decoded);

		// Lista de candidatos para encontrar el archivo físico en disco
		const candidateNames = [
			safeBase,
			safeBase.replace(/\s+/g, "_"),
			safeBase.replace(/_+/g, " "),
			safeBase.replace(/\s+/g, "-"),
			safeBase.toLowerCase(),
			safeBase.replace(/\s+/g, "_").toLowerCase(),
			safeBase.replace(/_+/g, "-").toLowerCase(),
		];

		let foundFilePath: string | null = null;
		for (const candidate of candidateNames) {
			const candidatePath = path.join(PRODUCTS_DIR, candidate);
			if (fs.existsSync(candidatePath)) {
				foundFilePath = candidatePath;
				break;
			}
		}

		if (!foundFilePath) {
			return new NextResponse(`Image "${safeBase}" not found`, { status: 404 });
		}

		const ext = path.extname(foundFilePath).toLowerCase();
		const contentType = MIME_TYPES[ext] || "application/octet-stream";
		const fileBuffer = await fs.promises.readFile(foundFilePath);

		return new NextResponse(fileBuffer, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
			},
		});
	} catch (error) {
		console.error("Error al servir imagen de producto:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
