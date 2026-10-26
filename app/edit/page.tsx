"use client";

import { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";

export default function EditCatalogPage() {
	const [products, setProducts] = useState<Product[]>([]);
	const [initialProducts, setInitialProducts] = useState<Product[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const [searchTerm, setSearchTerm] = useState("");

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

			// Auto ocultar mensaje después de 4 segundos
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

	// Saber si hay cambios sin guardar
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
							{products.length} productos detectados &bull;{" "}
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
							disabled={saving}
							className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
						>
							<RotateCcw className="w-3.5 h-3.5" />
							Deshacer
						</button>
					)}

					<button
						onClick={handleSave}
						disabled={saving}
						className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm transition-all ${hasUnsavedChanges
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
					className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${message.type === "success"
							? "bg-emerald-50 border-emerald-200 text-emerald-800"
							: "bg-red-50 border-red-200 text-red-800"
						}`}
				>
					{message.type === "success" ? (
						<CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
					) : (
						<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
					)}
					<span className="text-sm font-medium">{message.text}</span>
				</div>
			)}

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
						const firstImage = product.images[0];
						return (
							<div
								key={product.id}
								className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col lg:flex-row gap-5 items-start"
							>
								{/* Product Thumbnail & Meta */}
								<div className="flex lg:flex-col items-center gap-3 flex-shrink-0 w-full lg:w-40">
									<div className="relative w-24 h-24 lg:w-40 lg:h-32 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
										{firstImage ? (
											<Image
												src={`/products/${firstImage}`}
												alt={product.title}
												fill
												sizes="160px"
												className="object-cover"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center text-slate-400">
												<ImageIcon className="w-6 h-6" />
											</div>
										)}
										{product.images.length > 1 && (
											<span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-bold flex items-center gap-1">
												<Layers className="w-2.5 h-2.5 text-orange-400" />
												{product.images.length}
											</span>
										)}
									</div>

									<div className="flex-1 lg:w-full text-left lg:text-center">
										<span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700 font-semibold truncate max-w-full">
											{product.id}
										</span>
										<p className="text-[11px] text-slate-400 mt-0.5">
											{product.images.length} archivo(s)
										</p>
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
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
