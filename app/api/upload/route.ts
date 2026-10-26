import { NextRequest, NextResponse } from "next/server";
import { saveUploadedFiles } from "@/lib/products";

export const dynamic = "force-dynamic";

/**
 * POST /api/upload: Sube una o varias imágenes enviadas vía FormData.
 * Parámetros opcionales en FormData:
 * - files: File[] (imágenes a subir)
 * - productId: string (si se especifica, se añaden las imágenes a este producto)
 */
export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const files = formData.getAll("files") as File[];
		const targetProductId = (formData.get("productId") as string) || null;

		if (!files || files.length === 0) {
			return NextResponse.json(
				{ error: "No se seleccionó ningún archivo para subir." },
				{ status: 400 }
			);
		}

		const validExtensions = /\.(jpe?g|png|webp|avif|gif)$/i;
		const filesToProcess: { name: string; buffer: Buffer }[] = [];

		for (const file of files) {
			if (!validExtensions.test(file.name)) {
				return NextResponse.json(
					{ error: `El archivo "${file.name}" no es una imagen válida (formatos soportados: JPG, PNG, WEBP, AVIF, GIF).` },
					{ status: 400 }
				);
			}

			const bytes = await file.arrayBuffer();
			filesToProcess.push({
				name: file.name,
				buffer: Buffer.from(bytes),
			});
		}

		const result = await saveUploadedFiles(filesToProcess, targetProductId);

		return NextResponse.json({
			success: true,
			message: `${filesToProcess.length} imagen(es) subida(s) y procesada(s) correctamente.`,
			uploadedFilenames: result.uploadedFilenames,
			products: result.products,
		});
	} catch (error) {
		console.error("Error en POST /api/upload:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Error al procesar la subida de imágenes." },
			{ status: 500 }
		);
	}
}
