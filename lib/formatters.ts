/**
 * Convierte un valor de precio sugerido (string o number) en un valor numérico seguro.
 * Soporta formatos comunes en Colombia y Latinoamérica:
 * - "150.000" -> 150000
 * - "1.500.000" -> 1500000
 * - "150,000" -> 150000
 * - "150000" -> 150000
 * - "$ 150.000" -> 150000
 * - 45 -> 45
 * - "" / null / undefined -> 0
 */
export function parseSuggestedPrice(value: number | string | undefined | null): number {
	if (value === null || value === undefined) return 0;
	if (typeof value === "number") return isNaN(value) ? 0 : value;

	const str = String(value).trim();
	if (!str) return 0;

	// Remover todo excepto dígitos, puntos y comas
	const clean = str.replace(/[^0-9.,]/g, "");
	if (!clean) return 0;

	// Caso con puntos y comas combinados (ej. "1.500.000,00" o "1,500,000.00")
	if (clean.includes(".") && clean.includes(",")) {
		const lastDot = clean.lastIndexOf(".");
		const lastComma = clean.lastIndexOf(",");
		if (lastComma > lastDot) {
			return parseFloat(clean.replace(/\./g, "").replace(",", ".")) || 0;
		} else {
			return parseFloat(clean.replace(/,/g, "")) || 0;
		}
	}

	// Caso sólo con puntos (ej. "150.000" o "1.500.000" o "45.5")
	if (clean.includes(".")) {
		const parts = clean.split(".");
		if (parts.length > 2) {
			return parseFloat(clean.replace(/\./g, "")) || 0;
		}
		// Si tiene 3 dígitos tras el punto (ej. 150.000), es separador de miles
		if (parts[1].length === 3) {
			return parseFloat(clean.replace(/\./g, "")) || 0;
		}
		return parseFloat(clean) || 0;
	}

	// Caso sólo con comas (ej. "150,000" o "45,50")
	if (clean.includes(",")) {
		const parts = clean.split(",");
		if (parts.length > 2) {
			return parseFloat(clean.replace(/,/g, "")) || 0;
		}
		if (parts[1].length === 3) {
			return parseFloat(clean.replace(/,/g, "")) || 0;
		}
		return parseFloat(clean.replace(",", ".")) || 0;
	}

	return parseFloat(clean) || 0;
}

/**
 * Formatea un número como moneda (ej. "$ 150.000").
 */
export function formatPrice(amount: number): string {
	if (isNaN(amount)) return "$ 0";
	return `$ ${Math.round(amount).toLocaleString("es-CO")}`;
}
