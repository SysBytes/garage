import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { Compass } from "lucide-react";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
	title: "MercadoPaintball Garage | Catálogo de Productos",
	description: "Catálogo ligero y gestor de equipamiento de paintball.",
	icons: {
		icon: "/favicon.png",
		shortcut: "/favicon.png",
		apple: "/favicon.png",
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="es" className="h-full">
			<body className={`${inter.className} min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased`}>
				{/* Header Navigation */}
				<header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 border-b border-slate-200 shadow-sm">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
						<Link href="/" className="flex items-center gap-2 group">
							<Image
								src="/Logo-MercadoPaintball.png"
								alt="MercadoPaintball"
								width={155}
								height={80}
								priority
								className="w-auto object-contain group-hover:scale-105 transition-transform"
								style={{ maxHeight: "100px", paddingTop: "15px", paddingBottom: "15px", margin: "15px" }}
							/>
							<span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 text-orange-700 rounded-full border border-orange-200">
								Venta de Garage
							</span>
						</Link>

						<nav className="flex items-center gap-2 sm:gap-4">
							<Link
								href="/"
								className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50/50 rounded-lg transition-all"
							>
								<Compass className="w-4 h-4" />
								<span>Ver Catálogo</span>
							</Link>
						</nav>
					</div>
				</header>

				{/* Main Content */}
				<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
					{children}
				</main>

				{/* Footer */}
				<footer className="w-full border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
					<div className="max-w-7xl mx-auto px-4">
						MercadoPaintball Garage &bull; Catálogo de valoración
					</div>
				</footer>
			</body>
		</html>
	);
}
