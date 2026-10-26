"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Product } from "@/types/product";
import {
	Search,
	Tag,
	FileText,
	Layers,
	PackageX,
	RefreshCw,
	ImageIcon,
	X,
	ChevronLeft,
	ChevronRight,
	ZoomIn,
	Package,
	CircleDollarSign,
} from "lucide-react";
import { parseSuggestedPrice, formatPrice } from "@/lib/formatters";

interface LightboxState {
	productId: string;
	images: string[];
	currentIndex: number;
	title: string;
}

interface CatalogClientProps {
	initialProducts: Product[];
}

export default function CatalogClient({ initialProducts }: CatalogClientProps) {
	const [products, setProducts] = useState<Product[]>(initialProducts);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedImageMap, setSelectedImageMap] = useState<Record<string, number>>({});
	const [lightbox, setLightbox] = useState<LightboxState | null>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const fetchProducts = async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await fetch("/api/products", { cache: "no-store" });
			if (!res.ok) {
				throw new Error(`Error en el servidor: ${res.statusText}`);
			}
			const data: Product[] = await res.json();
			setProducts(data);
		} catch (err: unknown) {
			console.error("Error al cargar productos:", err);
			setError(err instanceof Error ? err.message : "Error inesperado");
		} finally {
			setLoading(false);
		}
	};

	// Filtrado reactivo por título, id u observación
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

	// Sumatoria del valor sugerido total del catálogo
	const totalSuggestedPrice = useMemo(() => {
		return products.reduce((acc, p) => acc + parseSuggestedPrice(p.suggestedPrice), 0);
	}, [products]);

	// Sumatoria del valor sugerido de los productos filtrados actualmente
	const filteredSuggestedPrice = useMemo(() => {
		return filteredProducts.reduce((acc, p) => acc + parseSuggestedPrice(p.suggestedPrice), 0);
	}, [filteredProducts]);

	const handleSelectThumbnail = (productId: string, index: number) => {
		setSelectedImageMap((prev) => ({ ...prev, [productId]: index }));
	};

	const handleOpenLightbox = (productId: string, images: string[], index: number, title: string) => {
		setLightbox({
			productId,
			images,
			currentIndex: index,
			title,
		});
	};

	const handleCloseLightbox = () => {
		setLightbox(null);
	};

	const handlePrevLightboxImage = () => {
		setLightbox((prev) => {
			if (!prev || prev.images.length <= 1) return prev;
			const nextIdx = (prev.currentIndex - 1 + prev.images.length) % prev.images.length;
			setSelectedImageMap((map) => ({ ...map, [prev.productId]: nextIdx }));
			return { ...prev, currentIndex: nextIdx };
		});
	};

	const handleNextLightboxImage = () => {
		setLightbox((prev) => {
			if (!prev || prev.images.length <= 1) return prev;
			const nextIdx = (prev.currentIndex + 1) % prev.images.length;
			setSelectedImageMap((map) => ({ ...map, [prev.productId]: nextIdx }));
			return { ...prev, currentIndex: nextIdx };
		});
	};

	const handleSelectLightboxThumbnail = (index: number) => {
		setLightbox((prev) => {
			if (!prev) return null;
			setSelectedImageMap((map) => ({ ...map, [prev.productId]: index }));
			return { ...prev, currentIndex: index };
		});
	};

	useEffect(() => {
		if (!lightbox) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				handleCloseLightbox();
			} else if (e.key === "ArrowLeft") {
				handlePrevLightboxImage();
			} else if (e.key === "ArrowRight") {
				handleNextLightboxImage();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = originalOverflow;
		};
	}, [lightbox]);

	return (
		<div className="space-y-8">
			{/* Hero & Top Controls */}
			<section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
				<div className="absolute -right-10 -bottom-10 w-72 h-72 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />
				<div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
					<div className="space-y-2">
						<h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
							Equipamiento de Paintball
						</h1>
						<p className="text-slate-300 text-sm sm:text-base max-w-2xl">
							Explora los productos disponibles en nuestro catálogo de ocasión.
						</p>
					</div>

					{/* Resumen de Métricas */}
					<div className="grid grid-cols-2 gap-3 sm:gap-4 flex-shrink-0">
						{/* Cantidad de Productos */}
						<div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-lg">
							<div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center flex-shrink-0 border border-orange-500/30">
								<Package className="w-5 h-5" />
							</div>
							<div>
								<div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
									Total Productos
								</div>
								<div className="text-lg sm:text-xl font-extrabold text-white">
									{searchTerm ? filteredProducts.length : products.length}
									{searchTerm && filteredProducts.length !== products.length && (
										<span className="text-xs font-normal text-slate-400 ml-1">
											de {products.length}
										</span>
									)}
								</div>
							</div>
						</div>

						{/* Costo Total Sugerido */}
						<div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-lg">
							<div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
								<CircleDollarSign className="w-5 h-5" />
							</div>
							<div>
								<div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
									Valor Total
								</div>
								<div className="text-lg sm:text-xl font-extrabold text-emerald-400">
									{formatPrice(searchTerm ? filteredSuggestedPrice : totalSuggestedPrice)}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Search bar inside Hero */}
				<div className="mt-8 pt-6 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
					<div className="relative w-full sm:max-w-md">
						<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
						<input
							type="text"
							placeholder="Buscar por nombre, ID o características..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
						/>
					</div>

					<div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-xs text-slate-400">
						<div className="flex items-center gap-2">
							<span>
								Mostrando <strong className="text-white">{filteredProducts.length}</strong> de{" "}
								<strong className="text-white">{products.length}</strong> artículos
							</span>
							<span className="text-slate-600 hidden sm:inline">•</span>
							<span className="hidden sm:inline">
								Valor sugerido:{" "}
								<strong className="text-emerald-400 font-semibold">
									{formatPrice(filteredSuggestedPrice)}
								</strong>
							</span>
						</div>
						<button
							onClick={fetchProducts}
							disabled={loading}
							title="Recargar catálogo"
							className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
						>
							<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
						</button>
					</div>
				</div>
			</section>

			{/* Loading State (solo al recargar activamente si no hay productos) */}
			{loading && products.length === 0 && (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{Array.from({ length: 8 }).map((_, idx) => (
						<div
							key={idx}
							className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse"
						>
							<div className="aspect-[4/3] bg-slate-200" />
							<div className="p-5 space-y-3">
								<div className="h-5 bg-slate-200 rounded w-3/4" />
								<div className="h-4 bg-slate-200 rounded w-1/2" />
								<div className="h-10 bg-slate-100 rounded" />
							</div>
						</div>
					))}
				</div>
			)}

			{/* Error State */}
			{error && (
				<div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex flex-col items-center justify-center text-center gap-3">
					<p className="font-semibold text-lg">Hubo un problema al cargar el catálogo</p>
					<p className="text-sm text-red-600">{error}</p>
					<button
						onClick={fetchProducts}
						className="mt-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
					>
						Reintentar
					</button>
				</div>
			)}

			{/* Empty State */}
			{!loading && !error && filteredProducts.length === 0 && (
				<div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 space-y-4">
					<div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
						<PackageX className="w-8 h-8" />
					</div>
					<h3 className="text-lg font-bold text-slate-800">
						{products.length === 0
							? "No se encontraron productos en /public/products"
							: "No hay productos que coincidan con la búsqueda"}
					</h3>
					<p className="text-sm text-slate-500 max-w-md mx-auto">
						{products.length === 0
							? "Asegúrate de colocar tus imágenes con nombres como 'arnes-1.jpg', 'arnes-2.jpg' en la carpeta public/products/."
							: "Prueba con otro término de búsqueda o limpia el filtro."}
					</p>
					{searchTerm && (
						<button
							onClick={() => setSearchTerm("")}
							className="px-4 py-2 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
						>
							Borrar filtro
						</button>
					)}
				</div>
			)}

			{/* Products Grid */}
			{filteredProducts.length > 0 && (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{filteredProducts.map((product, idx) => {
						const currentImgIndex = selectedImageMap[product.id] ?? 0;
						const currentImage = product.images[currentImgIndex] || product.images[0];
						const hasMultipleImages = product.images.length > 1;
						// Optimización LCP: Las 2 primeras tarjetas tienen fetchpriority="high" / priority
						const isLcpCandidate = idx < 2;
						// Optimización Rendering: Las tarjetas fuera de la pantalla inicial difieren su layout
						const isBelowFold = idx >= 4;

						return (
							<article
								key={product.id}
								className={`group bg-white rounded-2xl border border-slate-200/80 hover:border-orange-300 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden ${
									isBelowFold
										? "[content-visibility:auto] [contain-intrinsic-size:auto_none_auto_420px]"
										: ""
								}`}
							>
								{/* Image Showcase */}
								<div
									onClick={() => {
										if (currentImage) {
											handleOpenLightbox(
												product.id,
												product.images,
												currentImgIndex,
												product.title || product.id
											);
										}
									}}
									onKeyDown={(e) => {
										if ((e.key === "Enter" || e.key === " ") && currentImage) {
											e.preventDefault();
											handleOpenLightbox(
												product.id,
												product.images,
												currentImgIndex,
												product.title || product.id
											);
										}
									}}
									role={currentImage ? "button" : undefined}
									tabIndex={currentImage ? 0 : undefined}
									aria-label={
										currentImage
											? `Ampliar foto de ${product.title || product.id}`
											: undefined
									}
									className={`relative aspect-[4/3] bg-slate-100 overflow-hidden ${
										currentImage ? "cursor-pointer group/img" : ""
									}`}
								>
									{currentImage ? (
										<>
											<Image
												src={`/products/${currentImage}`}
												alt={product.title || product.id}
												fill
												priority={isLcpCandidate}
												loading={isLcpCandidate ? undefined : "lazy"}
												sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
												className="object-cover group-hover/img:scale-105 transition-transform duration-500"
											/>
											{/* Hover zoom badge */}
											<div className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
												<span className="bg-slate-900/80 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg transform translate-y-1 group-hover/img:translate-y-0 transition-all duration-300">
													<ZoomIn className="w-3.5 h-3.5 text-orange-400" />
													<span>Ampliar foto</span>
												</span>
											</div>
										</>
									) : (
										<div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
											<ImageIcon className="w-8 h-8" />
											<span className="text-xs">Sin imagen</span>
										</div>
									)}

									{/* Multiple photos badge */}
									{hasMultipleImages && (
										<div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/75 backdrop-blur-sm text-white text-[11px] font-medium flex items-center gap-1 shadow pointer-events-none">
											<Layers className="w-3 h-3 text-orange-400" />
											<span>{product.images.length} fotos</span>
										</div>
									)}
								</div>

								{/* Thumbnail strip if multiple images */}
								{hasMultipleImages && (
									<div className="flex gap-1.5 p-2 bg-slate-50 border-b border-slate-100 overflow-x-auto">
										{product.images.map((img, thumbIdx) => (
											<button
												key={img}
												onClick={() => handleSelectThumbnail(product.id, thumbIdx)}
												className={`relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
													thumbIdx === currentImgIndex
														? "border-orange-500 ring-2 ring-orange-500/20 scale-105"
														: "border-transparent opacity-70 hover:opacity-100"
												}`}
											>
												<Image
													src={`/products/${img}`}
													alt={`${product.title} miniatura ${thumbIdx + 1}`}
													fill
													sizes="40px"
													loading="lazy"
													className="object-cover"
												/>
											</button>
										))}
									</div>
								)}

								{/* Content */}
								<div className="p-5 flex-1 flex flex-col justify-between space-y-4">
									<div className="space-y-2">
										<h2
											className="text-base font-bold text-slate-900 line-clamp-2 group-hover:text-orange-600 transition-colors"
											title={product.title}
										>
											{product.title || product.id}
										</h2>

										{/* Price tag */}
										<div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-lg">
											<Tag className="w-4 h-4 text-orange-500" />
											{product.suggestedPrice ? (
												<span>
													{typeof product.suggestedPrice === "number"
														? `$ ${product.suggestedPrice.toLocaleString()}`
														: `$ ${product.suggestedPrice}`}
												</span>
											) : (
												<span className="text-xs font-medium text-slate-400 italic">
													Consultar precio
												</span>
											)}
										</div>
									</div>

									{/* Observations */}
									<div className="pt-3 border-t border-slate-100 text-xs">
										{product.observation ? (
											<div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 flex items-start gap-2">
												<FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
												<p className="line-clamp-3 italic leading-relaxed">
													&ldquo;{product.observation}&rdquo;
												</p>
											</div>
										) : (
											<span className="text-slate-400 italic text-[11px]">
												Sin observaciones registradas.
											</span>
										)}
									</div>
								</div>
							</article>
						);
					})}
				</div>
			)}

			{/* Lightbox Modal rendered via Portal to document.body */}
			{mounted && lightbox && createPortal(
				<div
					className="fixed inset-0 z-[9999] w-screen h-screen flex flex-col justify-between text-white select-none overflow-hidden"
					style={{ backgroundColor: "rgba(2, 6, 23, 0.98)" }}
					onClick={handleCloseLightbox}
					role="dialog"
					aria-modal="true"
					aria-label={`Vista ampliada de ${lightbox.title}`}
				>
					{/* Top Header Bar */}
					<div
						className="w-full flex items-center justify-between gap-4 px-4 sm:px-8 py-3.5 bg-slate-900 border-b border-slate-800 z-30 flex-shrink-0"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center gap-3 min-w-0">
							<h3 className="text-base sm:text-xl font-bold text-white truncate max-w-md sm:max-w-2xl drop-shadow">
								{lightbox.title}
							</h3>
							{lightbox.images.length > 1 && (
								<span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-semibold">
									{lightbox.currentIndex + 1} de {lightbox.images.length}
								</span>
							)}
						</div>

						<button
							onClick={handleCloseLightbox}
							className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-red-600 active:bg-red-700 text-white text-xs sm:text-sm font-semibold border border-slate-700 hover:border-red-500 transition-all shadow-md cursor-pointer"
							aria-label="Cerrar vista previa"
						>
							<span>Cerrar</span>
							<kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-black/50 text-slate-200 rounded border border-white/20">
								ESC
							</kbd>
							<X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
						</button>
					</div>

					{/* Central Image Stage - Maximized size */}
					<div
						className="relative flex-1 w-full h-full flex items-center justify-center p-2 sm:p-4 min-h-0 overflow-hidden cursor-zoom-out"
						onClick={handleCloseLightbox}
					>
						{/* Prev Button */}
						{lightbox.images.length > 1 && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									handlePrevLightboxImage();
								}}
								className="absolute left-2 sm:left-6 z-20 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-slate-900/80 hover:bg-orange-600 active:scale-90 text-white border border-white/20 backdrop-blur-md shadow-2xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
								aria-label="Foto anterior"
							>
								<ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
							</button>
						)}

						{/* Main Image */}
						<div
							className={`relative w-full ${
								lightbox.images.length > 1
									? "h-[74vh] sm:h-[80vh]"
									: "h-[84vh] sm:h-[88vh]"
							} max-w-[96vw] flex items-center justify-center cursor-default`}
							onClick={(e) => e.stopPropagation()}
						>
							{lightbox.images[lightbox.currentIndex] ? (
								<Image
									src={`/products/${lightbox.images[lightbox.currentIndex]}`}
									alt={`${lightbox.title} - foto ${lightbox.currentIndex + 1}`}
									fill
									priority
									sizes="100vw"
									className="object-contain drop-shadow-2xl select-none"
								/>
							) : null}
						</div>

						{/* Next Button */}
						{lightbox.images.length > 1 && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									handleNextLightboxImage();
								}}
								className="absolute right-2 sm:right-6 z-20 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-slate-900/80 hover:bg-orange-600 active:scale-90 text-white border border-white/20 backdrop-blur-md shadow-2xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
								aria-label="Foto siguiente"
							>
								<ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
							</button>
						)}
					</div>

					{/* Bottom Thumbnails Strip */}
					{lightbox.images.length > 1 && (
						<div
							className="w-full flex justify-center items-center px-4 py-2.5 bg-slate-900 border-t border-slate-800 z-30 flex-shrink-0"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="flex gap-2 sm:gap-3 overflow-x-auto max-w-full py-1 px-2">
								{lightbox.images.map((img, idx) => (
									<button
										key={img}
										onClick={() => handleSelectLightboxThumbnail(idx)}
										className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
											idx === lightbox.currentIndex
												? "border-orange-500 ring-2 ring-orange-500/50 scale-105 opacity-100 shadow-md"
												: "border-slate-700 opacity-50 hover:opacity-100 hover:border-slate-500"
										}`}
										aria-label={`Ver foto ${idx + 1}`}
									>
										<Image
											src={`/products/${img}`}
											alt={`${lightbox.title} miniatura ${idx + 1}`}
											fill
											sizes="64px"
											loading="lazy"
											className="object-cover"
										/>
									</button>
								))}
							</div>
						</div>
					)}
				</div>,
				document.body
			)}
		</div>
	);
}
