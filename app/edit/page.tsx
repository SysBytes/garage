"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types/product";
import {
	Save,
	ArrowLeft,
	Search,
	CheckCircle2,
	AlertCircle,
	ImageIcon,
	DollarSign,
	FileEdit,
	Layers,
	RotateCcw,
	Trash2,
	UploadCloud,
	Plus,
	X,
	AlertTriangle,
	RefreshCw,
} from "lucide-react";

export default function EditCatalogPage() {
	const [products, setProducts] = useState<Product[]>([]);
	const [initialProducts, setInitialProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [uploadingTargetId, setUploadingTargetId] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [productToDelete, setProductToDelete] = useState<Product | null>(null);
	const [imageToDelete, setImageToDelete] = useState<{ productId: string; imageName: string } | null>(null);
	const [isDraggingGlobal, setIsDraggingGlobal] = useState(false);
	const [dragOverProductId, setDragOverProductId] = useState<string | null>(null);
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const [searchTerm, setSearchTerm] = useState("");

	const globalFileInputRef = useRef<HTMLInputElement | null>(null);
	const productFileInputRef = useRef<HTMLInputElement | null>(null);
	const [activeProductForInput, setActiveProductForInput] = useState<string | null>(null);

	const fetchProducts = async () => {
		try {
			setLoading(true);
			const res = await fetch("/api/products", { cache: "no-store" });
			if (!res.ok) throw new Error("Error al consultar los productos.");
			const data: Product[] = await res.json();
			setProducts(data);
			setInitialProducts(JSON.parse(JSON.stringify(data)));
		} catch (err: unknown) {
			console.error(err);
			setMessage({
				type: "error",
				text: err instanceof Error ? err.message : "Error al cargar productos",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchProducts();
	}, []);

	const handleFieldChange = (
		id: string,
		field: "title" | "suggestedPrice" | "observation",
		value: string
	) => {
		setProducts((prev) =>
			prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
		);
	};

	const handleSave = async () => {
		try {
			setSaving(true);
			setMessage(null);

			const res = await fetch("/api/products", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(products),
			});

			const result = await res.json();
			if (!res.ok) throw new Error(result.error || "Error al guardar los datos.");

			setInitialProducts(JSON.parse(JSON.stringify(products)));
			setMessage({
				type: "success",
				text: "¡Cambios guardados con éxito en data.json!",
			});

			setTimeout(() => setMessage(null), 4000);
		} catch (err: unknown) {
			console.error(err);
			setMessage({
				type: "error",
				text: err instanceof Error ? err.message : "No se pudieron guardar los cambios",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleReset = () => {
		if (confirm("¿Estás seguro de restablecer los cambios no guardados?")) {
			setProducts(JSON.parse(JSON.stringify(initialProducts)));
			setMessage(null);
		}
	};

	// Subida de archivos (Drag & Drop o Input)
	const handleFileUpload = async (files: FileList | File[], targetProductId?: string | null) => {
		if (!files || files.length === 0) return;

		const validExtensions = /\.(jpe?g|png|webp|avif|gif)$/i;
		const validFiles: File[] = [];

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			if (validExtensions.test(file.name)) {
				validFiles.push(file);
			}
		}

		if (validFiles.length === 0) {
			setMessage({
				type: "error",
				text: "Solo se admiten archivos de imagen válidos (JPG, PNG, WEBP, AVIF, GIF).",
			});
			return;
		}

		try {
			setUploading(true);
			setUploadingTargetId(targetProductId || null);
			setMessage(null);

			const formData = new FormData();
			validFiles.forEach((file) => formData.append("files", file));
			if (targetProductId) {
				formData.append("productId", targetProductId);
			}

			const res = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Error al subir las imágenes.");
			}

			// Actualizar productos en pantalla con la respuesta del servidor
			setProducts(data.products);
			setInitialProducts(JSON.parse(JSON.stringify(data.products)));

			setMessage({
				type: "success",
				text: targetProductId
					? `¡${validFiles.length} foto(s) agregada(s) al producto correctamente!`
					: `¡${validFiles.length} imagen(es) subida(s) y procesada(s) con éxito!`,
			});

			setTimeout(() => setMessage(null), 4500);
		} catch (err: unknown) {
			console.error("Error al subir archivos:", err);
			setMessage({
				type: "error",
				text: err instanceof Error ? err.message : "Error al procesar la subida.",
			});
		} finally {
			setUploading(false);
			setUploadingTargetId(null);
			if (globalFileInputRef.current) globalFileInputRef.current.value = "";
			if (productFileInputRef.current) productFileInputRef.current.value = "";
			setActiveProductForInput(null);
		}
	};

	// Confirmar eliminación del producto completo y sus imágenes
	const handleConfirmDeleteProduct = async () => {
		if (!productToDelete) return;

		try {
			setDeleting(true);
			const res = await fetch(`/api/products?id=${encodeURIComponent(productToDelete.id)}`, {
				method: "DELETE",
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Error al eliminar el producto.");
			}

			setProducts(data.products);
			setInitialProducts(JSON.parse(JSON.stringify(data.products)));
			setMessage({
				type: "success",
				text: `Producto "${productToDelete.title || productToDelete.id}" y sus imágenes fueron eliminados correctamente.`,
			});

			setProductToDelete(null);
			setTimeout(() => setMessage(null), 4500);
		} catch (err: unknown) {
			console.error("Error al eliminar producto:", err);
			setMessage({
				type: "error",
				text: err instanceof Error ? err.message : "Error al eliminar el producto.",
			});
		} finally {
			setDeleting(false);
		}
	};

	// Confirmar eliminación de una imagen puntual
	const handleConfirmDeleteImage = async () => {
		if (!imageToDelete) return;

		const currentProduct = products.find((p) => p.id === imageToDelete.productId);
		if (currentProduct && currentProduct.images.length <= 1) {
			setMessage({
				type: "error",
				text: "No se puede eliminar la única foto del producto. Si deseas retirarlo, elimina el producto completo.",
			});
			setImageToDelete(null);
			return;
		}

		try {
			setDeleting(true);
			const res = await fetch(
				`/api/products?id=${encodeURIComponent(imageToDelete.productId)}&image=${encodeURIComponent(
					imageToDelete.imageName
				)}`,
				{ method: "DELETE" }
			);

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Error al eliminar la imagen.");
			}

			setProducts(data.products);
			setInitialProducts(JSON.parse(JSON.stringify(data.products)));
			setMessage({
				type: "success",
				text: `Imagen "${imageToDelete.imageName}" eliminada correctamente.`,
			});

			setImageToDelete(null);
			setTimeout(() => setMessage(null), 3500);
		} catch (err: unknown) {
			console.error("Error al eliminar imagen:", err);
			setMessage({
				type: "error",
				text: err instanceof Error ? err.message : "Error al eliminar la imagen.",
			});
		} finally {
			setDeleting(false);
		}
	};

	// Saber si hay cambios de texto sin guardar
	const hasUnsavedChanges = useMemo(() => {
		return JSON.stringify(products) !== JSON.stringify(initialProducts);
	}, [products, initialProducts]);

	const filteredProducts = useMemo(() => {
		const q = searchTerm.toLowerCase().trim();
		if (!q) return products;
		return products.filter(
			(p) =>
				p.title.toLowerCase().includes(q) ||
				p.id.toLowerCase().includes(q) ||
				(p.observation && p.observation.toLowerCase().includes(q))
		);
	}, [products, searchTerm]);

	return (
		<div className="space-y-6 pb-20">
			{/* Input oculto para subida global */}
			<input
				type="file"
				ref={globalFileInputRef}
				multiple
				accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
				className="hidden"
				onChange={(e) => {
					if (e.target.files) handleFileUpload(e.target.files);
				}}
			/>

			{/* Input oculto para subida por producto */}
			<input
				type="file"
				ref={productFileInputRef}
				multiple
				accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
				className="hidden"
				onChange={(e) => {
					if (e.target.files && activeProductForInput) {
						handleFileUpload(e.target.files, activeProductForInput);
					}
				}}
			/>

			{/* Sticky Top Action Bar */}
			<div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
				<div className="flex items-center gap-3 w-full md:w-auto">
					<Link
						href="/"
						className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
						title="Volver al catálogo"
					>
						<ArrowLeft className="w-5 h-5" />
					</Link>
					<div>
						<h1 className="text-lg font-bold text-slate-900 leading-tight">
							Gestor de Catálogo
						</h1>
						<p className="text-xs text-slate-500">
							{products.length} productos registrados &bull;{" "}
							{hasUnsavedChanges ? (
								<span className="text-amber-600 font-semibold">Cambios sin guardar</span>
							) : (
								<span className="text-emerald-600 font-semibold">Sincronizado</span>
							)}
						</p>
					</div>
				</div>

				{/* Global Save and Revert Buttons */}
				<div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
					{hasUnsavedChanges && (
						<button
							onClick={handleReset}
							disabled={saving || uploading}
							className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
						>
							<RotateCcw className="w-3.5 h-3.5" />
							Deshacer
						</button>
					)}

					<button
						onClick={handleSave}
						disabled={saving || uploading}
						className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
							hasUnsavedChanges
								? "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20 hover:scale-[1.02] active:scale-[0.98] ring-2 ring-orange-500/50"
								: "bg-slate-900 hover:bg-slate-800 text-white"
						} ${saving ? "opacity-75 cursor-wait" : ""}`}
					>
						<Save className="w-4 h-4" />
						<span>{saving ? "Guardando..." : "Guardar Cambios"}</span>
					</button>
				</div>
			</div>

			{/* Alert Notification */}
			{message && (
				<div
					className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all ${
						message.type === "success"
							? "bg-emerald-50 border-emerald-200 text-emerald-800"
							: "bg-red-50 border-red-200 text-red-800"
					}`}
				>
					<div className="flex items-center gap-2.5">
						{message.type === "success" ? (
							<CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
						) : (
							<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
						)}
						<span className="text-sm font-medium">{message.text}</span>
					</div>
					<button
						onClick={() => setMessage(null)}
						className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-700 transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Global Drag & Drop Zone */}
			<div
				onDragOver={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setIsDraggingGlobal(true);
				}}
				onDragEnter={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setIsDraggingGlobal(true);
				}}
				onDragLeave={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setIsDraggingGlobal(false);
				}}
				onDrop={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setIsDraggingGlobal(false);
					if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
						handleFileUpload(e.dataTransfer.files);
					}
				}}
				onClick={() => {
					if (!uploading) globalFileInputRef.current?.click();
				}}
				className={`relative rounded-3xl border-2 border-dashed p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
					isDraggingGlobal
						? "border-orange-500 bg-orange-50/90 ring-4 ring-orange-500/20 scale-[1.01]"
						: "border-slate-300 hover:border-orange-400 bg-white/70 hover:bg-orange-50/20 shadow-sm"
				} ${uploading && !uploadingTargetId ? "opacity-75 pointer-events-none" : ""}`}
			>
				<div
					className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform ${
						isDraggingGlobal
							? "bg-orange-600 text-white scale-110"
							: "bg-orange-100 text-orange-600"
					}`}
				>
					{uploading && !uploadingTargetId ? (
						<RefreshCw className="w-7 h-7 animate-spin" />
					) : (
						<UploadCloud className="w-7 h-7" />
					)}
				</div>

				<div className="space-y-1 max-w-lg">
					<p className="text-base font-bold text-slate-800">
						{uploading && !uploadingTargetId
							? "Subiendo y optimizando imágenes..."
							: isDraggingGlobal
							? "¡Suelta las imágenes aquí para subirlas!"
							: "Arrastra y suelta imágenes aquí para agregar productos o fotos"}
					</p>
					<p className="text-xs text-slate-500">
						Soporta archivos JPG, PNG, WEBP, AVIF. Puedes arrastrar varias fotos juntas.
					</p>
				</div>

				<span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-sm transition-all pointer-events-none">
					<Plus className="w-4 h-4" />
					Seleccionar archivos de mi equipo
				</span>
			</div>

			{/* Filter / Search Bar */}
			<div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
					<input
						type="text"
						placeholder="Filtrar por ID, título o nota..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-transparent focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
					/>
				</div>
				<span className="text-xs text-slate-500 px-2">
					{filteredProducts.length} de {products.length}
				</span>
			</div>

			{/* Loading Skeleton */}
			{loading && (
				<div className="space-y-4">
					{Array.from({ length: 4 }).map((_, idx) => (
						<div
							key={idx}
							className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse flex gap-6"
						>
							<div className="w-28 h-28 bg-slate-200 rounded-xl" />
							<div className="flex-1 space-y-3">
								<div className="h-5 bg-slate-200 rounded w-1/3" />
								<div className="h-9 bg-slate-100 rounded" />
								<div className="h-9 bg-slate-100 rounded" />
							</div>
						</div>
					))}
				</div>
			)}

			{/* Products Edit List */}
			{!loading && (
				<div className="space-y-4">
					{filteredProducts.map((product) => {
						const isDragOverThis = dragOverProductId === product.id;
						const isUploadingThis = uploading && uploadingTargetId === product.id;

						return (
							<div
								key={product.id}
								onDragOver={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setDragOverProductId(product.id);
								}}
								onDragEnter={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setDragOverProductId(product.id);
								}}
								onDragLeave={(e) => {
									e.preventDefault();
									e.stopPropagation();
									if (dragOverProductId === product.id) {
										setDragOverProductId(null);
									}
								}}
								onDrop={(e) => {
									e.preventDefault();
									e.stopPropagation();
									setDragOverProductId(null);
									if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
										handleFileUpload(e.dataTransfer.files, product.id);
									}
								}}
								className={`bg-white rounded-2xl border p-5 shadow-sm transition-all flex flex-col gap-5 ${
									isDragOverThis
										? "border-orange-500 bg-orange-50/30 ring-2 ring-orange-500/30 shadow-md"
										: "border-slate-200/90 hover:border-slate-300"
								}`}
							>
								{/* Drag feedback badge */}
								{isDragOverThis && (
									<div className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm animate-pulse">
										<UploadCloud className="w-4 h-4" />
										<span>Suelta las fotos aquí para añadirlas a este producto</span>
									</div>
								)}

								<div className="flex flex-col lg:flex-row gap-5 items-start">
									{/* Gallery & Drop Area */}
									<div className="w-full lg:w-72 flex-shrink-0 space-y-3">
										{/* Main image / thumbnail gallery */}
										<div className="relative w-full aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group/img">
											{product.images[0] ? (
												<Image
													src={`/products/${product.images[0]}`}
													alt={product.title}
													fill
													sizes="(max-width: 1024px) 100vw, 280px"
													className="object-cover"
												/>
											) : (
												<div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
													<ImageIcon className="w-8 h-8" />
													<span className="text-xs">Sin fotos</span>
												</div>
											)}

											{product.images.length > 1 && (
												<span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-md bg-slate-900/80 text-white text-[11px] font-bold flex items-center gap-1 shadow">
													<Layers className="w-3 h-3 text-orange-400" />
													{product.images.length} fotos
												</span>
											)}
										</div>

										{/* Thumbnails strip with delete icon per photo */}
										<div className="flex flex-wrap gap-2 items-center">
											{product.images.map((img, idx) => {
												const canDeleteImage = product.images.length > 1;

												return (
													<div
														key={img}
														title={
															canDeleteImage
																? `Foto ${idx + 1} (clic en papelera para eliminar)`
																: "Foto principal (única foto del producto)"
														}
														className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 group/thumb flex-shrink-0 bg-slate-100"
													>
														<Image
															src={`/products/${img}`}
															alt={`${product.title} ${idx + 1}`}
															fill
															sizes="48px"
															className="object-cover"
														/>
														{/* Botón para eliminar foto individual SOLO si el producto tiene más de 1 foto */}
														{canDeleteImage && (
															<button
																type="button"
																onClick={() =>
																	setImageToDelete({
																		productId: product.id,
																		imageName: img,
																	})
																}
																title="Eliminar esta foto secundaria"
																className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-red-400 hover:text-red-300 cursor-pointer"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														)}
													</div>
												);
											})}

											{/* Botón para agregar más fotos a este producto */}
											<button
												type="button"
												disabled={isUploadingThis}
												onClick={() => {
													setActiveProductForInput(product.id);
													productFileInputRef.current?.click();
												}}
												title="Subir fotos a este producto (o arrástralas aquí)"
												className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-orange-600 transition-all cursor-pointer flex-shrink-0"
											>
												{isUploadingThis ? (
													<RefreshCw className="w-4 h-4 animate-spin text-orange-600" />
												) : (
													<>
														<Plus className="w-4 h-4" />
														<span className="text-[9px] font-bold">Foto</span>
													</>
												)}
											</button>
										</div>

										<div className="flex items-center justify-between text-xs text-slate-500">
											<span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
												ID: {product.id}
											</span>
											<span className="text-[11px]">
												{product.images.length} archivo(s)
											</span>
										</div>
									</div>

									{/* Editable Fields Form */}
									<div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
										{/* Title Field */}
										<div className="space-y-1.5 md:col-span-1">
											<label className="text-xs font-bold text-slate-700 flex items-center gap-1">
												<FileEdit className="w-3.5 h-3.5 text-orange-500" />
												Título del Producto
											</label>
											<input
												type="text"
												value={product.title}
												placeholder="Ej. Arnés Eclipse Negro"
												onChange={(e) =>
													handleFieldChange(product.id, "title", e.target.value)
												}
												className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all font-medium text-slate-900"
											/>
										</div>

										{/* Suggested Price Field */}
										<div className="space-y-1.5 md:col-span-1">
											<label className="text-xs font-bold text-slate-700 flex items-center gap-1">
												<DollarSign className="w-3.5 h-3.5 text-orange-500" />
												Precio Sugerido
											</label>
											<input
												type="text"
												value={product.suggestedPrice}
												placeholder="Ej. 120.000 o 45"
												onChange={(e) =>
													handleFieldChange(product.id, "suggestedPrice", e.target.value)
												}
												className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all font-medium text-slate-900"
											/>
										</div>

										{/* Observation Field */}
										<div className="space-y-1.5 md:col-span-2">
											<label className="text-xs font-bold text-slate-700">
												Observación / Estado
											</label>
											<textarea
												rows={2}
												value={product.observation}
												placeholder="Ej. Condición 9/10, incluye velcro original, sin detalles."
												onChange={(e) =>
													handleFieldChange(product.id, "observation", e.target.value)
												}
												className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all text-slate-800 resize-y"
											/>
										</div>

										{/* Actions Row at bottom of card */}
										<div className="md:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
											<span className="text-[11px] text-slate-400 italic">
												Arrastra fotos sobre esta tarjeta para agregarlas
											</span>

											{/* Botón Eliminar Producto */}
											<button
												type="button"
												onClick={() => setProductToDelete(product)}
												className="px-3.5 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
											>
												<Trash2 className="w-3.5 h-3.5" />
												Eliminar producto
											</button>
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Modal de confirmación para eliminar producto completo */}
			{productToDelete && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
					onClick={() => {
						if (!deleting) setProductToDelete(null);
					}}
				>
					<div
						className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
							<AlertTriangle className="w-6 h-6" />
						</div>

						<div className="space-y-2">
							<h3 className="text-lg font-bold text-slate-900">
								¿Eliminar este producto permanentemente?
							</h3>
							<p className="text-sm text-slate-600 leading-relaxed">
								Estás a punto de eliminar{" "}
								<strong className="text-slate-900 font-semibold">
									&ldquo;{productToDelete.title || productToDelete.id}&rdquo;
								</strong>
								.
							</p>
							<div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 space-y-1">
								<p className="font-semibold">Esta acción borrará del servidor:</p>
								<ul className="list-disc list-inside space-y-0.5">
									<li>El registro del producto en el catálogo.</li>
									<li>
										Sus{" "}
										<strong>{productToDelete.images.length} archivo(s) de imagen</strong>{" "}
										físicos en <code className="font-mono">public/products/</code>.
									</li>
								</ul>
								<p className="pt-1 text-[11px] text-red-700 italic">
									Esta acción no se puede deshacer.
								</p>
							</div>
						</div>

						<div className="flex items-center justify-end gap-3 pt-2">
							<button
								type="button"
								disabled={deleting}
								onClick={() => setProductToDelete(null)}
								className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
							>
								Cancelar
							</button>
							<button
								type="button"
								disabled={deleting}
								onClick={handleConfirmDeleteProduct}
								className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all cursor-pointer"
							>
								{deleting ? (
									<>
										<RefreshCw className="w-3.5 h-3.5 animate-spin" />
										<span>Eliminando...</span>
									</>
								) : (
									<>
										<Trash2 className="w-3.5 h-3.5" />
										<span>Sí, eliminar producto e imágenes</span>
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Modal de confirmación para eliminar imagen individual */}
			{imageToDelete && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
					onClick={() => {
						if (!deleting) setImageToDelete(null);
					}}
				>
					<div
						className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
							<Trash2 className="w-6 h-6" />
						</div>

						<div className="space-y-1.5">
							<h3 className="text-base font-bold text-slate-900">
								¿Eliminar esta foto del producto?
							</h3>
							<p className="text-xs text-slate-500">
								Se eliminará el archivo{" "}
								<code className="font-mono font-bold text-slate-800">
									{imageToDelete.imageName}
								</code>{" "}
								tanto del producto como del disco en el servidor.
							</p>
						</div>

						<div className="flex items-center justify-end gap-2.5 pt-2">
							<button
								type="button"
								disabled={deleting}
								onClick={() => setImageToDelete(null)}
								className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
							>
								Cancelar
							</button>
							<button
								type="button"
								disabled={deleting}
								onClick={handleConfirmDeleteImage}
								className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
							>
								{deleting ? (
									<>
										<RefreshCw className="w-3.5 h-3.5 animate-spin" />
										<span>Borrando...</span>
									</>
								) : (
									<>
										<Trash2 className="w-3.5 h-3.5" />
										<span>Eliminar foto</span>
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
